from flask import Flask, request, jsonify
import os
import numpy as np
import psycopg
from pgvector.psycopg import register_vector
from getEmbeds import generate_embedding
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
def get_db_connection():
    conn = psycopg.connect(os.environ["DATABASE_URL"], autocommit=True)
    register_vector(conn)
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


@app.route('/upload', methods=['POST'])
def upload():
    try:
        file = request.files['audioFile']
        temp_dir = '/tmp/h2s/flask-api/temp'

        # Ensure the file path exists
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)

        temp_audio_path = os.path.join(temp_dir, file.filename)
        file.save(temp_audio_path) # Save the uploaded mp3 audio to the temp directory

        emb = generate_embedding(temp_audio_path)
        emb_list = emb.tolist()
        
        # vector similiarity search
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT track, artist, album, album_image, track_url 
                    FROM songs 
                    ORDER BY embedding <=> %s::vector 
                    LIMIT 5
                """, (emb_list,))
                results = cur.fetchall()

        tracks = []
        for doc in results:
            tracks.append({
                'track': doc[0],
                'artist': doc[1],
                'album': doc[2],
                'album_image': doc[3],
                'track_url': doc[4]
            })

        print("Matching result:", tracks)  # Debugging statement

        os.remove(temp_audio_path)

        response = jsonify({'tracks':tracks})
        response.headers.add('Access-Control-Allow-Origin', '*')

        return response
    except Exception as e:
            return jsonify({"error uploading audio": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
    # port=8080 for google cloud run