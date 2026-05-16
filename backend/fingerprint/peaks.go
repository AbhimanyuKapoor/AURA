package fingerprint

const (
	// must match the constants in audio/fft.go and audio/normalizer.go
	fftFrameSize = 4096
	sampleRate   = 22050

	// Filters out noise, below this value are treated as silence and ignored
	MagnitudeThreshold = 5.0
)

// One dominant peak per band per frame - ensures to capture
// energy across the full spectrum, not just the loudest frequency
var frequencyBands = []struct{ Low, High int }{
	{0, 500},
	{500, 1000},
	{1000, 2000},
	{2000, 4000},
	{4000, 8000},
	{8000, 11025}, // up to Nyquist limit at 22050 Hz
}

// Dominant frequency at a specific point in time.
// Song is represented as a "constellation" of peaks
type Peak struct {
	TimeFrame int     // FFT frame (time axis)
	FreqBin   int     // frequency bin (frequency axis)
	Magnitude float64 // strength - used for threshold filtering only
}

// freqToIndex converts a frequency in Hz to the nearest FFT bin index.
// Formula: bin = freq * frameSize / sampleRate
func freqToIndex(hz int) int {
	return hz * fftFrameSize / sampleRate
}

// Scans every time frame of the spectrogram and picks the
// loudest frequency bin within each band.
//
// # Weak peaks, discarded - background noise
//
// Output -> list of (time, frequency) constellation points, sorted by time
func ExtractPeaks(spectrogram Spectrogram) []Peak {
	var peaks []Peak

	for timeFrame, magnitudes := range spectrogram {
		for _, band := range frequencyBands {
			lowBin := freqToIndex(band.Low)
			highBin := freqToIndex(band.High)

			// Clamp to actual number of bins available
			if highBin > len(magnitudes) {
				highBin = len(magnitudes)
			}
			if lowBin >= highBin {
				continue
			}

			// Find the bin with the highest magnitude in this band
			maxMag := 0.0
			maxBin := lowBin
			for bin := lowBin; bin < highBin; bin++ {
				if magnitudes[bin] > maxMag {
					maxMag = magnitudes[bin]
					maxBin = bin
				}
			}

			// Ignore peaks that are too quiet - they're noise
			if maxMag < MagnitudeThreshold {
				continue
			}

			peaks = append(peaks, Peak{
				TimeFrame: timeFrame,
				FreqBin:   maxBin,
				Magnitude: maxMag,
			})
		}
	}

	return peaks
}
