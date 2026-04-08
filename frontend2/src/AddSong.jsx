import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Music, CheckCircle, XCircle, Loader2, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GO_API = import.meta.env.VITE_GO_API_URL || 'http://localhost:8080';

function AddSong() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { msg, type, time }]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      addLog(`File selected: ${dropped.name} (${(dropped.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      addLog(`File selected: ${selected.name} (${(selected.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setMessage('Title and audio file are required.');
      return;
    }

    setStatus('uploading');
    setMessage('');
    addLog(`Uploading "${title}" by "${artist || 'Unknown'}"...`, 'info');
    addLog(`POST ${GO_API}/songs/upload/stream`, 'dim');

    const formData = new FormData();
    formData.append('song', file);
    formData.append('title', title.trim());
    formData.append('artist', artist.trim());

    try {
      const res = await fetch(`${GO_API}/songs/upload/stream`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server responded with ${res.status}`);
      }

      if (!res.body) {
        throw new Error('Streaming not supported by browser.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const handleEvent = (evt) => {
        if (!evt || typeof evt !== 'object') return;

        if (evt.type === 'log' && evt.message) {
          addLog(evt.message, 'info');
          return;
        }

        if (evt.type === 'error') {
          addLog(`✗ ${evt.error || 'Unknown error'}`, 'muted');
          setStatus('error');
          setMessage(evt.error || 'Upload failed.');
          return;
        }

        if (evt.type === 'done') {
          addLog(`✓ Song ingested. ID: ${evt.song_id}`, 'success');
          setStatus('success');
          setMessage(`Song added! ID: ${evt.song_id}`);
          setTitle('');
          setArtist('');
          setFile(null);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            handleEvent(JSON.parse(trimmed));
          } catch {
            // non-JSON line, ignore
          }
        }
      }

      // Handle any remaining data in buffer
      const tail = buffer.trim();
      if (tail) {
        try {
          handleEvent(JSON.parse(tail));
        } catch {
          // ignore
        }
      }

      // If we got here without setting success, mark as done
      if (status === 'uploading') {
        setStatus('idle');
      }
    } catch (err) {
      addLog(`✗ Upload failed: ${err instanceof Error ? err.message : String(err)}`, 'muted');
      setStatus('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const logColors = {
    info: 'text-zinc-400',
    dim: 'text-zinc-600',
    success: 'text-zinc-200',
    muted: 'text-zinc-500',
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen pt-24 pb-32 px-4 relative z-10">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full flex items-center p-6 z-30">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all active:scale-95 backdrop-blur-sm"
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      <motion.div
        className="w-full max-w-2xl mt-4 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-black text-white tracking-tight mb-8">Ingest Audio to Database</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop Zone */}
          <motion.div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            animate={{ borderColor: dragging ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)' }}
            className="relative cursor-pointer rounded-2xl border-2 border-dashed bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-10 flex flex-col items-center justify-center gap-3 backdrop-blur-sm"
          >
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
            <AnimatePresence mode="wait">
              {file ? (
                <motion.div key="file" className="flex flex-col items-center gap-2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <Music size={32} className="text-white/60" />
                  <p className="text-white font-bold text-sm">{file.name}</p>
                  <p className="text-zinc-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </motion.div>
              ) : (
                <motion.div key="empty" className="flex flex-col items-center gap-2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <CloudUpload size={32} className="text-zinc-600" />
                  <p className="text-zinc-400 text-sm font-medium">Drop audio file here or <span className="text-white underline underline-offset-2">browse</span></p>
                  <p className="text-zinc-600 text-xs font-mono">MP3, WAV, FLAC, OGG supported</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Song Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter song title..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
            />
          </div>

          {/* Artist */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Artist <span className="text-zinc-700">(optional)</span></label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Enter artist name..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
            />
          </div>

          {/* Status message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
                  status === 'success'
                    ? 'bg-white/[0.06] text-zinc-200 border-white/10'
                    : 'bg-white/[0.03] text-zinc-400 border-white/[0.06]'
                }`}
              >
                {status === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} className="text-zinc-500" />}
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'uploading'}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-white text-zinc-950 hover:bg-zinc-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          >
            {status === 'uploading' ? (
              <><Loader2 size={16} className="animate-spin" /> Processing & Fingerprinting...</>
            ) : (
              <><Upload size={16} /> Upload & Fingerprint</>
            )}
          </button>
        </form>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="mt-6 rounded-xl bg-black/40 border border-white/[0.06] p-4 font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            <p className="text-zinc-600 uppercase tracking-widest mb-2 text-[10px]">Ingestion Logs</p>
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-zinc-700 shrink-0">{log.time}</span>
                <span className={logColors[log.type] || 'text-zinc-400'}>{log.msg}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default AddSong;
