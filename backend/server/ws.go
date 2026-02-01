package server

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func audioWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	var buffer []byte

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			break
		}
		buffer = append(buffer, data...)
		log.Println("Buffered bytes:", len(buffer))
	}
}
