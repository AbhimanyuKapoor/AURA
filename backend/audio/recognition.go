package audio

import (
	"aura/fingerprint"
	"aura/storage"
	"fmt"
	"os"
)

// RunRecognitionPipeline processes a short query audio clip and returns
// the best-matching song from the database.
//
// Returns nil when audio is valid but no match was found.
// Returns an error only if the pipeline itself fails.
func RunRecognitionPipeline(rawPath string) (*fingerprint.MatchResult, error) {
	// Normalize -> mono, 22050Hz, 16-bit WAV
	normalizedPath, meta, err := NormalizeAudio(rawPath, "tmp")
	if err != nil {
		return nil, fmt.Errorf("recognition: normalize: %w", err)
	}
	defer os.Remove(normalizedPath)

	fmt.Printf("[recognition] normalized: duration=%.2fs sampleRate=%dHz\n",
		meta.Duration, meta.SampleRate)

	// Read WAV -> float64 samples -> spectrogram
	wavData, err := ReadWAV(normalizedPath)
	if err != nil {
		return nil, fmt.Errorf("recognition: read WAV: %w", err)
	}

	spectrogram := ComputeSpectrogram(wavData.Samples)

	// Extract peaks from spectrogram
	peaks := fingerprint.ExtractPeaks(spectrogram)
	fmt.Printf("[recognition] peaks: %d extracted\n", len(peaks))

	if len(peaks) == 0 {
		fmt.Println("[recognition] no peaks found - audio too quiet or too short")
		return nil, nil
	}

	// Generate hashes from peaks + match from DB
	hashes := fingerprint.GenerateHashes(peaks)
	fmt.Printf("[recognition] hashes: %d generated, querying DB...\n", len(hashes))

	result, err := fingerprint.ScoreMatches(hashes, storage.LookupHashes)
	if err != nil {
		return nil, fmt.Errorf("recognition: score matches: %w", err)
	}

	if result == nil {
		fmt.Println("[recognition] no match found")
	} else {
		fmt.Printf("[recognition] matched song #%d with score %d\n",
			result.SongID, result.Score)
	}

	return result, nil
}
