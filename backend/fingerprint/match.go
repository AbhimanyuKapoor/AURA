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
	TimeDelta int
}

// ScoreMatches finds the best-matching song using time-coherence scoring.
//
// Why this works (the key insight from Wang's paper):
//   - For the correct song, every matching hash pair will have the same
//     time difference: (dbTimeOffset - queryTimeOffset) = constant
//   - This is because the query clip is just a time-shifted slice of the song
//   - For a wrong song or random noise, the time differences are all random
//
// So we build a histogram of (songID -> timeDelta -> count).
// The song with the highest spike in that histogram is the match.
//
// lookupFn is a batch DB query - we pass all hashes at once to avoid N+1 queries.
func ScoreMatches(
	queryHashes []FingerprintHash,
	lookupFn func([]int64) (map[int64][]DBMatch, error),
) (*MatchResult, error) {

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
	// All genuine matches for the correct song will share the SAME timeDelta.
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

	// Find the (songID, timeDelta) pair with the highest count
	bestSongID := -1
	bestScore := 0
	bestTimeDelta := 0

	for songID, deltas := range histogram {
		for delta, count := range deltas {
			if count > bestScore {
				bestScore = count
				bestSongID = songID
				bestTimeDelta = delta
			}
		}
	}

	if bestSongID == -1 {
		return nil, nil
	}

	return &MatchResult{
		SongID: bestSongID,
		Score:  bestScore,
		TimeDelta: bestTimeDelta,
	}, nil
}
