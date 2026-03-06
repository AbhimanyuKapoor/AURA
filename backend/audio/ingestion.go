package audio

import (
	"fmt"
	"os/exec"
)

// Song ingestion pipeline into the DB
func RunIngestionPipeline(rawPath string) error {
	// FFmpeg check for unsupported file type
	cmd := exec.Command("ffmpeg", "-v", "error", "-i", rawPath, "-f", "null", "-")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("unsupported or invalid audio file")
	}

	_, meta, err := NormalizeAudio(rawPath, "tmp")
	if err != nil {
		return err
	}

	fmt.Printf("Normalized Audio, Metadata: %v\n", meta)

	return nil
}
