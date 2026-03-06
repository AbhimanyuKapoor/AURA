package handlers

import (
	"aura/audio"
	"log"
	"net/http"
	"os"

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

	// Stores received ws audio
	if err := os.MkdirAll("tmp", 0755); err != nil {
		log.Printf("AudioWS: failed to create tmp dir: %v", err)
		conn.WriteMessage(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "server error"),
		)
		return
	}

	// temp file of recording to avoid overwrite issues
	tmpFile, err := os.CreateTemp("tmp", "input-*.webm")
	if err != nil {
		log.Printf("AudioWS: failed to create temp file: %v", err)
		conn.WriteMessage(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "server error"),
		)
		return
	}

	rawPath := tmpFile.Name()

	defer func() {
		if tmpFile != nil {
			if err := tmpFile.Close(); err != nil {
				log.Printf("AudioWS: failed to close temp file: %v", err)
			}
		}

		// remove the temp file
		if err := os.Remove(rawPath); err != nil {
			log.Printf("AudioWS: failed to remove temp file: %v", err)
		}
	}()

	log.Printf("AudioWS: recording started, saving to %s", rawPath)
	for {
		msgType, data, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			break
		}

		if msgType == websocket.BinaryMessage {
			if _, err := tmpFile.Write(data); err != nil {
				log.Printf("AudioWS: failed to write audio chunk: %v", err)
				break
			}
		}
	}
	log.Println("AudioWS: recording ended")

	if err := tmpFile.Close(); err != nil {
		log.Printf("AudioWS: failed to close temp file before processing: %v", err)
		return
	}
	tmpFile = nil

	if err := audio.RunRecognitionPipeline(rawPath); err != nil {
		log.Printf("AudioWS: recognition pipeline failed: %v", err)
	}
}
