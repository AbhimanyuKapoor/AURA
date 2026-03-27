import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mic, Square, Shuffle, Search, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { BarVisualizer, useAudioVolume } from './components/ui/bar-visualizer';

function WebRecorder({ isRecording, setIsRecording, micStream, setMicStream }) {
  const [searchText, setSearchText] = useState('Search');
  const [isClicked, setIsClicked] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const playbackRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const volume = useAudioVolume(isRecording ? micStream : null, { fftSize: 64, smoothingTimeConstant: 0.5 });
  const navigate = useNavigate();

  const handleSearch = useCallback(async (blobToSearch) => {
    const blob = blobToSearch || audioBlob;
    if (!blob) return;
    
    setIsClicked(true);
    setSearchText('Searching...');
    const formData = new FormData();
    formData.append('audioFile', blob, 'recording.mp3');

    try {
      const url = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
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
  }, [audioBlob, navigate]);

  useEffect(() => {
    const setupAudio = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            }
          });
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
            
            // Auto-trigger search when recording stops
            handleSearch(blob);
          };
          
          recorderRef.current = recorder;
        } catch (err) {
          console.error(err);
        }
      }
    };
    setupAudio();
  }, [handleSearch, setMicStream]);

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



  return (
    <motion.div 
      initial={{ opacity: 0, y: 140 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 140 }}
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center relative z-10 transition-colors"
    >
      
      {/* Full-width visualizer background */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-48 sm:h-64 z-0 pointer-events-none opacity-60">
        <BarVisualizer 
          state={isClicked ? "thinking" : isRecording ? "speaking" : "listening"} 
          demo={!isRecording && !isClicked} 
          mediaStream={micStream}
          barCount={75}
          sensitivity={1.5}
          centerAlign={true}
        />
      </div>

      <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-sm z-10  p-8 rounded-3xl ">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent tracking-tight">
            {isRecording ? "Recording..." : isClicked ? "Searching..." : "Find your song"}
          </h1>
          <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[200px] mx-auto font-medium">
            {isRecording ? "I'm listening, keep going" : isClicked ? "Almost there..." : "Sing, hum, or play to search"}
          </p>
        </div>

        <div className="relative group perspective-1000">
          <div 
            className={`absolute inset-0 blur-xl rounded-full transition-all duration-[75ms] ease-out ${isRecording ? 'opacity-100' : 'opacity-0'}`}
            style={{
              transform: `scale(${1 + (volume || 0) * 1.8})`,
              opacity: isRecording ? Math.min(1, 0.4 + (volume || 0) * 3) : 0
            }}
          ></div>
          <button 
            onClick={toggleMic}
            className={`relative flex items-center justify-center rounded-full border border-zinc-700/50 shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 bg-zinc-900 border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${
             
              isRecording 
                ? 'w-20 h-20 my-24'
                : 'w-48 h-48 '
            }`}
          >
            {isRecording ? (
              <Square size={20} className="text-red-500 animate-pulse fill-red-500" />
            ) : (
              <Mic size={48} className="text-white" />
            )}
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 w-full pt-4">
          { (
            <audio 
              className={ `h-7 w-full max-w-[220px] rounded-full bg-zinc-900 shadow-inner border border-zinc-800/50 [&::-webkit-media-controls-panel]:bg-zinc-900 [&::-webkit-media-controls-play-button]:bg-zinc-700 [&::-webkit-media-controls-current-time-display]:text-zinc-400 [&::-webkit-media-controls-time-remaining-display]:text-zinc-400 ${showPreview ? 'opacity-1' : 'opacity-0'}`} 
              controls 
              ref={playbackRef}
            />
          )}
          
          <div className="grid grid-cols-[1fr_auto_1fr] items-center  w-full mt-2 min-h-[44px]">
            <div className="flex justify-end pr-3 border-r border-zinc-800/10">
              <div className="flex items-center">
                <button 
                  onClick={handleTestQuery}
                  className="flex items-center justify-center gap-2 h-9 px-4 rounded-l-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white hover:border-white/30 transition-all hover:bg-white/5 active:scale-95 border-r-0"
                >
                  <Shuffle size={12} strokeWidth={3} />
                  <span>Random</span>
                </button>
                <button 
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center justify-center h-9 w-9 rounded-r-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all active:scale-90 hover:bg-white/5"
                  title={showPreview ? "Hide Preview" : "Show Preview"}
                >
                  {showPreview ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>
            
            <div className="w-0" /> {/* Center point */}
            
            <div className="flex justify-start pl-3 border-l border-zinc-800/10">
              <button 
                onClick={() => handleSearch()}
                disabled={!audioBlob || isClicked}
                className={`flex items-center justify-center gap-2 h-9 px-5 rounded-full text-xs font-semibold transition-all active:scale-95 min-w-[100px] ${
                  audioBlob && !isClicked
                    ? 'bg-zinc-100 text-zinc-900 border border-white hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
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
    </motion.div>
  );
}

export default WebRecorder;
