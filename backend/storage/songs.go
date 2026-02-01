package storage

import (
	"database/sql"
	"encoding/json"
)

type Song struct {
	ID       int
	Title    string
	Artist   string
	Metadata map[string]any
}

func CreateSong(song Song) error {
	var metadataJSON []byte

	if song.Metadata != nil {
		var err error
		metadataJSON, err = json.Marshal(song.Metadata)
		if err != nil {
			return err
		}
	}

	_, err := db.Exec(
		`INSERT INTO songs (title, artist, metadata) 
		 VALUES ($1, $2, $3)`,
		song.Title,
		song.Artist,
		metadataJSON,
	)

	return err
}

func GetSongByID(id int) (*Song, error) {
	var s Song
	var metadataBytes []byte

	err := db.QueryRow(
		`SELECT id, title, artist, metadata FROM songs WHERE id = $1`, id,
	).Scan(&s.ID, &s.Title, &s.Artist, &metadataBytes)

	if err != nil {
		return nil, err
	}

	if metadataBytes != nil {
		if err := json.Unmarshal(metadataBytes, &s.Metadata); err != nil {
			return nil, err
		}
	}

	return &s, nil
}

func ListSongs() ([]Song, error) {
	rows, err := db.Query(
		`SELECT id, title, artist, metadata FROM songs`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var songs []Song

	for rows.Next() {
		var s Song
		var metadataBytes []byte

		if err := rows.Scan(&s.ID,
			&s.Title,
			&s.Artist,
			&metadataBytes,
		); err != nil {
			return nil, err
		}

		if metadataBytes != nil {
			if err := json.Unmarshal(metadataBytes, &s.Metadata); err != nil {
				return nil, err
			}
		}

		songs = append(songs, s)
	}

	return songs, nil
}

func UpdateSong(id int, song Song) error {
	var metadataJSON []byte

	if song.Metadata != nil {
		var err error
		metadataJSON, err = json.Marshal(song.Metadata)
		if err != nil {
			return err
		}
	}

	res, err := db.Exec(
		`UPDATE songs SET title = $1, artist = $2, metadata = $3 WHERE id = $4`,
		song.Title,
		song.Artist,
		metadataJSON,
		id,
	)
	if err != nil {
		return err
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func DeleteSong(id int) error {
	res, err := db.Exec(
		`DELETE FROM songs WHERE id = $1`, id,
	)
	if err != nil {
		return err
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}
