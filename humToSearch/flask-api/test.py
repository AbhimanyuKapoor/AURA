import os
import pyperclip
import numpy as np
from getEmbeds import generate_embedding

'''
You can run a custom SQL query using this embedding string in your pgvector database to test the similarity search.
For example: SELECT track, artist FROM songs ORDER BY embedding <=> '[...]' LIMIT 5;
'''

temp_audio_path = './hums/5.mp3' # Path to a test file
emb = generate_embedding(temp_audio_path)

emb_str = np.array2string(emb, separator=',', formatter={'float_kind':lambda x: "%.5f" % x}).replace(' ', '')
pyperclip.copy(emb_str)
print("Embedding copied to clipboard.")


    



