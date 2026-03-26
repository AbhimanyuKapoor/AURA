import requests
import pandas as pd
import os
import psycopg
from pgvector.psycopg import register_vector
from getEmbeds import generate_embedding

song_data = pd.read_csv('./song_data.csv')

# Setup DB Connection and create table
conn = psycopg.connect(os.environ["DATABASE_URL"], autocommit=True)
conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
register_vector(conn)
conn.execute("""
    CREATE TABLE IF NOT EXISTS songs (
        id SERIAL PRIMARY KEY,
        track TEXT,
        artist TEXT,
        album TEXT,
        release_date TEXT,
        album_image TEXT,
        track_url TEXT,
        embedding VECTOR(128)
    )
""")

temp_dir = 'temp'
os.makedirs(temp_dir, exist_ok=True)

for index, row in song_data.iterrows():
    track = row['Track Name']
    artist = row['Artist Name(s)']
    album = row['Album Name']
    release_date = row['Album Release Date']
    album_image = row['Album Image URL']
    track_url = row['Track Preview URL']

    # Download mp3 from track url
    response = requests.get(track_url)
    if response.status_code != 200:
        print(f"Skipping {track} - could not download")
        continue

    temp_audio_path = os.path.join(temp_dir, f"{index}.mp3")
    with open(temp_audio_path, 'wb') as f:
        f.write(response.content)

    # Generate embedding directly from the mp3 (no vocal separation needed)
    emb = generate_embedding(temp_audio_path)
    emb_list = emb.tolist()

    # Insert song with embedding into database
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO songs (track, artist, album, release_date, album_image, track_url, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (track, artist, album, release_date, album_image, track_url, emb_list))
        print(f"* Inserted {track} by {artist}")
    except Exception as e:
        print(f"Insert failed for {track}: {e}")

    os.remove(temp_audio_path)

conn.close()
print("Done!")
