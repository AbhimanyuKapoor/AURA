package fingerprint

const (
	// These must match the constants in audio/fft.go and audio/normalizer.go
	fftFrameSize = 4096
	sampleRate   = 22050

	// MagnitudeThreshold filters out noise.
	// Bins below this value are treated as silence and ignored.
	// Tune this up if you get too many false matches, down if you miss songs.
	MagnitudeThreshold = 5.0
)

// frequencyBands splits the audible range into zones.
// We pick ONE dominant peak per band per frame - this ensures we capture
// energy across the full spectrum, not just the loudest frequency.
// This mirrors the approach in Wang's original Shazam paper.
var frequencyBands = []struct{ Low, High int }{
	{0, 500},
	{500, 1000},
	{1000, 2000},
	{2000, 4000},
	{4000, 8000},
	{8000, 11025}, // up to Nyquist limit at 22050 Hz
}

// Peak is a dominant frequency at a specific point in time.
// A song is represented as a "constellation" of these peaks.
type Peak struct {
	TimeFrame int     // which FFT frame (time axis)
	FreqBin   int     // which frequency bin (frequency axis)
	Magnitude float64 // strength - used for threshold filtering only
}

// freqToIndex converts a frequency in Hz to the nearest FFT bin index.
// Formula: bin = freq * frameSize / sampleRate
func freqToIndex(hz int) int {
	return hz * fftFrameSize / sampleRate
}

// ExtractPeaks scans every time frame of the spectrogram and picks the
// loudest frequency bin within each band. Weak peaks (below MagnitudeThreshold)
// are discarded - they're likely background noise or silence.
//
// Output is a list of (time, frequency) constellation points, sorted by time.
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
