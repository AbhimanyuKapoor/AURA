package audio

import (
	"encoding/binary"
	"fmt"
	"io"
	"math"
	"os"
)

// WAVData holds decoded audio samples normalized to [-1.0, 1.0]
type WAVData struct {
	Samples    []float64
	SampleRate int
}

// ReadWAV parses a 16-bit mono PCM WAV file produced by NormalizeAudio.
// It skips unknown chunks (LIST, INFO, etc.) so it works with real-world WAVs.
func ReadWAV(path string) (*WAVData, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("wav: open: %w", err)
	}
	defer f.Close()

	// ── RIFF header ──────────────────────────────────────────────────────────
	var riffID [4]byte
	if err := binary.Read(f, binary.LittleEndian, &riffID); err != nil {
		return nil, fmt.Errorf("wav: read RIFF tag: %w", err)
	}
	if string(riffID[:]) != "RIFF" {
		return nil, fmt.Errorf("wav: not a RIFF file")
	}

	var chunkSize uint32
	binary.Read(f, binary.LittleEndian, &chunkSize) // total file size - 8

	var waveID [4]byte
	if err := binary.Read(f, binary.LittleEndian, &waveID); err != nil {
		return nil, fmt.Errorf("wav: read WAVE tag: %w", err)
	}
	if string(waveID[:]) != "WAVE" {
		return nil, fmt.Errorf("wav: not a WAVE file")
	}

	// ── Sub-chunks ────────────────────────────────────────────────────────────
	var (
		sampleRate    uint32
		bitsPerSample uint16
	)

	for {
		var id [4]byte
		if err := binary.Read(f, binary.LittleEndian, &id); err != nil {
			if err == io.EOF {
				return nil, fmt.Errorf("wav: no data chunk found")
			}
			return nil, fmt.Errorf("wav: read chunk id: %w", err)
		}
		var size uint32
		if err := binary.Read(f, binary.LittleEndian, &size); err != nil {
			return nil, fmt.Errorf("wav: read chunk size: %w", err)
		}

		switch string(id[:]) {

		case "fmt ":
			var audioFormat uint16
			binary.Read(f, binary.LittleEndian, &audioFormat) // 1 = PCM
			var numChannels uint16
			binary.Read(f, binary.LittleEndian, &numChannels)
			binary.Read(f, binary.LittleEndian, &sampleRate)
			var byteRate uint32
			binary.Read(f, binary.LittleEndian, &byteRate)
			var blockAlign uint16
			binary.Read(f, binary.LittleEndian, &blockAlign)
			binary.Read(f, binary.LittleEndian, &bitsPerSample)

			if audioFormat != 1 {
				return nil, fmt.Errorf("wav: only PCM supported (got format %d)", audioFormat)
			}
			if bitsPerSample != 16 {
				return nil, fmt.Errorf("wav: only 16-bit supported (got %d-bit)", bitsPerSample)
			}
			// Skip any extra fmt extension bytes
			if size > 16 {
				io.CopyN(io.Discard, f, int64(size-16))
			}

		case "data":
			// Each sample is 2 bytes (int16)
			numSamples := int(size) / 2
			raw := make([]int16, numSamples)
			if err := binary.Read(f, binary.LittleEndian, raw); err != nil {
				return nil, fmt.Errorf("wav: read PCM samples: %w", err)
			}
			// Normalize int16 → float64 in range [-1.0, 1.0]
			samples := make([]float64, numSamples)
			for i, s := range raw {
				samples[i] = float64(s) / math.MaxInt16
			}
			return &WAVData{
				Samples:    samples,
				SampleRate: int(sampleRate),
			}, nil

		default:
			// Unknown chunks (LIST, INFO, fact, etc.) — just skip
			if _, err := io.CopyN(io.Discard, f, int64(size)); err != nil {
				return nil, fmt.Errorf("wav: skip chunk %q: %w", id, err)
			}
		}
	}
}