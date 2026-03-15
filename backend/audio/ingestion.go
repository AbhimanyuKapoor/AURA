package audio

import (
	"aura/fingerprint"
	"fmt"
	"os"
	"os/exec"
)

// RunIngestionPipeline processes an audio file and returns its fingerprint hashes.
// The caller (UploadSong handler) is responsible for storing them in the DB.
func RunIngestionPipeline(rawPath string) ([]fingerprint.FingerprintHash, error) {
	// Validate the file is a supported audio format
	cmd := exec.Command("ffmpeg", "-v", "error", "-i", rawPath, "-f", "null", "-")
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ingestion: unsupported or invalid audio file")
	}

	// Step 4: Normalize → mono, 22050Hz, 16-bit WAV
	normalizedPath, meta, err := NormalizeAudio(rawPath, "tmp")
	if err != nil {
		return nil, fmt.Errorf("ingestion: normalize: %w", err)
	}
	defer os.Remove(normalizedPath)

	fmt.Printf("[ingestion] normalized: duration=%.2fs sampleRate=%dHz\n",
		meta.Duration, meta.SampleRate)

	// Step 5: Read WAV → float64 samples → spectrogram
	wavData, err := ReadWAV(normalizedPath)
	if err != nil {
		return nil, fmt.Errorf("ingestion: read WAV: %w", err)
	}

	spectrogram := ComputeSpectrogram(wavData.Samples)
	fmt.Printf("[ingestion] spectrogram: %d frames\n", len(spectrogram))

	// Step 6: Extract peaks from spectrogram
	peaks := fingerprint.ExtractPeaks(spectrogram)
	fmt.Printf("[ingestion] peaks: %d extracted\n", len(peaks))

	if len(peaks) == 0 {
		return nil, fmt.Errorf("ingestion: no peaks found — audio may be silent or too short")
	}

	// Step 7: Generate hashes from peaks and return them
	hashes := fingerprint.GenerateHashes(peaks)
	fmt.Printf("[ingestion] hashes: %d generated\n", len(hashes))

	return hashes, nil
}