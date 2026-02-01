package main

import (
	"aura/env"
	"aura/server"
	"aura/storage"
	"log"
)

func main() {
	env.Load()

	db, err := storage.InitDB()
	if err != nil {
		log.Fatalf("failed to init db: %v", err)
	}
	defer db.Close()

	_ = db // Temp

	if err := server.StartServer(); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
