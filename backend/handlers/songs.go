package handlers

import (
	"aura/audio"
	"aura/storage"
	"database/sql"
	"encoding/json"
	"io"
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
		http.Error(w, "invalid file", 400)
		return
	}
	defer file.Close()

	path := filepath.Join("tmp", header.Filename)
	out, _ := os.Create(path)
	io.Copy(out, file)
	out.Close()

	if err := audio.RunIngestionPipeline(path); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	w.WriteHeader(http.StatusOK)
}
