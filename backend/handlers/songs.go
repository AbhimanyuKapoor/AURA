package handlers

import (
	"aura/audio"
	"aura/storage"
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
)

type SongRequest struct {
	Title    string         `json:"title"`
	Artist   string         `json:"artist"`
	Metadata map[string]any `json:"metadata"`
}

func CreateSongHandler(w http.ResponseWriter, r *http.Request) {
	var req SongRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	song := storage.Song{
		Title:    req.Title,
		Artist:   req.Artist,
		Metadata: req.Metadata,
	}

	if err := storage.CreateSong(song); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func GetSongHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	song, err := storage.GetSongByID(id)
	if err == sql.ErrNoRows {
		http.Error(w, "song not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(song)
}

func ListSongsHandler(w http.ResponseWriter, r *http.Request) {
	songs, err := storage.ListSongs()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(songs)
}

func UpdateSongHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid song id", http.StatusBadRequest)
		return
	}

	var req SongRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = storage.UpdateSong(id, storage.Song{
		Title:    req.Title,
		Artist:   req.Artist,
		Metadata: req.Metadata,
	})

	if err == sql.ErrNoRows {
		http.Error(w, "song not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func DeleteSongHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid song id", http.StatusBadRequest)
		return
	}

	err = storage.DeleteSong(id)

	if err == sql.ErrNoRows {
		http.Error(w, "song not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func UploadSong(w http.ResponseWriter, r *http.Request) {
	file, header, err := r.FormFile("song")
	if err != nil {
		http.Error(w, "invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Stores received file audio
	if err := os.MkdirAll("tmp", 0755); err != nil {
		log.Printf("UploadSong: failed to create tmp dir: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// temp file of uploaded song
	ext := filepath.Ext(filepath.Base(header.Filename))
	tmpFile, err := os.CreateTemp("tmp", "upload-*"+ext)
	if err != nil {
		log.Printf("UploadSong: failed to create temp upload file: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	path := tmpFile.Name()

	defer func() {
		if tmpFile != nil {
			if err := tmpFile.Close(); err != nil {
				log.Printf("UploadSong: failed to close temp upload file: %v", err)
			}
		}

		if err := os.Remove(path); err != nil {
			log.Printf("UploadSong: failed to remove temp file: %v", err)
		}
	}()

	if _, err := io.Copy(tmpFile, file); err != nil {
		log.Printf("UploadSong: failed to write uploaded file: %v", err)
		http.Error(w, "failed to save file", http.StatusInternalServerError)
		return
	}

	// close before running ingestion (ffmpeg)
	if err := tmpFile.Close(); err != nil {
		log.Printf("UploadSong: failed to close temp file before ingestion: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	tmpFile = nil

	if err := audio.RunIngestionPipeline(path); err != nil {
		log.Printf("UploadSong: ingestion pipeline failed: %v", err)
		http.Error(w, "ingestion failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
