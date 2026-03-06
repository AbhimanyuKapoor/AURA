package storage

import (
	"aura/env"
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

var db *sql.DB

func InitDB() (*sql.DB, error) {
	dbName := env.GetEnvString("DB_NAME", "aura")

	host := env.GetEnvString("DB_HOST", "localhost")
	port := env.GetEnvInt("DB_PORT", 5432)

	username := env.GetEnvString("DB_USERNAME", "aura_user")
	password := env.GetEnvString("DB_PASSWORD", "aura_pass")

	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		host, port, username, password, dbName,
	)

	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	if err = db.Ping(); err != nil {
		return nil, err
	}

	if err = createTables(); err != nil {
		return nil, err
	}

	return db, nil
}

func createTables() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS songs (
			id SERIAL PRIMARY KEY,
			title TEXT NOT NULL,
			artist TEXT,
			metadata JSONB,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS fingerprints (
			hash BIGINT NOT NULL,
			song_id INT NOT NULL,
			time_offset INT NOT NULL,
			FOREIGN KEY(song_id) 
			REFERENCES songs(id)
			ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS idx_fingerprint_hash
			ON fingerprints(hash);`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			return err
		}
	}

	return nil
}
