import { useEffect, useRef } from "react";

/**
 * AudioVisualizer - Fluid Edge Glow Effect (Siri / Apple Intelligence style)
 * Accepts `stream` (MediaStream) to read audio data and renders a smooth
 * animated glowing border inside the container when recording.
 */
export default function AudioVisualizer({ isRecording, stream }) {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const volumeRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && stream) {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    } else {
      if (audioContextRef.current) audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, [isRecording, stream]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let isDrawing = true;

    const renderFrame = () => {
      if (!isDrawing) return;
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      const dpr = window.devicePixelRatio || 1;

      let rms = 0;
      const analyser = analyserRef.current;
      if (isRecordingRef.current && analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        for (let i = 0; i < bufferLength; i++) {
          const val = (dataArray[i] - 128) / 128.0;
          rms += val * val;
        }
        rms = Math.sqrt(rms / bufferLength);
      } else {
        // Subtle ambient pulsing when idle
        rms = Math.sin(Date.now() / 1500) * 0.03 + 0.02;
      }

      // Amplified and smoothed volume
      const rawRMS = Math.min(rms * 12.0, 2.5); // Higher cap for huge, punchy dynamic range
      volumeRef.current += (rawRMS - volumeRef.current) * 0.25; // Faster attack/release
      const vol = Math.max(0.05, volumeRef.current);

      timeRef.current += 0.005 + vol * 0.08; // Enormous pace increase when speaking
      const t = timeRef.current;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Draw fluid blobs along the edge Additively
      ctx.globalCompositeOperation = "screen";

      const perimeter = (w + h) * 2;
      const getPosOnPerimeter = (progress) => {
        const p = ((progress % 1.0) + 1.0) % 1.0;
        const dist = p * perimeter;
        if (dist < w) return { x: dist, y: 0 };
        if (dist < w + h) return { x: w, y: dist - w };
        if (dist < w * 2 + h) return { x: w - (dist - w - h), y: h };
        return { x: 0, y: h - (dist - w * 2 - h) };
      };

      const orbs = [
        { r: 59, g: 130, b: 246, speed: 0.2, offset: 0.0, sizeScale: 1.4 }, // Blue
        { r: 139, g: 92, b: 246, speed: -0.15, offset: 0.12, sizeScale: 1.6 }, // Violet
        { r: 236, g: 72, b: 153, speed: 0.25, offset: 0.25, sizeScale: 1.3 }, // Pink
        { r: 6, g: 182, b: 212, speed: -0.2, offset: 0.38, sizeScale: 1.5 }, // Cyan
        { r: 244, g: 63, b: 94, speed: 0.1, offset: 0.5, sizeScale: 1.4 }, // Rose
        { r: 168, g: 85, b: 247, speed: -0.3, offset: 0.62, sizeScale: 1.6 }, // Purple
        { r: 255, g: 255, b: 255, speed: 0.15, offset: 0.75, sizeScale: 1.3 }, // White
        { r: 245, g: 158, b: 11, speed: -0.25, offset: 0.88, sizeScale: 1.5 }, // Amber
      ];

      orbs.forEach((orb, index) => {
        const pos = getPosOnPerimeter(t * orb.speed + orb.offset);

        // Base size is increased to ensure colors overlap and fill the entire edge seamlessly
        const baseSize = Math.max(w, h) * 0.15;

        // Add organic randomness to the amplitude so each blob reacts differently
        const organicMultiplier = 1.0 + Math.sin(t * 5.0 + index * 2.0) * 0.5;

        // Pushes blob bounds drastically louder like earlier, but capped by screen mode from blowing out entirely
        const size = Math.max(
          0,
          baseSize * orb.sizeScale * (1 + vol * 2.5 * organicMultiplier),
        );

        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          pos.x,
          pos.y,
          0,
          pos.x,
          pos.y,
          size,
        );

        // At high volumes, the core gets brighter
        const alpha = Math.min(0.4 + vol * 0.5, 0.9).toFixed(2);

        gradient.addColorStop(
          0,
          `rgba(${orb.r}, ${orb.g}, ${orb.b}, ${alpha})`,
        );
        gradient.addColorStop(1, `rgba(${orb.r}, ${orb.g}, ${orb.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cut out the center of the canvas seamlessly, leaving only the glowing rim,
      // and blur the cutout so it fades softly toward the middle.
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();

      // Push the glow closer to the edge, but let it bleed in violently with loud volume
      const glowThickness = Math.max(0, (2 + vol * 35) * dpr);
      const cornerRadius = 32 * dpr;

      // Ensure we don't draw negative dimensions
      const rW = Math.max(0, w - glowThickness * 2);
      const rH = Math.max(0, h - glowThickness * 2);

      ctx.roundRect(glowThickness, glowThickness, rW, rH, cornerRadius);

      // The blur controls the softness of the edge boundary
      const blurAmount = (15 + vol * 15) * dpr;
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.fillStyle = "black";
      ctx.fill();

      // Reset filter for next frame
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
    };

    renderFrame();

    return () => {
      isDrawing = false;
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full transition-opacity duration-700 pointer-events-none z-0 ${
        isRecording ? "opacity-100 scale-100" : "opacity-[0.7] scale-100"
      }`}
    />
  );
}
