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

// UploadSong handles POST /songs/upload
// Expects multipart form fields:
//   - "song"   — audio file (any ffmpeg-supported format)
//   - "title"  — song title (required)
//   - "artist" — artist name (optional)
func UploadSong(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(64 << 20); err != nil {
		http.Error(w, "failed to parse form", http.StatusBadRequest)
		return
	}

	title := r.FormValue("title")
	if title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}
	artist := r.FormValue("artist")

	file, header, err := r.FormFile("song")
	if err != nil {
		http.Error(w, "missing 'song' file in form", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Create the song DB record first — we need its ID for fingerprints
	songID, err := storage.InsertSong(title, artist)
	if err != nil {
		log.Printf("UploadSong: create record: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	if err := os.MkdirAll("tmp", 0755); err != nil {
		log.Printf("UploadSong: mkdir: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	ext := filepath.Ext(filepath.Base(header.Filename))
	tmpFile, err := os.CreateTemp("tmp", "upload-*"+ext)
	if err != nil {
		log.Printf("UploadSong: create temp: %v", err)
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
		log.Printf("UploadSong: copy: %v", err)
		http.Error(w, "failed to save file", http.StatusInternalServerError)
		return
	}
	if err := tmpFile.Close(); err != nil {
		log.Printf("UploadSong: close: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	tmpFile = nil

	hashes, err := audio.RunIngestionPipeline(path)
	if err != nil {
		log.Printf("UploadSong: ingestion failed: %v", err)
		storage.DeleteSong(songID)
		http.Error(w, "ingestion failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := storage.StoreFingerprints(songID, hashes); err != nil {
		log.Printf("UploadSong: store fingerprints failed: %v", err)
		storage.DeleteSong(songID)
		http.Error(w, "storage failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int{"song_id": songID})
}