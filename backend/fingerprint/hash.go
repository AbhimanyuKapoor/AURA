package fingerprint

const (
	// TargetZoneSize is how many target peaks to pair with each anchor.
	// More pairs = more hashes = more robust but uses more DB space.
	TargetZoneSize = 5

	// TargetZoneDTMin is the minimum frame gap between anchor and target peaks.
	// Prevents pairing peaks that are too close in time (likely same note).
	TargetZoneDTMin = 2

	// TargetZoneDT is the maximum frame gap between anchor and target peaks.
	// 30 frames × (2048 hop / 22050 Hz) ~ 2.8 seconds lookahead window.
	TargetZoneDT = 30
)

// FingerprintHash is one hash derived from a pair of constellation peaks.
// Thousands of these represent a single song's fingerprint.
type FingerprintHash struct {
	Hash       int64 // encodes (anchorFreq, targetFreq, timeDelta)
	TimeOffset int   // anchor's frame index - used for time-coherence scoring
}

// encodeHash packs three values into a single int64 using bit fields:
//
//	bits 33–22: anchor frequency bin
//	bits 21–11: target frequency bin
//	bits 10–0:  time delta in frames
func encodeHash(anchorFreq, targetFreq, timeDelta int) int64 {
	return int64(anchorFreq)<<22 | int64(targetFreq)<<11 | int64(timeDelta)
}

// GenerateHashes creates combinatorial fingerprint hashes from a peak list.
//
// Algorithm (from Wang's Shazam paper):
//  1. For each "anchor" peak, look forward in time
//  2. Pair it with up to TargetZoneSize "target" peaks within the time window
//  3. Encode (anchorFreq, targetFreq, timeDelta) as a single hash
//  4. Store the anchor's time offset alongside the hash
//
// The time offset is what enables time-coherence matching later -
// a real match will have all its hashes offset by the same time delta.
func GenerateHashes(peaks []Peak) []FingerprintHash {
	var hashes []FingerprintHash

	for i, anchor := range peaks {
		paired := 0

		for j := i + 1; j < len(peaks) && paired < TargetZoneSize; j++ {
			target := peaks[j]
			dt := target.TimeFrame - anchor.TimeFrame

			if dt < TargetZoneDTMin {
				continue // too close in time
			}
			if dt > TargetZoneDT {
				break // peaks are sorted by time, no point looking further
			}

			hashes = append(hashes, FingerprintHash{
				Hash:       encodeHash(anchor.FreqBin, target.FreqBin, dt),
				TimeOffset: anchor.TimeFrame,
			})
			paired++
		}
	}

	return hashes
}
