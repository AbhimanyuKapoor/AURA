package handlers

import (
	"aura/audio"
	"aura/storage"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

type RecognizeResponse struct {
	Found  bool   `json:"found"`
	SongID int    `json:"song_id,omitempty"`
	Title  string `json:"title,omitempty"`
	Artist string `json:"artist,omitempty"`
	Score  int    `json:"score,omitempty"`
}

// RecognizeHandler accepts a POST with a "clip" audio file and returns the matched song metadata
func RecognizeHandler(w http.ResponseWriter, r *http.Request) {
	file, header, err := r.FormFile("clip")
	if err != nil {
		http.Error(w, "missing 'clip' audio file in form data", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Save clip to temp file
	if err := os.MkdirAll("tmp", 0755); err != nil {
		log.Printf("RecognizeHandler: mkdir failed: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	ext := filepath.Ext(filepath.Base(header.Filename))
	tmpFile, err := os.CreateTemp("tmp", "query-*"+ext)
	if err != nil {
		log.Printf("RecognizeHandler: create temp: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	path := tmpFile.Name()
	defer func() {
		if tmpFile != nil {
			tmpFile.Close()
		}
		os.Remove(path)
	}()

	if _, err := io.Copy(tmpFile, file); err != nil {
		log.Printf("RecognizeHandler: copy: %v", err)
		http.Error(w, "failed to save file", http.StatusInternalServerError)
		return
	}
	if err := tmpFile.Close(); err != nil {
		log.Printf("RecognizeHandler: close: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	tmpFile = nil

	// Run recognition pipeline
	result, err := audio.RunRecognitionPipeline(path)
	if err != nil {
		log.Printf("RecognizeHandler: pipeline failed: %v", err)
		http.Error(w, "recognition failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	resp := RecognizeResponse{}
	if len(result) == 0 {
		resp.Found = false
		json.NewEncoder(w).Encode(resp)
		return
	}

	resp.Found = true
	resp.SongID = result[0].SongID
	resp.Score = result[0].Score

	song, err := storage.GetSongByID(result[0].SongID)
	if err == nil {
		resp.Title = song.Title
		resp.Artist = song.Artist
	}

	json.NewEncoder(w).Encode(resp)
}
