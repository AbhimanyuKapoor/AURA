package audio

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

type AudioMetadata struct {
	Duration   float64
	SampleRate int
}

func NormalizeAudio(input string, outDir string) (string, AudioMetadata, error) {
	if _, err := os.Stat(input); os.IsNotExist(err) {
		return "", AudioMetadata{}, fmt.Errorf("Input file not found: %s", input)
	}

	// temp output file for normalized audio of input
	tmpOutFile, err := os.CreateTemp(outDir, "normalized-*.wav")
	if err != nil {
		return "", AudioMetadata{}, fmt.Errorf("failed to create output temp file: %v", err)
	}
	outputPath := tmpOutFile.Name()
	if err := tmpOutFile.Close(); err != nil {
		return "", AudioMetadata{}, fmt.Errorf("failed to close output temp file: %v", err)
	}

	// FFmpeg command
	cmd := exec.Command("ffmpeg", "-y",
		"-i", input,
		"-ac", "1",
		"-ar", "22050",
		"-sample_fmt", "s16",
		"-af", "loudnorm",
		"-map_metadata", "-1",
		outputPath,
	)

	if err := cmd.Run(); err != nil {
		return "", AudioMetadata{}, fmt.Errorf("ffmpeg normalization failed: %v", err)
	}

	meta, err := getMetadata(outputPath)
	if err != nil {
		return "", AudioMetadata{}, err
	}

	return outputPath, meta, nil
}

// Helper function to get metadata
func getMetadata(input string) (AudioMetadata, error) {
	cmd := exec.Command("ffprobe", "-v", "error",
		"-select_streams", "a:0",
		"-show_entries", "stream=sample_rate",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		input,
	)

	out, err := cmd.Output()
	if err != nil {
		return AudioMetadata{}, fmt.Errorf("ffprobe failed: %v", err)
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) < 2 {
		return AudioMetadata{}, fmt.Errorf("unexpected ffprobe output")
	}

	sampleRate, err := strconv.Atoi(strings.TrimSpace(lines[0]))
	if err != nil {
		return AudioMetadata{}, err
	}

	duration, err := strconv.ParseFloat(strings.TrimSpace(lines[1]), 64)
	if err != nil {
		return AudioMetadata{}, err
	}

	return AudioMetadata{
		SampleRate: sampleRate,
		Duration:   duration,
	}, nil
}
