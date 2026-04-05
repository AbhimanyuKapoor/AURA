package server

import (
	"aura/env"
	"aura/handlers"
	"log"
	"net/http"
	"strconv"
)

func StartServer() error {
	port := env.GetEnvInt("APP_PORT", 8080)
	addr := ":" + strconv.Itoa(port)

	mux := http.NewServeMux()

	// Server health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Songs CRUD
	mux.HandleFunc("POST /songs", handlers.CreateSongHandler)
	mux.HandleFunc("GET /songs", handlers.ListSongsHandler)
	mux.HandleFunc("GET /songs/{id}", handlers.GetSongHandler)
	mux.HandleFunc("PUT /songs/{id}", handlers.UpdateSongHandler)
	mux.HandleFunc("DELETE /songs/{id}", handlers.DeleteSongHandler)

	// WebSocket audio ingestion
	mux.HandleFunc("GET /ws/audio", handlers.AudioWS)

	// Song ingestion (file upload)
	mux.HandleFunc("POST /songs/upload", handlers.UploadSong)

	// Song recognition
	mux.HandleFunc("POST /recognize", handlers.RecognizeHandler)

	log.Printf("Server listening on %s\n", addr)
	handler := corsMiddleware(loggingMiddleware(mux))
	return http.ListenAndServe(addr, handler)
}
