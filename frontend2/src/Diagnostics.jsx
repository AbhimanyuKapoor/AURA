import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Wifi, WifiOff, RefreshCw, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GO_API = import.meta.env.VITE_GO_API_URL || 'http://localhost:8080';
const CHECK_INTERVAL = 5000;

function StatusPill({ label, url, status, latency }) {
  const isOnline = status === 'online';
  const isChecking = status === 'checking';

  return (
    <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Animated dot */}
        <div className="relative w-2.5 h-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${isChecking ? 'bg-zinc-600' : isOnline ? 'bg-white' : 'bg-zinc-600'}`} />
          {isOnline && (
            <div className="absolute inset-0 rounded-full bg-white/60 animate-ping" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs font-mono text-zinc-600">{url}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {latency !== null && (
          <span className="text-xs font-mono text-zinc-500">{latency}ms</span>
        )}
        <div className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border ${
          isChecking
            ? 'text-zinc-600 border-zinc-700/50 bg-zinc-800/40'
            : isOnline
            ? 'text-white border-white/20 bg-white/[0.07]'
            : 'text-zinc-500 border-zinc-700/50 bg-zinc-800/40'
        }`}>
          {isChecking ? (
            <RefreshCw size={10} className="animate-spin" />
          ) : isOnline ? (
            <Wifi size={10} />
          ) : (
            <WifiOff size={10} />
          )}
          {isChecking ? 'checking' : isOnline ? 'online' : 'offline'}
        </div>
      </div>
    </div>
  );
}

function Diagnostics() {
  const navigate = useNavigate();
  const [servers, setServers] = useState({
    go: { status: 'checking', latency: null },
  });
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev.slice(-100), { msg, type, time }]);
  };

  const checkServer = async (key, url, healthPath) => {
    const start = Date.now();
    try {
      const res = await fetch(`${url}${healthPath}`, { signal: AbortSignal.timeout(4000) });
      const latency = Date.now() - start;
      if (res.ok || res.status < 500) {
        setServers(prev => ({ ...prev, [key]: { status: 'online', latency } }));
        addLog(`[${key.toUpperCase()}] ✓ Healthy — ${latency}ms`, 'bright');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      setServers(prev => ({ ...prev, [key]: { status: 'offline', latency: null } }));
      addLog(`[${key.toUpperCase()}] ✗ Unreachable — ${err instanceof Error ? err.message : String(err)}`, 'muted');
    }
  };

  const runChecks = () => {
    setServers(prev => ({
      go: { ...prev.go, status: 'checking' },
    }));
    addLog('Running health checks...', 'dim');
    checkServer('go', GO_API, '/health');
  };

  useEffect(() => {
    runChecks();
    const interval = setInterval(runChecks, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const logColors = {
    info: 'text-zinc-400',
    bright: 'text-zinc-200',
    muted: 'text-zinc-600',
    dim: 'text-zinc-700',
  };

  const allOnline = servers.go.status === 'online';
  const anyOffline = servers.go.status === 'offline';

  return (
    <div className="flex flex-col items-center w-full min-h-screen pt-24 pb-32 px-4 relative z-10">
      <motion.div
        className="w-full max-w-2xl mt-4 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Diagnostics</h1>
            <p className="text-xs font-mono text-zinc-600 mt-1">Auto-refreshes every {CHECK_INTERVAL / 1000}s</p>
          </div>
          <div className={`flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-full border transition-all ${
            allOnline
              ? 'text-white border-white/20 bg-white/[0.07]'
              : anyOffline
              ? 'text-zinc-500 border-zinc-700/50 bg-zinc-800/40'
              : 'text-zinc-600 border-zinc-700/40 bg-zinc-800/30'
          }`}>
            <Activity size={12} className={allOnline ? 'animate-pulse' : ''} />
            {allOnline ? 'All Systems Operational' : anyOffline ? 'Degraded' : 'Checking...'}
          </div>
        </div>

        {/* Server pills */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Endpoints</span>
            <div className="h-px bg-white/[0.05] flex-1" />
            <button
              onClick={runChecks}
              className="text-xs font-mono text-zinc-600 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={10} /> Check now
            </button>
          </div>

          <StatusPill label="Go Recognition Engine" url={`${GO_API}/health`} status={servers.go.status} latency={servers.go.latency} />
        </div>

        {/* Terminal logs */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Terminal size={12} className="text-zinc-600" />
            <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Connection Logs</span>
            <div className="h-px bg-white/[0.05] flex-1" />
          </div>
          <div className="rounded-2xl bg-black/50 border border-white/[0.05] p-4 font-mono text-xs space-y-1.5 h-64 overflow-y-auto custom-scrollbar">
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3"
                >
                  <span className="text-zinc-700 shrink-0">{log.time}</span>
                  <span className={logColors[log.type] || 'text-zinc-500'}>{log.msg}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Diagnostics;
