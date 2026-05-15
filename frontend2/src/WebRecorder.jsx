import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Loader2, X, PanelBottomOpen, PanelBottomClose } from 'lucide-react';
import { BarVisualizer, useAudioVolume } from './components/ui/bar-visualizer';
import Spectrogram from './Spectrogram';

const GO_API_WS = import.meta.env.VITE_GO_WS_URL || 'ws://localhost:8080';

function WebRecorder({ isRecording, setIsRecording, micStream, setMicStream }) {
  const [statusText, setStatusText] = useState('Sing, hum, or play to search');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mimeType, setMimeType] = useState('audio/webm;codecs=opus');

  // Bottom panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [diagramIdx, setDiagramIdx] = useState(0);
  
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);

  const volume = useAudioVolume(isRecording ? micStream : null, { fftSize: 64, smoothingTimeConstant: 0.5 });
  const navigate = useNavigate();

  // Auto-scroll logs
  useEffect(() => {
    if (panelOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, panelOpen]);

  const addLog = useCallback((message, type = 'info') => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-200), { ts, message, type }]);
  }, []);

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
          addLog('Microphone stream acquired', 'success');

          const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/wav',
          ];
          const supportedType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
          setMimeType(supportedType);
          addLog(`Codec: ${supportedType || 'default'}`, 'info');

          const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : {});
          
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunksRef.current.push(e.data);
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(e.data);
                addLog(`Streamed chunk: ${e.data.size} bytes`, 'info');
              }
            }
          };
          
          recorder.onstop = () => {
            chunksRef.current = [];
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: "end" }));
              setIsProcessing(true);
              setStatusText('Recognizing...');
              addLog('Recording stopped, processing...', 'warn');
            } else {
              setStatusText('Connection lost. Try again.');
              setIsProcessing(false);
              addLog('WebSocket disconnected before stop', 'error');
            }
          };
          
          recorderRef.current = recorder;
        } catch (err) {
          console.error("Error setting up audio:", err);
          addLog(`Mic error: ${err.message}`, 'error');
        }
      }
    };
    setupAudio();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      setIsRecording(false);
      setIsProcessing(false);
    };
  }, [setMicStream, addLog, setIsRecording]);

  const toggleMic = () => {
    if (!recorderRef.current) {
       console.error("Recorder not initialized");
       addLog('Recorder not initialized', 'error');
       return;
    }
    
    if (recorderRef.current.state === 'inactive') {
      try {
        setIsProcessing(false);
        setStatusText("I'm listening, keep going");
        chunksRef.current = [];
        
        wsRef.current = new WebSocket(`${GO_API_WS}/ws/audio`);
        wsRef.current.onopen = () => {
          addLog('Connected to Go recognition engine', 'success');
        };
        
        wsRef.current.onmessage = (e) => {
          const d = JSON.parse(e.data);
          
          if (d.type === "log") {
            addLog(`[Pipeline] ${d.message}`, 'info');
            return;
          }

          if (d.type === "result") {
            if (d.error) {
              console.error("Recognition error:", d.error);
              setStatusText('Recognition failed. Try again.');
              setIsProcessing(false);
              addLog(`Recognition error: ${d.error}`, 'error');
            } else if (!d.found) {
              setStatusText('No match found. Try again.');
              setIsProcessing(false);
              addLog('No match found in database', 'warn');
            } else {
              const resultsArray = d.matches && d.matches.length > 0 
                ? d.matches.map(m => ({
                    track: m.title,
                    artist: m.artist,
                    confidence: Math.min((m.score * 5), 99.9).toFixed(1),
                    score: m.score
                  }))
                : [{
                    track: d.title,
                    artist: d.artist,
                    confidence: Math.min((d.score * 5), 99.9).toFixed(1),
                    score: d.score,
                  }];
              
              setIsProcessing(false);
              setIsRecording(false);
              if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                recorderRef.current.stop();
              }
              setStatusText('Match found!');
              addLog(`Match: ${d.title} by ${d.artist} (score: ${d.score})`, 'success');
              wsRef.current.close();
              navigate('/results', { state: { trackInfo: resultsArray } });
            }
            return;
          }
        };

        wsRef.current.onclose = () => {
          addLog('Engine connection closed', 'info');
        };

        wsRef.current.onerror = () => {
          setStatusText('Connection error. Is the backend running?');
          setIsProcessing(false);
          setIsRecording(false);
          addLog('WebSocket connection failed', 'error');
        };

        recorderRef.current.start(1000);
        setIsRecording(true);
        addLog('Recording started', 'success');
      } catch (err) {
        console.error("Failed to start MediaRecorder:", err);
        addLog(`Start failed: ${err.message}`, 'error');
      }
    } else {
      recorderRef.current.stop();
      setIsRecording(false);
      addLog('Recording stopped by user', 'info');
    }
  };

  const handleCancel = () => {
    if (wsRef.current) wsRef.current.close();
    setIsProcessing(false);
    setStatusText('Sing, hum, or play to search');
    addLog('Processing cancelled', 'warn');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 140 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 140 }}
      className="absolute inset-0 w-full h-full flex flex-col z-10"
    >
      {/* Top Area: Mic + Wave */}
      <div
        className="relative shrink-0 transition-all duration-500 ease-out"
        style={{ height: panelOpen ? '50%' : '100%' }}
      >
        {/* Bar visualizer background - always centered in this container */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-48 sm:h-64 z-0 pointer-events-none opacity-60">
          <BarVisualizer 
            state={isProcessing ? "thinking" : isRecording ? "speaking" : "listening"} 
            demo={!isRecording && !isProcessing} 
            mediaStream={micStream}
            barCount={75}
            sensitivity={1.5}
            centerAlign={true}
          />
        </div>

        {/* Mic button + text — absolute center, no layout dependencies */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 -mt-[70px]">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-xl font-bold bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent tracking-tight">
              {isRecording ? "Recording..." : isProcessing ? "Recognizing..." : "Find your song"}
            </h1>
            <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[200px] mx-auto font-medium">
              {statusText}
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
              onClick={isProcessing ? handleCancel : toggleMic}
              className={`relative flex items-center justify-center rounded-full border shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 bg-zinc-900 border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group/btn ${
                isRecording 
                  ? 'w-20 h-20'
                  : panelOpen ? 'w-28 h-28' : 'w-48 h-48'
              }`}
            >
              {isProcessing ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <Loader2 size={panelOpen ? 28 : 48} className="text-white animate-spin absolute group-hover/btn:opacity-0 transition-opacity" />
                  <X size={panelOpen ? 28 : 48} className="text-white opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </div>
              ) : isRecording ? (
                <Square size={20} className="text-red-500 animate-pulse fill-red-500" />
              ) : (
                <Mic size={panelOpen ? 28 : 48} className="text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Toggle button - pinned to bottom of top area */}
        <button
          onClick={() => setPanelOpen(prev => !prev)}
          className={`absolute bottom-3 left-2 z-20 flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 border backdrop-blur-xl ${
            panelOpen
              ? 'bg-white/10 text-white/70 border-white/10 hover:bg-white/15'
              : 'bg-zinc-900/80 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-600'
          }`}
        >
          {panelOpen ? <PanelBottomClose size={13} /> : <PanelBottomOpen size={13} />}
          {panelOpen ? 'Hide Panels' : 'Show Panels'}
        </button>
      </div>

      {/* Bottom Panel - 2 visible side-by-side at 50% height */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: '50%', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 28 }}
            className="relative z-10  bg-zinc-900/80 backdrop-blur-xl overflow-hidden shrink-0"
          >
            <div className="w-full h-full flex">

              {/* Spectrogram */}
              <div className="flex-1 flex flex-col border-r border-zinc-800/60 min-w-0">
                <div className="flex-1 min-h-0 p-2">
                  <Spectrogram
                    mediaStream={micStream}
                    isActive={isRecording}
                    height={9999}
                    fftSize={512}
                    scrollSpeed={2}
                    usefulBinRatio={0.6}
                    className="!h-full"
                  />
                </div>
              </div>

              {/* Logs */}
              <div className="flex-1 flex flex-col border-r border-zinc-800/60 min-w-0">
                <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs custom-scrollbar min-h-0">
                  {logs.length === 0 && (
                    <div className="flex items-center justify-center h-full text-zinc-700 text-xs text-center px-4">
                      No logs yet - start recording to see pipeline output
                    </div>
                  )}
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-[3px] hover:bg-white/[0.02] rounded px-1">
                      <span className="text-zinc-600 shrink-0 tabular-nums text-[11px]">{log.ts}</span>
                      <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-[5px] ${
                        log.type === 'error' ? 'bg-red-400 shadow-[0_0_4px_#f87171]' :
                        log.type === 'success' ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]' :
                        log.type === 'warn' ? 'bg-amber-400 shadow-[0_0_4px_#fbbf24]' :
                        'bg-zinc-600'
                      }`} />
                      <span className={`flex-1 break-all leading-snug ${
                        log.type === 'error' ? 'text-red-400/80' :
                        log.type === 'success' ? 'text-emerald-400/80' :
                        log.type === 'warn' ? 'text-amber-400/80' :
                        'text-zinc-400'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
                {logs.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-1.5 border-t border-zinc-800/40 shrink-0">
                    <span className="text-[10px] text-zinc-700 font-mono">{logs.length} entries</span>
                    <button 
                      onClick={() => setLogs([])} 
                      className="text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors font-mono"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default WebRecorder;
