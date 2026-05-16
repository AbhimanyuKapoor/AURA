package fingerprint

// DBMatch is a record from the fingerprint database matching a given hash.
type DBMatch struct {
	SongID     int
	TimeOffset int
}

// MatchResult is the output of a recognition attempt.
type MatchResult struct {
	SongID int
	Score  int // peak histogram count - higher means more confident match
}

// ScoreMatches finds the best-matching songs using time-coherence scoring.
//
// Histogram of (songID -> timeDelta -> count).
// The song with the highest spike in that histogram is the match.
//
// Returns up to 5 top matches sorted by score descending.
func ScoreMatches(
	queryHashes []FingerprintHash,
	lookupFn func([]int64) (map[int64][]DBMatch, error),
) ([]MatchResult, error) {

	if len(queryHashes) == 0 {
		return nil, nil
	}

	// Collect unique hash values for the batch lookup
	hashValues := make([]int64, len(queryHashes))
	for i, qh := range queryHashes {
		hashValues[i] = qh.Hash
	}

	// Single DB round-trip for all hashes
	dbResults, err := lookupFn(hashValues)
	if err != nil {
		return nil, err
	}
	if len(dbResults) == 0 {
		return nil, nil
	}

	// Index query hashes by value for quick lookup
	// (same hash can appear at multiple times in the query clip)
	queryTimesByHash := make(map[int64][]int)
	for _, qh := range queryHashes {
		queryTimesByHash[qh.Hash] = append(queryTimesByHash[qh.Hash], qh.TimeOffset)
	}

	// Build time-coherence histogram:
	// histogram[songID][timeDelta] = number of hashes that agree on this delta
	//
	// timeDelta = dbTimeOffset - queryTimeOffset
	histogram := make(map[int]map[int]int)

	for hash, dbMatches := range dbResults {
		queryTimes, ok := queryTimesByHash[hash]
		if !ok {
			continue
		}
		for _, dm := range dbMatches {
			for _, qt := range queryTimes {
				delta := dm.TimeOffset - qt
				if histogram[dm.SongID] == nil {
					histogram[dm.SongID] = make(map[int]int)
				}
				histogram[dm.SongID][delta]++
			}
		}
	}

	// Find the highest score for each song
	bestScoresBySong := make(map[int]int)
	for songID, deltas := range histogram {
		best := 0
		for _, count := range deltas {
			if count > best {
				best = count
			}
		}
		if best > 0 {
			bestScoresBySong[songID] = best
		}
	}

	if len(bestScoresBySong) == 0 {
		return nil, nil
	}

	var results []MatchResult
	for id, score := range bestScoresBySong {
		results = append(results, MatchResult{SongID: id, Score: score})
	}

	// Sort by score descending
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Score > results[i].Score {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	if len(results) > 5 {
		results = results[:5]
	}

	return results, nil
}
