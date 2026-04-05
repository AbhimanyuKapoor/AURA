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
	// print to stdout for non-streaming callers by default
	reporter := Reportf(func(format string, args ...any) {
		fmt.Printf(format+"\n", args...)
	})
	return RunIngestionPipelineWithReporter(rawPath, reporter)
}

func RunIngestionPipelineWithReporter(rawPath string, reporter Reportf) ([]fingerprint.FingerprintHash, error) {
	// FFmpeg check for unsupported file type
	cmd := exec.Command("ffmpeg", "-v", "error", "-i", rawPath, "-f", "null", "-")
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ingestion: unsupported or invalid audio file")
	}

	// Normalize -> mono, 22050Hz, 16-bit WAV
	normalizedPath, meta, err := NormalizeAudio(rawPath, "tmp")
	if err != nil {
		return nil, fmt.Errorf("ingestion: normalize: %w", err)
	}
	defer os.Remove(normalizedPath)

	reporter.Printf("[ingestion] normalized: duration=%.2fs sampleRate=%dHz",
		meta.Duration, meta.SampleRate)

	// Read WAV -> float64 samples -> spectrogram
	wavData, err := ReadWAV(normalizedPath)
	if err != nil {
		return nil, fmt.Errorf("ingestion: read WAV: %w", err)
	}

	spectrogram := ComputeSpectrogram(wavData.Samples)
	reporter.Printf("[ingestion] spectrogram: %d frames", len(spectrogram))

	// Extract peaks from spectrogram
	peaks := fingerprint.ExtractPeaks(spectrogram)
	reporter.Printf("[ingestion] peaks: %d extracted", len(peaks))

	if len(peaks) == 0 {
		reporter.Printf("[ingestion] no peaks found - audio may be silent or too short")
		return nil, fmt.Errorf("ingestion: no peaks found - audio may be silent or too short")
	}

	// Generate hashes from peaks and return them
	hashes := fingerprint.GenerateHashes(peaks)
	reporter.Printf("[ingestion] hashes: %d generated", len(hashes))

	return hashes, nil
}
