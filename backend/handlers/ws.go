package handlers

import (
	"aura/audio"
	"aura/storage"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// The client sends {"type":"end"} when it's finished streaming audio.
type wsIncoming struct {
	Type string `json:"type"`
}

type WSMatch struct {
	SongID int    `json:"song_id"`
	Title  string `json:"title"`
	Artist string `json:"artist"`
	Score  int    `json:"score"`
}

type wsResult struct {
	// Log messages (Type == "log")
	Type    string `json:"type"`
	Message string `json:"message,omitempty"`

	Found   bool      `json:"found"`
	Matches []WSMatch `json:"matches,omitempty"`
	
	// Legacy fields for backward compatibility, although we will use Matches.
	SongID int    `json:"song_id,omitempty"`
	Title  string `json:"title,omitempty"`
	Artist string `json:"artist,omitempty"`
	Score  int    `json:"score,omitempty"`
	Error  string `json:"error,omitempty"`
}

// AudioWS handles the real-time recognition
func AudioWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	if err := os.MkdirAll("tmp", 0755); err != nil {
		log.Printf("AudioWS: mkdir: %v", err)
		return
	}

	// temp file of recording to avoid overwrite issues
	tmpFile, err := os.CreateTemp("tmp", "input-*.webm")
	if err != nil {
		log.Printf("AudioWS: create temp: %v", err)
		return
	}
	rawPath := tmpFile.Name()
	defer func() {
		if tmpFile != nil {
			if err := tmpFile.Close(); err != nil {
				log.Printf("AudioWS: failed to close temp file: %v", err)
			}
		}

		if err := os.Remove(rawPath); err != nil {
			log.Printf("AudioWS: failed to remove temp file: %v", err)
		}
	}()

	log.Printf("AudioWS: recording started -> %s", rawPath)

	var connMu sync.Mutex
	writeJSON := func(v interface{}) error {
		connMu.Lock()
		defer connMu.Unlock()
		return conn.WriteJSON(v)
	}

	var searchMu sync.Mutex
	chunkCount := 0

	// Receive audio chunks until client sends "end"
	for {
		msgType, data, err := conn.ReadMessage()
		if err != nil {
			log.Printf("AudioWS: connection lost before end signal: %v", err)
			return
		}

		switch msgType {
		case websocket.BinaryMessage:
			// Audio chunk: append to temp file
			if _, err := tmpFile.Write(data); err != nil {
				log.Printf("AudioWS: write chunk: %v", err)
				return
			}
			chunkCount++

			// Trigger continuous recognition in background every 5 seconds (5 chunks)
			if chunkCount > 0 && chunkCount%5 == 0 {
				if searchMu.TryLock() {
					go func(path string) {
						defer searchMu.Unlock()

						reporter := audio.Reportf(func(format string, args ...any) {
							_ = writeJSON(wsResult{Type: "log", Message: fmt.Sprintf(format, args...)})
						})

						res, err := audio.RunRecognitionPipelineWithReporter(path, reporter)
						if err == nil && len(res) > 0 && res[0].Score >= 45 {
							// Match found! Only trigger if score >= 45 to avoid noise
							resp := wsResult{
								Type:   "result",
								Found:  true,
								SongID: res[0].SongID,
								Score:  res[0].Score,
							}
							
							for _, r := range res {
								if song, err := storage.GetSongByID(r.SongID); err == nil {
									resp.Matches = append(resp.Matches, WSMatch{
										SongID: r.SongID,
										Title:  song.Title,
										Artist: song.Artist,
										Score:  r.Score,
									})
								}
							}

							if len(resp.Matches) > 0 {
								resp.Title = resp.Matches[0].Title
								resp.Artist = resp.Matches[0].Artist
							}

							log.Printf("AudioWS (continuous): found match %q with score %d", resp.Title, resp.Score)
							_ = writeJSON(resp)
						}
					}(rawPath)
				}
			}

		case websocket.TextMessage:
			// Control message: check for "end" signal
			var msg wsIncoming
			if err := json.Unmarshal(data, &msg); err == nil && msg.Type == "end" {
				goto done
			}
		}
	}

done:
	// Await any background searches to finish using Lock
	searchMu.Lock()
	defer searchMu.Unlock()

	log.Println("AudioWS: received end signal, running final recognition...")
	_ = writeJSON(wsResult{Type: "log", Message: "[recognition] finalizing search..."})

	if err := tmpFile.Close(); err != nil {
		log.Printf("AudioWS: close temp: %v", err)
		_ = writeJSON(wsResult{Type: "result", Error: "server error"})
		return
	}
	tmpFile = nil

	// Run recognition pipeline one last time
	reporter := audio.Reportf(func(format string, args ...any) {
		_ = writeJSON(wsResult{Type: "log", Message: fmt.Sprintf(format, args...)})
	})
	result, err := audio.RunRecognitionPipelineWithReporter(rawPath, reporter)
	if err != nil {
		log.Printf("AudioWS: final recognition failed: %v", err)
		_ = writeJSON(wsResult{Type: "result", Error: "recognition failed"})
		return
	}

	// Build and send response
	resp := wsResult{Type: "result"}
	if len(result) == 0 || result[0].Score < 45 {
		resp.Found = false
	} else {
		resp.Found = true
		resp.SongID = result[0].SongID
		resp.Score = result[0].Score

		for _, r := range result {
			if r.Score < 45 { continue } // Only include high-quality matches in the list
			if song, err := storage.GetSongByID(r.SongID); err == nil {
				resp.Matches = append(resp.Matches, WSMatch{
					SongID: r.SongID,
					Title:  song.Title,
					Artist: song.Artist,
					Score:  r.Score,
				})
			}
		}

		if len(resp.Matches) > 0 {
			resp.Title = resp.Matches[0].Title
			resp.Artist = resp.Matches[0].Artist
		}
	}

	if err := writeJSON(resp); err != nil {
		log.Printf("AudioWS: send result: %v", err)
	}
	log.Printf("AudioWS: done - found=%v title=%q score=%d", resp.Found, resp.Title, resp.Score)
}
