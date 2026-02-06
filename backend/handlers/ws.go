package handlers

import (
	"aura/audio"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func AudioWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Stores received audio
	os.MkdirAll("tmp", 0755)

	rawPath := filepath.Join("tmp", "input.webm")
	rawFile, err := os.Create(rawPath)
	if err != nil {
		log.Println("failed to create file:", err)
		return
	}
	defer rawFile.Close()

	log.Println("Recording started...")

	for {
		msgType, data, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			break
		}

		if msgType == websocket.BinaryMessage {
			rawFile.Write(data)
		}
	}

	log.Println("Recording ended")

	audio.RunRecognitionPipeline(filepath.Join("tmp", "input.webm"))
}
