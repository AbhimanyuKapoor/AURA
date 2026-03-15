package storage

import (
	"aura/fingerprint"
	"fmt"

	"github.com/lib/pq"
)

// StoreFingerprints inserts all fingerprint hashes for a song in one transaction.
// Uses a prepared statement for performance — a 3-minute song can generate
// 100,000+ hashes so individual inserts would be far too slow.
func StoreFingerprints(songID int, hashes []fingerprint.FingerprintHash) error {
	if len(hashes) == 0 {
		return nil
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("store fingerprints: begin tx: %w", err)
	}
	defer tx.Rollback() // no-op if Commit() was already called

	stmt, err := tx.Prepare(
		`INSERT INTO fingerprints (hash, song_id, time_offset) VALUES ($1, $2, $3)`,
	)
	if err != nil {
		return fmt.Errorf("store fingerprints: prepare: %w", err)
	}
	defer stmt.Close()

	for _, h := range hashes {
		if _, err := stmt.Exec(h.Hash, songID, h.TimeOffset); err != nil {
			return fmt.Errorf("store fingerprints: insert: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("store fingerprints: commit: %w", err)
	}
	return nil
}

// LookupHashes fetches all DB fingerprints matching any of the given hashes.
// Uses PostgreSQL's ANY($1) operator for a single round-trip instead of N queries.
// Returns a map of hash → list of matches (a hash can appear in multiple songs).
func LookupHashes(hashes []int64) (map[int64][]fingerprint.DBMatch, error) {
	if len(hashes) == 0 {
		return nil, nil
	}

	rows, err := db.Query(
		`SELECT hash, song_id, time_offset
		 FROM fingerprints
		 WHERE hash = ANY($1)`,
		pq.Array(hashes),
	)
	if err != nil {
		return nil, fmt.Errorf("lookup hashes: query: %w", err)
	}
	defer rows.Close()

	results := make(map[int64][]fingerprint.DBMatch)
	for rows.Next() {
		var hash int64
		var dm fingerprint.DBMatch
		if err := rows.Scan(&hash, &dm.SongID, &dm.TimeOffset); err != nil {
			return nil, fmt.Errorf("lookup hashes: scan: %w", err)
		}
		results[hash] = append(results[hash], dm)
	}

	return results, rows.Err()
}