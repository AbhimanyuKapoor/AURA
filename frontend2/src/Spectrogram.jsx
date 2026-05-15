import { useEffect, useRef } from 'react';

/**
 * Spectrogram — scrolling frequency heatmap canvas.
 *
 * Props:
 *   mediaStream  – MediaStream | null  — live mic stream to analyse
 *   isActive     – boolean             — when false the canvas fades & animation stops
 *   className    – string              — extra Tailwind classes for the wrapper div
 *   height       – number (px)        — canvas container height (default 160)
 *   fftSize      – number             — analyser FFT size (default 512)
 *   scrollSpeed  – number (px/frame)  — how many pixels the waterfall scrolls (default 2)
 *   usefulBinRatio – 0..1             — fraction of bins to render (default 0.6)
 */
export default function Spectrogram({
  mediaStream,
  isActive = false,
  className = '',
  height = 160,
  fftSize = 512,
  scrollSpeed = 2,
  usefulBinRatio = 0.6,
}) {
  const wrapperRef  = useRef(null);
  const canvasRef   = useRef(null);
  const tempCanvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animIdRef   = useRef(null);

  // ── Draw loop ──────────────────────────────────────────────────────────────
  const drawFrame = () => {
    const canvas  = canvasRef.current;
    const temp    = tempCanvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !temp || !analyser) return;

    const ctx     = canvas.getContext('2d');
    const tCtx    = temp.getContext('2d');
    const data    = dataArrayRef.current;

    analyser.getByteFrequencyData(data);

    // 1. Snapshot current canvas → offscreen
    tCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);

    // 2. Paste back shifted left by scrollSpeed pixels
    ctx.drawImage(
      temp,
      0, 0, canvas.width, canvas.height,
      -scrollSpeed, 0, canvas.width, canvas.height,
    );

    // 3. Paint new column on the right edge
    const usefulBins = Math.floor(data.length * usefulBinRatio);
    const binHeight  = canvas.height / usefulBins;
    const rightEdge  = canvas.width - scrollSpeed;

    for (let i = 0; i < usefulBins; i++) {
      const value = data[i];

      // Aura heatmap: black → blue → cyan → yellow → red
      let r = 0, g = 0, b = 0;
      if (value < 64) {
        b = value * 4;
      } else if (value < 128) {
        b = 255;
        g = (value - 64) * 4;
      } else if (value < 192) {
        g = 255;
        b = 255 - (value - 128) * 4;
        r = (value - 128) * 4;
      } else {
        r = 255;
        g = 255 - (value - 192) * 4;
      }

      // silence matches panel background
      if (value === 0) { r = 24; g = 24; b = 27; }

      // invert Y so bass is at the bottom
      const y = canvas.height - i * binHeight - binHeight;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(rightEdge, y, scrollSpeed, binHeight);
    }

    animIdRef.current = requestAnimationFrame(drawFrame);
  };

  // ── Resize helper ──────────────────────────────────────────────────────────
  const syncSize = () => {
    const canvas = canvasRef.current;
    const temp   = tempCanvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !temp || !wrapper) return;
    const w = wrapper.offsetWidth;
    const h = wrapper.offsetHeight;
    canvas.width  = w;
    canvas.height = h;
    temp.width    = w;
    temp.height   = h;
    // fill background
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, w, h);
  };

  // ── Start / stop audio context ─────────────────────────────────────────────
  useEffect(() => {
    if (isActive && mediaStream) {
      // Tear down any previous context
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      cancelAnimationFrame(animIdRef.current);

      syncSize();

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser  = audioCtx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = 0.0; // raw instant data

      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      audioCtxRef.current  = audioCtx;
      analyserRef.current  = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      drawFrame();
    } else {
      cancelAnimationFrame(animIdRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
    }

    return () => {
      cancelAnimationFrame(animIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, mediaStream]);

  // ── Resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(syncSize);
    ro.observe(wrapper);
    syncSize();
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden rounded-xl bg-zinc-900/80 border border-white/[0.06] ${className}`}
      style={{ height }}
    >
      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Hidden offscreen buffer */}
      <canvas ref={tempCanvasRef} className="hidden" />

      {/* Overlay labels */}
      <div className="absolute top-2 left-3 flex items-center gap-2 pointer-events-none">
        <span className="text-[9px] font-mono uppercase tracking-widest text-white/20">
          Frequency
        </span>
        {isActive && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-ping" />
            <span className="text-[9px] font-mono text-white/40">LIVE</span>
          </span>
        )}
      </div>

      {/* Frequency axis ticks */}
      <div className="absolute right-0 inset-y-0 flex flex-col justify-between pointer-events-none pr-2 py-2">
        {['Hi', 'Mid', 'Lo'].map((label) => (
          <span key={label} className="text-[8px] font-mono text-white/15 leading-none">
            {label}
          </span>
        ))}
      </div>

      {/* Idle state overlay */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-mono text-white/20 tracking-widest uppercase">
            Inactive — start recording to see spectrogram
          </span>
        </div>
      )}
    </div>
  );
}
