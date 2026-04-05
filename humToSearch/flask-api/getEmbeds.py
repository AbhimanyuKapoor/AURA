import numpy as np
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH
from basic_pitch.note_creation import model_output_to_notes

import subprocess
import tempfile

# Convert any audio format to WAV using ffmpeg so librosa can read it reliably
def convert_to_wav(audio_path: str) -> str:
    """Convert audio file to WAV format using ffmpeg. Returns path to temp WAV file."""
    tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    tmp.close()
    result = subprocess.run(
        ['ffmpeg', '-y', '-i', audio_path, '-ar', '22050', '-ac', '1', '-f', 'wav', tmp.name],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {result.stderr}")
    return tmp.name

# audio file to MIDI using the Basic Pitch model
# takes audio and predicts musical notes present
# takes model's output and creates MIDI formatted file
def audio_to_midi(audio_path: str):
    wav_path = convert_to_wav(audio_path)
    try:
        model_output, _, _ = predict(wav_path, ICASSP_2022_MODEL_PATH)
    finally:
        import os
        try:
            os.remove(wav_path)
        except Exception:
            pass

    midi, note_events = model_output_to_notes(
        output=model_output,
        onset_thresh=0.5,
        frame_thresh=0.3,
        infer_onsets=True,
        min_note_len=11,
        min_freq=1,
        max_freq=3500,
        include_pitch_bends=True,
        multiple_pitch_bends=False,
        melodia_trick=True,
        midi_tempo=120

    )
    return midi

# Extract notes from MIDI data, sorted by time
def get_pitch_vector(midi_data):
    all_notes = []
    for instrument in midi_data.instruments:
        all_notes.extend(instrument.notes)
    
    # Sort ALL notes from ALL instruments by start time
    sorted_notes = sorted(all_notes, key=lambda n: n.start)
    
    pitch_vector = [note.pitch for note in sorted_notes]
    return pitch_vector

# Convert absolute pitches to relative sequence
def pitches_to_relative(pitches):
    if not pitches:
        return []
    relative_sequence = []
    for i in range(1, len(pitches)):
        interval = pitches[i] - pitches[i-1]
        relative_sequence.append(int(interval))
    return relative_sequence

# Function to generate pitch sequence from audio file
def generate_embedding(temp_audio_path):
    print(f"[DEBUG getEmbeds] Starting generate_embedding for: {temp_audio_path}")
    try:
        midi_data = audio_to_midi(temp_audio_path)
        print(f"[DEBUG getEmbeds] audio_to_midi complete. Instruments found: {len(midi_data.instruments) if midi_data else 0}")
    except Exception as e:
        print(f"[DEBUG getEmbeds] FAILED during audio_to_midi: {e}")
        raise e

    try:
        pitches = get_pitch_vector(midi_data)
        print(f"[DEBUG getEmbeds] get_pitch_vector complete. Pitches count: {len(pitches)}")
    except Exception as e:
        print(f"[DEBUG getEmbeds] FAILED during get_pitch_vector: {e}")
        raise e

    try:
        rel_pitches = pitches_to_relative(pitches)
        print(f"[DEBUG getEmbeds] pitches_to_relative complete. Sequence length: {len(rel_pitches)}")
    except Exception as e:
        print(f"[DEBUG getEmbeds] FAILED during pitches_to_relative: {e}")
        raise e

    return rel_pitches