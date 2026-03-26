import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Shuffle, Search, Loader2 } from 'lucide-react';

function WebRecorder({ isRecording, setIsRecording, micStream, setMicStream }) {
  const [searchText, setSearchText] = useState('Search');
  const [isClicked, setIsClicked] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const playbackRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    const setupAudio = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicStream(stream);
          const recorder = new MediaRecorder(stream);
          
          recorder.ondataavailable = (e) => {
            chunksRef.current.push(e.data);
          };
          
          recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'audio/mp3; codecs=opus' });
            setAudioBlob(blob);
            chunksRef.current = [];
            const audioURL = window.URL.createObjectURL(blob);
            if (playbackRef.current) playbackRef.current.src = audioURL;
          };
          
          recorderRef.current = recorder;
        } catch (err) {
          console.error(err);
        }
      }
    };
    setupAudio();
  }, []);

  const toggleMic = () => {
    if (!recorderRef.current) return;
    
    if (recorderRef.current.state === 'inactive') {
      recorderRef.current.start();
      setIsRecording(true);
    } else {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTestQuery = async () => {
    const randomIndex = Math.floor(Math.random() * 17); 
    try {
      // In Vite, dynamic imports of assets need URL
      const audioUrl = new URL(`./assets/${randomIndex}.mp3`, import.meta.url).href;
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      setAudioBlob(blob);
      const audioURL = window.URL.createObjectURL(blob);
      if (playbackRef.current) playbackRef.current.src = audioURL;
    } catch (e) {
      console.error(e);
    }
  };

  const handleButtonClick = async () => {
    if (!audioBlob) return;
    setIsClicked(true);
    setSearchText('Searching...');
    const formData = new FormData();
    formData.append('audioFile', audioBlob, 'recording.mp3');

    try {
      const url = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
      const response = await fetch(`${url}/upload`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });

      const jsonData = await response.json();
      setIsClicked(false);
      setSearchText('Search');
      navigate('/results', { state: { trackInfo: jsonData.tracks } });
    } catch (error) {
      console.error('Error:', error);
      setIsClicked(false);
      setSearchText('Search');
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
      <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-sm z-10">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent tracking-tight">
            Find your song
          </h1>
          <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[200px] mx-auto font-medium">
            Sing, hum, or play to search Astra DB.
          </p>
        </div>

        <div className="relative group perspective-1000">
          <div className={`absolute inset-0 bg-emerald-500/20 blur-xl rounded-full transition-opacity duration-500 ${isRecording ? 'opacity-100' : 'opacity-0'}`}></div>
          <button 
            onClick={toggleMic}
            className={`relative flex items-center justify-center w-20 h-20 rounded-full border border-zinc-700/50 shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isRecording 
                ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                : 'bg-zinc-900 border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
            }`}
          >
            {isRecording ? (
              <Square size={24} className="text-red-500 animate-pulse fill-red-500" />
            ) : (
              <Mic size={24} className="text-emerald-400" />
            )}
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 w-full pt-4">
          <audio 
            className="h-7 w-full max-w-[220px] rounded-full bg-zinc-900 shadow-inner border border-zinc-800/50 [&::-webkit-media-controls-panel]:bg-zinc-900 [&::-webkit-media-controls-play-button]:bg-zinc-700 [&::-webkit-media-controls-current-time-display]:text-zinc-400 [&::-webkit-media-controls-time-remaining-display]:text-zinc-400" 
            controls 
            ref={playbackRef}
          />
          
          <div className="flex items-center gap-3 w-full justify-center mt-2">
            <button 
              onClick={handleTestQuery}
              className="flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all hover:bg-emerald-500/5 active:scale-95"
            >
              <Shuffle size={12} strokeWidth={3} />
              <span>Random</span>
            </button>
            
            <button 
              onClick={handleButtonClick}
              disabled={!audioBlob || isClicked}
              className={`flex items-center justify-center gap-2 h-9 px-5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                audioBlob && !isClicked
                  ? 'bg-emerald-500 text-zinc-950 border border-emerald-400 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {isClicked ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} strokeWidth={3} />}
              <span>{searchText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WebRecorder;
