package fingerprint

// 2D time-frequency magnitude matrix produced by FFT
//
// Layout: Spectrogram[timeFrame][freqBin] = magnitude
//
//   - timeFrame: which FFT window in time (each step = HopSize / SampleRate seconds)
//   - freqBin:   which frequency component
//                actual frequency (Hz) = freqBin * sampleRate / frameSize
//
// With FrameSize=4096 and SampleRate=22050:
//   - Frequency resolution ~ 5.38 Hz per bin
//   - Time resolution ~ 93ms per frame (at 50% overlap)
//   - 2048 usable bins covering 0 -> 11025 Hz
type Spectrogram = [][]float64
