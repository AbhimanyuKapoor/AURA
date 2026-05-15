package audio

import (
	"math"
	"math/cmplx"
)

const (
	// FrameSize is samples per FFT window. Must be a power of 2.
	// 4096 samples @ 22050 Hz ~ 186ms per frame - good frequency resolution.
	FrameSize = 4096

	// HopSize is the step between frames (50% overlap).
	// Overlap gives smoother time resolution without missing transients.
	HopSize = 2048
)

// hammingWindow multiplies a frame by a Hamming window in-place.
// This tapers the edges of each frame to zero, reducing spectral leakage
// (the "smearing" effect that happens when you abruptly cut a signal).
func hammingWindow(frame []float64) {
	n := len(frame)
	for i := range frame {
		frame[i] *= 0.54 - 0.46*math.Cos(2*math.Pi*float64(i)/float64(n-1))
	}
}

// fft computes the Fast Fourier Transform using the Cooley-Tukey radix-2 algorithm.
// Input length must be a power of 2.
// Returns complex spectrum where index k corresponds to frequency k*sampleRate/N.
func fft(x []complex128) []complex128 {
	n := len(x)
	if n <= 1 {
		return x
	}

	// Divide: split into even and odd indexed elements
	even := make([]complex128, n/2)
	odd := make([]complex128, n/2)
	for i := 0; i < n/2; i++ {
		even[i] = x[2*i]
		odd[i] = x[2*i+1]
	}

	// Conquer: recursively compute FFT on each half
	evenFFT := fft(even)
	oddFFT := fft(odd)

	// Combine using butterfly operation with twiddle factors
	result := make([]complex128, n)
	for k := 0; k < n/2; k++ {
		// Twiddle factor: e^(-2πik/n) rotates the odd component
		twiddle := cmplx.Exp(complex(0, -2*math.Pi*float64(k)/float64(n))) * oddFFT[k]
		result[k] = evenFFT[k] + twiddle
		result[k+n/2] = evenFFT[k] - twiddle
	}
	return result
}

// ComputeSpectrogram converts raw audio samples into a 2D magnitude matrix.
//
// Process:
//  1. Slice samples into overlapping FrameSize windows
//  2. Apply Hamming window to each frame
//  3. Run FFT → complex spectrum
//  4. Take magnitude (|complex|) of positive frequencies only
//
// Returns: spectrogram[timeFrame][freqBin] = magnitude
// Frequency of bin k = k * SampleRate / FrameSize  (e.g. bin 100 ~ 538 Hz)
func ComputeSpectrogram(samples []float64) [][]float64 {
	var spectrogram [][]float64

	for start := 0; start+FrameSize <= len(samples); start += HopSize {
		// Copy frame (don't mutate original samples)
		frame := make([]float64, FrameSize)
		copy(frame, samples[start:start+FrameSize])

		// Reduce spectral leakage
		hammingWindow(frame)

		// Convert to complex input for FFT
		cx := make([]complex128, FrameSize)
		for i, v := range frame {
			cx[i] = complex(v, 0)
		}

		spectrum := fft(cx)

		// Only keep first half - the second half mirrors it (Nyquist theorem)
		mags := make([]float64, FrameSize/2)
		for i := 0; i < FrameSize/2; i++ {
			mags[i] = cmplx.Abs(spectrum[i])
		}
		spectrogram = append(spectrogram, mags)
	}

	return spectrogram
}
