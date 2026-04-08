package handlers

import (
	"aura/audio"
	"aura/storage"
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
)

func IngestYouTubeStream(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(64 << 20); err != nil {
		if err := r.ParseForm(); err != nil {
			http.Error(w, "failed to parse form", http.StatusBadRequest)
			return
		}
	}

	url := r.FormValue("url")
	if url == "" {
		http.Error(w, "url is required", http.StatusBadRequest)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/x-ndjson")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)

	enc := json.NewEncoder(w)
	
	// Mutex to protect multithreaded writes to the NDJSON stream
	var streamMu sync.Mutex
	writeEvent := func(evt UploadStreamEvent) bool {
		streamMu.Lock()
		defer streamMu.Unlock()
		if err := enc.Encode(evt); err != nil {
			return false
		}
		flusher.Flush()
		return true
	}

	writeEvent(UploadStreamEvent{Type: "log", Message: fmt.Sprintf("[youtube] Preparing download for url: %s", url)})

	// Create unique temp directory
	if err := os.MkdirAll("tmp", 0755); err != nil {
		writeEvent(UploadStreamEvent{Type: "error", Error: "server error"})
		return
	}

	tmpDir, err := os.MkdirTemp("tmp", "yt-*")
	if err != nil {
		writeEvent(UploadStreamEvent{Type: "error", Error: "server error creating temp dir"})
		return
	}
	defer os.RemoveAll(tmpDir)

	// Run yt-dlp
	writeEvent(UploadStreamEvent{Type: "log", Message: "[youtube] Downloading audio (this may take a while for playlists)..."})
	
	// Output template puts files in the temp dir: Title.wav
	outTmpl := filepath.Join(tmpDir, "%(uploader)s - %(title)s.%(ext)s")
	
	cmd := exec.Command("yt-dlp",
		"--extract-audio",
		"--audio-format", "wav",
		"--no-warnings",
		"--newline", // important for streaming logs
		"-i",        // ignore errors (e.g. unavailable videos in playlist)
		"-o", outTmpl,
		"--exec", "echo AURA_READY:{}", // emit a signal right when a single track finishes completely
		url,
	)

	stdout, _ := cmd.StdoutPipe()
	cmd.Stderr = cmd.Stdout // capture stderr inside stdout stream

	if err := cmd.Start(); err != nil {
		writeEvent(UploadStreamEvent{Type: "error", Error: "Failed to start download process"})
		return
	}

	var wg sync.WaitGroup
	var processingErrors = 0
	var successCount = 0

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)
		
		if strings.HasPrefix(trimmed, "AURA_READY:") {
			filePath := strings.TrimPrefix(trimmed, "AURA_READY:")
			filePath = strings.Trim(filePath, "\"' ")

			writeEvent(UploadStreamEvent{Type: "log", Message: fmt.Sprintf("[yt-dlp] Download finished: %s", filepath.Base(filePath))})

			wg.Add(1)
			// Launch goroutine to fingerprint concurrently WHILE remaining downloads continue!
			go func(file string) {
				defer wg.Done()

				songTitle := strings.TrimSuffix(filepath.Base(file), ".wav")
				
				title := songTitle
				artist := "YouTube"
				
				parts := strings.SplitN(songTitle, " - ", 2)
				if len(parts) == 2 {
					artist = parts[0]
					title = parts[1]
				}
				
				writeEvent(UploadStreamEvent{Type: "log", Message: fmt.Sprintf("[%s] Generating acoustic fingerprints...", title)})
				
				songID, err := storage.CreateSong(storage.Song{Title: title, Artist: artist})
				if err != nil {
					log.Printf("IngestYouTube: create record: %v", err)
					writeEvent(UploadStreamEvent{Type: "error", Error: fmt.Sprintf("DB error for %s", title)})
					processingErrors++
					return
				}
				
				reporter := audio.Reportf(func(format string, args ...any) {
					_ = writeEvent(UploadStreamEvent{Type: "log", Message: fmt.Sprintf("[%s] %s", title, fmt.Sprintf(format, args...))})
				})
				
				hashes, err := audio.RunIngestionPipelineWithReporter(file, reporter)
				if err != nil {
					log.Printf("IngestYouTube: pipeline failed for %s: %v", file, err)
					storage.DeleteSong(songID)
					writeEvent(UploadStreamEvent{Type: "error", Error: fmt.Sprintf("Ingestion failed for %s", title)})
					processingErrors++
					return
				}

				if err := storage.StoreFingerprints(songID, hashes); err != nil {
					log.Printf("IngestYouTube: store fingerprints failed for %s: %v", file, err)
					storage.DeleteSong(songID)
					writeEvent(UploadStreamEvent{Type: "error", Error: fmt.Sprintf("Storage failed for %s", title)})
					processingErrors++
					return
				}

				successCount++
				writeEvent(UploadStreamEvent{Type: "done", SongID: songID, Message: fmt.Sprintf("Added: %s", title)})
			}(filePath)

			continue
		}
		
		// Normal streaming logs
		if strings.HasPrefix(trimmed, "[download] Destination:") || 
		   strings.Contains(trimmed, "100%") || 
		   strings.HasPrefix(trimmed, "[ExtractAudio]") ||
		   strings.HasPrefix(trimmed, "ERROR:") {
			cleanMsg := strings.Replace(trimmed, "[download] ", "", 1)
			cleanMsg = strings.Replace(cleanMsg, "[ExtractAudio] ", "", 1)
			writeEvent(UploadStreamEvent{Type: "log", Message: fmt.Sprintf("[yt-dlp] %s", cleanMsg)})
		}
	}

	if err := cmd.Wait(); err != nil {
		log.Printf("yt-dlp error: %v", err)
		writeEvent(UploadStreamEvent{Type: "error", Error: "Download command encountered an error - is the URL valid?"})
	}

	// Wait for ALL concurrent ingestion pipelines to finish!
	wg.Wait()

	if processingErrors > 0 {
		writeEvent(UploadStreamEvent{Type: "error", Error: fmt.Sprintf("Ingestion complete with %d error(s).", processingErrors)})
	} else if successCount > 0 {
		writeEvent(UploadStreamEvent{Type: "log", Message: fmt.Sprintf("[youtube] Successfully added %d track(s).", successCount)})
	} else if err == nil {
		writeEvent(UploadStreamEvent{Type: "error", Error: "No audio tracks were successfully downloaded."})
	}
}
