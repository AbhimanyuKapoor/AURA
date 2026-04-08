import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Activity, Layers, Waves, BarChart2, Info } from 'lucide-react';
import Spectrogram from './Spectrogram';
import { BarVisualizer } from './components/ui/bar-visualizer';

// ── helpers ──────────────────────────────────────────────────────────────────

function useAnimationLoop(callback, active) {
  const cbRef  = useRef(callback);
  const idRef  = useRef(null);

  useEffect(() => { cbRef.current = callback; }, [callback]);

  useEffect(() => {
    if (!active) { cancelAnimationFrame(idRef.current); return; }
    const loop = () => { cbRef.current(); idRef.current = requestAnimationFrame(loop); };
    idRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(idRef.current);
  }, [active]);
}

// ── sub-components ───────────────────────────────────────────────────────────

/**
 * OscilloscopeCanvas — time-domain waveform (green phosphor CRT style)
 */
function OscilloscopeCanvas({ analyser, isActive, height = 120 }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050708';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,255,80,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += W / 8) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = 'rgba(0,255,80,0.1)';
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    // Waveform
    ctx.strokeStyle = '#00e860';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00ff80';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    const sliceW = W / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0;
      const y = (v * H) / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [analyser]);

  // resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // idle static (flat line)
  useEffect(() => {
    if (isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width || canvas.offsetWidth;
    const H = canvas.height || canvas.offsetHeight;
    ctx.fillStyle = '#050708';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,255,80,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  }, [isActive]);

  useAnimationLoop(draw, isActive && !!analyser);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full rounded-lg"
      style={{ height, background: '#050708' }}
    />
  );
}

/**
 * FrequencyBarsCanvas — vertical frequency bars (custom color)
 */
function FrequencyBarsCanvas({ analyser, isActive, height = 140 }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#060709';
    ctx.fillRect(0, 0, W, H);

    const usefulBins = Math.floor(data.length * 0.7);
    const barW = W / usefulBins;

    for (let i = 0; i < usefulBins; i++) {
      const value = data[i];
      const barH  = (value / 255) * H;

      // Gradient per bar: bottom → top
      const grad = ctx.createLinearGradient(0, H, 0, H - barH);
      if (value < 80) {
        grad.addColorStop(0, '#1a3a8f');
        grad.addColorStop(1, '#4f8ef7');
      } else if (value < 160) {
        grad.addColorStop(0, '#0f6b5e');
        grad.addColorStop(1, '#00e5c0');
      } else {
        grad.addColorStop(0, '#7a1a6a');
        grad.addColorStop(1, '#f76fcc');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(i * barW, H - barH, barW - 1, barH);
    }
  }, [analyser]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useAnimationLoop(draw, isActive && !!analyser);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full rounded-lg"
      style={{ height, background: '#060709' }}
    />
  );
}

// ── stat badge ────────────────────────────────────────────────────────────────
function StatBadge({ label, value, unit }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">{label}</span>
      <span className="text-sm font-mono text-white">{value}<span className="text-zinc-500 text-xs ml-1">{unit}</span></span>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function Visualisation() {
  const [isRecording, setIsRecording]   = useState(false);
  const [micStream,   setMicStream]     = useState(null);
  const [analyser,    setAnalyser]      = useState(null);
  const [audioCtx,    setAudioCtx]      = useState(null);
  const [volume,      setVolume]        = useState(0);
  const [peakDb,      setPeakDb]        = useState(-Infinity);
  const [activeTab,   setActiveTab]     = useState('spectrogram'); // 'spectrogram' | 'oscilloscope' | 'bars'
  const [fftSize,     setFftSize]       = useState(512);

  const volFrameRef  = useRef(null);
  const analyserRef  = useRef(null);

  // ── volume meter ───────────────────────────────────────────────────────────
  const measureVolume = useCallback(() => {
    const a = analyserRef.current;
    if (!a) return;
    const data = new Uint8Array(a.frequencyBinCount);
    a.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length) / 255;
    setVolume(Math.round(rms * 100));
    const db = 20 * Math.log10(Math.max(rms, 1e-9));
    setPeakDb(prev => Math.max(prev, db));
  }, []);

  useAnimationLoop(measureVolume, isRecording);

  // ── start / stop mic ───────────────────────────────────────────────────────
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ac  = new (window.AudioContext || window.webkitAudioContext)();
      const an  = ac.createAnalyser();
      an.fftSize = fftSize;
      an.smoothingTimeConstant = 0.0;
      ac.createMediaStreamSource(stream).connect(an);

      setMicStream(stream);
      setAudioCtx(ac);
      setAnalyser(an);
      analyserRef.current = an;
      setPeakDb(-Infinity);
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied or unavailable.');
      console.error(err);
    }
  };

  const stopMic = () => {
    cancelAnimationFrame(volFrameRef.current);
    micStream?.getTracks().forEach(t => t.stop());
    audioCtx?.close();
    setMicStream(null);
    setAudioCtx(null);
    setAnalyser(null);
    analyserRef.current = null;
    setIsRecording(false);
    setVolume(0);
  };

  // re-create analyser when fftSize changes while recording
  useEffect(() => {
    if (!isRecording || !micStream || !audioCtx) return;
    const an = audioCtx.createAnalyser();
    an.fftSize = fftSize;
    an.smoothingTimeConstant = 0.0;
    audioCtx.createMediaStreamSource(micStream).connect(an);
    setAnalyser(an);
    analyserRef.current = an;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fftSize]);

  // cleanup on unmount
  useEffect(() => () => {
    micStream?.getTracks().forEach(t => t.stop());
    audioCtx?.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    { id: 'spectrogram',  label: 'Spectrogram',  icon: Layers },
    { id: 'oscilloscope', label: 'Oscilloscope', icon: Waves },
    { id: 'bars',         label: 'Freq Bars',    icon: BarChart2 },
  ];

  const fftOptions = [256, 512, 1024, 2048, 4096];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="min-h-screen w-full flex flex-col items-center pt-28 pb-24 px-4 relative z-10"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl mb-8 space-y-1">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-zinc-500" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Audio Analysis</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Visualisation</h1>
        <p className="text-xs text-zinc-500 font-mono">
          Real-time audio signal analysis — spectrogram, oscilloscope &amp; frequency spectrum
        </p>
      </div>

      {/* ── Controls row ────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl flex flex-wrap items-center gap-3 mb-6">
        {/* Mic toggle */}
        <button
          onClick={isRecording ? stopMic : startMic}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border transition-all active:scale-95 ${
            isRecording
              ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          {isRecording
            ? <><Square size={11} /> Stop</>
            : <><Mic    size={11} /> Start Mic</>}
        </button>

        {/* Recording pulse */}
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">Recording</span>
          </div>
        )}

        {/* FFT size selector */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">FFT</span>
          <select
            value={fftSize}
            onChange={e => setFftSize(Number(e.target.value))}
            className="bg-zinc-900 border border-white/[0.08] text-zinc-300 text-xs font-mono rounded-lg px-3 py-1.5 outline-none focus:border-white/20 cursor-pointer"
          >
            {fftOptions.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatBadge label="Volume"    value={volume}        unit="%" />
        <StatBadge label="Peak dB"   value={peakDb === -Infinity ? '—' : peakDb.toFixed(1)} unit="dB" />
        <StatBadge label="FFT Size"  value={fftSize}       unit="bins" />
        <StatBadge label="Freq Bins" value={Math.floor(fftSize / 2)} unit="bins" />
      </div>

      {/* ── Bar visualizer strip (always visible) ───────────────────────── */}
      <div className="w-full max-w-4xl mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">Live Spectrum — Bar View</span>
        </div>
        <div className="h-28 sm:h-36 px-2 pb-2">
          <BarVisualizer
            state={isRecording ? 'speaking' : 'listening'}
            demo={!isRecording}
            mediaStream={micStream}
            barCount={80}
            sensitivity={1.4}
            centerAlign={false}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* ── Tab selector ────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl flex gap-1 mb-4 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all ${
              activeTab === id
                ? 'bg-white text-zinc-950 shadow'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Icon size={11} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Visualiser panel ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-4xl"
        >
          {/* SPECTROGRAM */}
          {activeTab === 'spectrogram' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info size={10} className="text-zinc-700" />
                <span className="text-[9px] font-mono text-zinc-700">
                  Heatmap: dark-blue = quiet · cyan = moderate · yellow/red = loud · y-axis = frequency (lo→hi)
                </span>
              </div>
              <Spectrogram
                mediaStream={micStream}
                isActive={isRecording}
                height={220}
                fftSize={fftSize}
                scrollSpeed={2}
                usefulBinRatio={0.6}
                className="w-full"
              />
            </div>
          )}

          {/* OSCILLOSCOPE */}
          {activeTab === 'oscilloscope' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info size={10} className="text-zinc-700" />
                <span className="text-[9px] font-mono text-zinc-700">
                  Time-domain waveform — shows amplitude vs. time (green phosphor CRT style)
                </span>
              </div>
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <OscilloscopeCanvas analyser={analyser} isActive={isRecording} height={220} />
              </div>
            </div>
          )}

          {/* FREQUENCY BARS */}
          {activeTab === 'bars' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info size={10} className="text-zinc-700" />
                <span className="text-[9px] font-mono text-zinc-700">
                  Frequency-domain magnitude — blue = bass · teal = mid · pink = high
                </span>
              </div>
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <FrequencyBarsCanvas analyser={analyser} isActive={isRecording} height={220} />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom note ─────────────────────────────────────────────────── */}
      <p className="mt-10 text-[9px] font-mono text-zinc-700 text-center">
        Visualisation uses the Web Audio API · No audio is sent to any server from this page
      </p>
    </motion.div>
  );
}
