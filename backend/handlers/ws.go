package handlers

import (
	"aura/audio"
	"aura/storage"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// The client sends {"type":"end"} when it's finished streaming audio.
type wsIncoming struct {
	Type string `json:"type"`
}

type wsResult struct {
	Found  bool   `json:"found"`
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

		case websocket.TextMessage:
			// Control message: check for "end" signal
			var msg wsIncoming
			if err := json.Unmarshal(data, &msg); err == nil && msg.Type == "end" {
				goto done
			}
		}
	}

done:
	log.Println("AudioWS: received end signal, running recognition...")

	if err := tmpFile.Close(); err != nil {
		log.Printf("AudioWS: close temp: %v", err)
		conn.WriteJSON(wsResult{Error: "server error"})
		return
	}
	tmpFile = nil

	// Run recognition pipeline
	result, err := audio.RunRecognitionPipeline(rawPath)
	if err != nil {
		log.Printf("AudioWS: recognition failed: %v", err)
		conn.WriteJSON(wsResult{Error: "recognition failed"})
		return
	}

	// Build and send response
	resp := wsResult{}
	if result == nil {
		resp.Found = false
	} else {
		resp.Found = true
		resp.SongID = result.SongID
		resp.Score = result.Score

		if song, err := storage.GetSongByID(result.SongID); err == nil {
			resp.Title = song.Title
			resp.Artist = song.Artist
		}
	}

	if err := conn.WriteJSON(resp); err != nil {
		log.Printf("AudioWS: send result: %v", err)
	}
	log.Printf("AudioWS: done - found=%v title=%q score=%d",
		resp.Found, resp.Title, resp.Score)
}
