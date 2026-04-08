import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Music2, Disc3, RefreshCw, Trash2, Plus, Upload, Music, CheckCircle, XCircle, Loader2, CloudUpload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GO_API = import.meta.env.VITE_GO_API_URL || 'http://localhost:8080';

function AddSongDialog({ open, onClose, onSongAdded }) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { msg, type, time }]);
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setArtist('');
    setStatus('idle');
    setMessage('');
    setLogs([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
          if (onSongAdded) onSongAdded();
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
          try { handleEvent(JSON.parse(trimmed)); } catch {}
        }
      }

      const tail = buffer.trim();
      if (tail) {
        try { handleEvent(JSON.parse(tail)); } catch {}
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

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
            className="bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-lg pointer-events-auto"
            >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white tracking-tight">Ingest Audio</h2>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`cursor-pointer rounded-xl border-2 border-dashed bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-8 flex flex-col items-center justify-center gap-2 ${
                    dragging ? 'border-white/25' : 'border-white/[0.07]'
                  }`}
                >
                  <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
                  {file ? (
                    <div className="flex flex-col items-center gap-1">
                      <Music size={24} className="text-white/60" />
                      <p className="text-white font-bold text-sm">{file.name}</p>
                      <p className="text-zinc-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <CloudUpload size={24} className="text-zinc-600" />
                      <p className="text-zinc-400 text-sm font-medium">Drop audio file or <span className="text-white underline underline-offset-2">browse</span></p>
                      <p className="text-zinc-600 text-xs font-mono">MP3, WAV, FLAC, OGG</p>
                    </div>
                  )}
                </div>

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
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-white text-zinc-950 hover:bg-zinc-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                >
                  {status === 'uploading' ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing &amp; Fingerprinting...</>
                  ) : (
                    <><Upload size={16} /> Upload &amp; Fingerprint</>
                  )}
                </button>
              </form>

              {/* Logs */}
              {logs.length > 0 && (
                <div className="mt-4 rounded-xl bg-black/40 border border-white/[0.06] p-3 font-mono text-[10px] space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                  <p className="text-zinc-600 uppercase tracking-widest mb-1.5 text-[9px]">Ingestion Logs</p>
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-zinc-700 shrink-0">{log.time}</span>
                      <span className={logColors[log.type] || 'text-zinc-400'}>{log.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function SongList() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${GO_API}/songs`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setSongs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${GO_API}/songs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSongs(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = songs.filter(s =>
    s.title?.toLowerCase().includes(query.toLowerCase()) ||
    s.artist?.toLowerCase().includes(query.toLowerCase())
  );

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
        className="w-full max-w-2xl mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight">Song Library</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddDialogOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-100 transition-colors px-4 py-2 rounded-lg active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <Plus size={14} />
              Add Song
            </button>
            <button
              onClick={fetchSongs}
              className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or artist..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
          />
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-zinc-600"
            >
              <RefreshCw size={24} className="animate-spin mb-3" />
              <p className="text-xs font-mono uppercase tracking-widest">Fetching database...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-zinc-500 gap-3"
            >
              <p className="text-sm">{error}</p>
              <button onClick={fetchSongs} className="text-xs text-zinc-600 hover:text-white underline underline-offset-2">Retry</button>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-zinc-600 gap-3"
            >
              <Music2 size={32} />
              <p className="text-xs font-mono uppercase tracking-widest">
                {query ? 'No songs match your search' : 'No songs in database yet'}
              </p>
              {!query && (
                <button
                  onClick={() => setAddDialogOpen(true)}
                  className="mt-2 text-xs text-white border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Add the first song →
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-4 px-1">
                <Disc3 size={12} className="text-zinc-600" />
                <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">{filtered.length} track{filtered.length !== 1 ? 's' : ''}</span>
                <div className="h-px bg-white/5 flex-1" />
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                {filtered.map((song, i) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.04] border-b border-white/[0.05] last:border-0 transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Music2 size={14} className="text-zinc-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate transition-colors">{song.title}</p>
                        <p className="text-xs text-zinc-600 group-hover:text-zinc-400 truncate mt-0.5 transition-colors">{song.artist || 'Unknown Artist'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-[10px] font-mono text-zinc-700 group-hover:text-zinc-500 transition-colors">ID #{song.id}</span>
                      <button
                        onClick={() => handleDelete(song.id)}
                        disabled={deletingId === song.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-600 hover:text-zinc-300 transition-all"
                        title="Delete song"
                      >
                        {deletingId === song.id
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <Trash2 size={12} />
                        }
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Add Song Dialog */}
      <AddSongDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSongAdded={fetchSongs}
      />
    </div>
  );
}

export default SongList;
