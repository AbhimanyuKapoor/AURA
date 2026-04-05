from flask import Flask, request, jsonify
import os
import numpy as np
import psycopg
import json
from fastdtw import fastdtw
from getEmbeds import generate_embedding
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
def get_db_connection():
    conn = psycopg.connect(os.environ["DATABASE_URL"], autocommit=True)
    return conn

@app.route('/', methods=['GET'])
def hello():
    return "Hello World!"

@app.route('/songs', methods=['GET'])
def output_songs():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT track, artist FROM songs")
                songs = cur.fetchall()
        
        song_list = [{'track': row[0], 'artist': row[1]} for row in songs]

        response = jsonify(song_list)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    except Exception as e:
        return jsonify({"error retrieving songs from Astra": str(e)}), 500


import traceback

@app.route('/upload', methods=['POST'])
def upload():
    temp_audio_path = None
    try:
        if 'audioFile' not in request.files:
            return jsonify({"error": "No audioFile part"}), 400
            
        file = request.files['audioFile']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        temp_dir = '/tmp/h2s/flask-api/temp'
        os.makedirs(temp_dir, exist_ok=True)

        temp_audio_path = os.path.join(temp_dir, file.filename)
        file.save(temp_audio_path)
        print(f"Saved file to {temp_audio_path}")

        try:
            hum_sequence = generate_embedding(temp_audio_path)
        except Exception as e:
            print(f"Embedding generation failed: {e}")
            traceback.print_exc()
            return jsonify({"error": f"Embedding generation failed: {str(e)}"}), 500
        
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT track, artist, album, album_image, track_url, pitch_sequence
                        FROM songs 
                    """)
                    all_songs = cur.fetchall()
                    print(f"[DEBUG server] Database query complete. Songs fetched: {len(all_songs)}")
        except Exception as e:
            print(f"Database query failed: {e}")
            traceback.print_exc()
            return jsonify({"error": f"Database search failed: {str(e)}"}), 500

        # Calculate DTW for all songs
        song_distances = []
        print("[DEBUG server] Starting DTW calculation loop...")
        for idx, doc in enumerate(all_songs):
            track = doc[0]
            artist = doc[1]
            album = doc[2]
            album_image = doc[3]
            track_url = doc[4]
            pitch_seq_json = doc[5]
            
            try:
                song_seq = pitch_seq_json if isinstance(pitch_seq_json, list) else json.loads(pitch_seq_json)
            except Exception as e:
                print(f"[DEBUG server] JSON parsing failed for song idx '{idx}': {e}")
                song_seq = []
            
            if not hum_sequence or not song_seq:
                distance = float('inf')
            else:
                try:
                    # Explicitly convert to flat lists of floats/ints to bypass strict numpy/scipy dimension validation
                    hum_flat = [float(x) for x in hum_sequence]
                    song_flat = [float(x) for x in song_seq]
                    distance, path = fastdtw(hum_flat, song_flat, dist=lambda a, b: abs(a - b))
                    # Normalize distance by path length to make scores comparable across different song lengths
                    score = distance / len(path) if path else float('inf')
                except Exception as e:
                    print(f"Error calculating DTW for '{track}': {e}")
                    score = float('inf')
            
            song_distances.append({
                'track': track,
                'artist': artist,
                'album': album,
                'album_image': album_image,
                'track_url': track_url,
                'score': score
            })
            
        # Sort by lowest normalized score (better match)
        song_distances.sort(key=lambda x: x['score'])
        top_songs = song_distances[:5]
        
        tracks = []
        for doc in top_songs:
            tracks.append({
                'track': doc['track'],
                'artist': doc['artist'],
                'album': doc['album'],
                'album_image': doc['album_image'],
                'track_url': doc['track_url'],
                'match_score': round(doc['score'], 2)
            })

        print("Matching result:", tracks)

        return jsonify({'tracks': tracks})
    except Exception as e:
        print(f"Unexpected error in /upload: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except Exception as e:
                print(f"Failed to remove temp file: {e}")


if __name__ == "__main__":
    app.run(debug=True)
    # port=8080 for google cloud run