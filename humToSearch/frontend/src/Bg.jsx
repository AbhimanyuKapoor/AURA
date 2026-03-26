/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Activity, Settings2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState(1);
  const [smoothing, setSmoothing] = useState(0.05); // More smoothing by default
  const [horizontalZoom, setHorizontalZoom] = useState(4); // More stretch by default
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const smoothedDataRef = useRef<Float32Array | null>(null);

  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      setIsRecording(true);
      setError(null);
      draw();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsRecording(false);
  };

  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    if (!smoothedDataRef.current || smoothedDataRef.current.length !== bufferLength) {
      smoothedDataRef.current = new Float32Array(bufferLength).fill(128);
    }
    const smoothedData = smoothedDataRef.current;

    const renderFrame = () => {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      analyser.getByteTimeDomainData(dataArray);

      for (let i = 0; i < bufferLength; i++) {
        smoothedData[i] += (dataArray[i] - smoothedData[i]) * smoothing;
      }

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Waveform Wrapped Around a Rectangle coinciding with screen borders
      const rectWidth = canvas.width - 4;
      const rectHeight = canvas.height - 4;
      const radius = 20;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      const sideW = rectWidth - 2 * radius;
      const sideH = rectHeight - 2 * radius;
      const arcL = (Math.PI * 2 * radius) / 4;
      const totalPerimeter = 2 * sideW + 2 * sideH + 4 * arcL;

      const getPointOnRect = (t: number) => {
        let dist = t * totalPerimeter;
        if (dist < sideW) return { x: centerX - sideW / 2 + dist, y: centerY - rectHeight / 2, nx: 0, ny: 1 }; // Project INWARDS
        dist -= sideW;
        if (dist < arcL) {
          const angle = (dist / arcL) * (Math.PI / 2) - Math.PI / 2;
          return { x: centerX + sideW / 2 + Math.cos(angle) * radius, y: centerY - rectHeight / 2 + radius + Math.sin(angle) * radius, nx: -Math.cos(angle), ny: -Math.sin(angle) };
        }
        dist -= arcL;
        if (dist < sideH) return { x: centerX + rectWidth / 2, y: centerY - sideH / 2 + dist, nx: -1, ny: 0 };
        dist -= sideH;
        if (dist < arcL) {
          const angle = (dist / arcL) * (Math.PI / 2);
          return { x: centerX + sideW / 2 + Math.cos(angle) * radius, y: centerY + sideH / 2 + Math.sin(angle) * radius, nx: -Math.cos(angle), ny: -Math.sin(angle) };
        }
        dist -= arcL;
        if (dist < sideW) return { x: centerX + sideW / 2 - dist, y: centerY + rectHeight / 2, nx: 0, ny: -1 };
        dist -= sideW;
        if (dist < arcL) {
          const angle = (dist / arcL) * (Math.PI / 2) + Math.PI / 2;
          return { x: centerX - sideW / 2 + Math.cos(angle) * radius, y: centerY + sideH / 2 + Math.sin(angle) * radius, nx: -Math.cos(angle), ny: -Math.sin(angle) };
        }
        dist -= arcL;
        if (dist < sideH) return { x: centerX - rectWidth / 2, y: centerY + sideH / 2 - dist, nx: 1, ny: 0 };
        dist -= sideH;
        const angle = (dist / arcL) * (Math.PI / 2) + Math.PI;
        return { x: centerX - sideW / 2 + Math.cos(angle) * radius, y: centerY - sideH / 2 + Math.sin(angle) * radius, nx: -Math.cos(angle), ny: -Math.sin(angle) };
      };

      const scales = [1.0, 0.7, 0.4];
      const waveColor = 'rgb(8, 102, 182)'; // 100% Opacity
      const samplesToUse = Math.floor(bufferLength / horizontalZoom);

      // Light effect using additive blending
      ctx.globalCompositeOperation = 'lighter';

      scales.forEach((scale, index) => {
        const fillPath = new Path2D();
        for (let i = 0; i <= samplesToUse; i++) {
          const t = i / samplesToUse;
          const { x, y, nx, ny } = getPointOnRect(t % 1);
          const sampleIdx = i % bufferLength;
          const v = smoothedData[sampleIdx] / 128.0;
          // Use the current amplitude multiplier
          const amplitude = (v - 1) * sensitivity * scale * 15000; 
          const px = x + nx * amplitude;
          const py = y + ny * amplitude;
          if (i === 0) fillPath.moveTo(px, py);
          else fillPath.lineTo(px, py);
        }
        for (let i = samplesToUse; i >= 0; i--) {
          const t = i / samplesToUse;
          const { x, y } = getPointOnRect(t % 1);
          fillPath.lineTo(x, y);
        }
        fillPath.closePath();
        
        // Layer blur effect with specific values: 4px, 20px, 50px
        const blurs = [4, 50, 200];
        const blurValue = blurs[index] || 4;
        ctx.filter = `blur(${blurValue}px)`;
        
        ctx.fillStyle = waveColor;
        ctx.fill(fillPath);
      });

      // Reset context state
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';

      ctx.beginPath();
      ctx.roundRect(centerX - rectWidth / 2, centerY - rectHeight / 2, rectWidth, rectHeight, radius);
      ctx.strokeStyle = 'rgba(8, 102, 182, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    renderFrame();
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Floating Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Stretch</span>
          <input 
            type="range" min="1" max="20" step="0.1" 
            value={horizontalZoom} onChange={(e) => setHorizontalZoom(parseFloat(e.target.value))}
            className="w-32 accent-blue-500 h-1 rounded-full bg-zinc-800 appearance-none cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Inertia</span>
          <input 
            type="range" min="0.001" max="0.3" step="0.001" 
            value={smoothing} onChange={(e) => setSmoothing(parseFloat(e.target.value))}
            className="w-32 accent-blue-500 h-1 rounded-full bg-zinc-800 appearance-none cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Gain</span>
          <input 
            type="range" min="0.1" max="40" step="0.1" 
            value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="w-32 accent-blue-500 h-1 rounded-full bg-zinc-800 appearance-none cursor-pointer"
          />
        </div>

        <div className="h-8 w-px bg-white/10 mx-2" />

        <button 
          onClick={isRecording ? stopAudio : startAudio}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
            isRecording ? 'bg-red-500/20 text-red-500' : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
          }`}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50">
          <div className="p-8 bg-zinc-900 border border-white/10 rounded-3xl text-center">
            <p className="text-red-500 font-medium mb-4">{error}</p>
            <button onClick={startAudio} className="px-6 py-2 bg-blue-500 text-white rounded-xl">Retry</button>
          </div>
        </div>
      )}
    </div>
  );
}
