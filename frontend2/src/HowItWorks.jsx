"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, Info } from "lucide-react";

// Clean Indigo Theme
const THEME = {
  bg: '#1D1C1C',
  primary: '#7C93FB',
  glow: 'drop-shadow(0 0 20px rgba(124, 147, 251, 1))',
  whiteGlow: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.8))',
  gridLine: 'rgba(255,255,255,0.05)',
  accent: '#A5B4FC',
  danger: '#FCA5A5'
};

// ---------------------------------------------------------
// REUSABLE COMPONENTS — shadcn-inspired minimal design
// ---------------------------------------------------------

const GridBg = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
    <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke={THEME.gridLine} strokeWidth="1" />
    </pattern>
    <rect width="100%" height="100%" fill="url(#gridPattern)" />
  </svg>
);

const DetailedAxis = ({ x, width, height, titleX, titleY }) => (
  <>
    {/* Y Axis */}
    <line x1={x} y1="20" x2={x} y2={height - 20} stroke="white" strokeWidth="2" opacity="0.4" />
    {Array.from({length: 10}).map((_,i) => (
      <line key={`y-${i}`} x1={x-5} y1={20 + (height-40)*(i/9)} x2={x+5} y2={20 + (height-40)*(i/9)} stroke="white" strokeWidth="1" opacity="0.4" />
    ))}
    <text x={x-20} y={height/2} fill="white" fontSize="11" fontWeight="500" opacity="0.5" fontFamily="Inter, system-ui, sans-serif" transform={`rotate(-90 ${x-20} ${height/2})`} textAnchor="middle">{titleY}</text>

    {/* X Axis */}
    <line x1={x} y1={height - 20} x2={width - 20} y2={height - 20} stroke="white" strokeWidth="2" opacity="0.4" />
    {Array.from({length: 20}).map((_,i) => (
      <line key={`x-${i}`} x1={x + (width-x-20)*(i/19)} y1={height-25} x2={x + (width-x-20)*(i/19)} y2={height-15} stroke="white" strokeWidth="1" opacity="0.4" />
    ))}
    <text x={x + (width-x)/2} y={height + 15} fill="white" fontSize="11" fontWeight="500" opacity="0.5" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{titleX}</text>
  </>
);

// Shadcn-style Badge — clean, minimal, pill-shaped
const Badge = ({ x, y, title, value, color=THEME.primary, delay=0 }) => (
  <motion.foreignObject x={x} y={y} width="240" height="72" className="overflow-visible pointer-events-none" initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{delay, duration:0.4}}>
    <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-3.5 py-2.5 shadow-sm" >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{title}</div>
      <div className="text-[13px] text-zinc-100 mt-0.5 whitespace-nowrap font-medium leading-snug">{value}</div>
    </div>
  </motion.foreignObject>
);

// Math equation block — rendered with proper italic and Unicode
const MathBlock = ({ x, y, children, delay=0 }) => (
  <motion.foreignObject x={x} y={y} width="380" height="56" className="overflow-visible pointer-events-none" initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} transition={{delay, duration:0.4}}>
    <div className="inline-flex items-center gap-2 bg-zinc-900 backdrop-blur-sm border border-zinc-700/40 rounded-md px-4 py-2 shadow-sm" s>
      <span className="text-[18px] text-[#A5B4FC] leading-snug" style={{fontFamily: "'Cambria Math', 'Latin Modern Math', 'STIX Two Math', Georgia, serif", fontStyle: 'italic', letterSpacing: '0.03em'}}>
        {children}
      </span>
    </div>
  </motion.foreignObject>
);

const ScannerLine = ({ active, width, height }) => (
  <motion.line x1="100" y1="0" x2="100" y2={height} stroke={THEME.primary} strokeWidth="3" style={{filter: THEME.glow}} strokeDasharray="5 5" initial={{x:0}} animate={active ? {x: width-150} : {}} transition={{duration:4, repeat:Infinity, ease:"linear"}} />
);

// ---------------------------------------------------------
// VISUALIZATION COMPONENTS
// ---------------------------------------------------------

const WaveformVisual = ({ active }) => (
  <div className="w-full h-full relative p-6 flex flex-col gap-3 overflow-hidden">
    <GridBg />

    {/* ── Stage 1: Raw Stereo Input ── */}
    <motion.div
      initial={{opacity:0, y:10}} animate={active?{opacity:1, y:0}:{}}
      transition={{delay:0.2}}
      className="relative z-10 flex-[2] bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 flex flex-col gap-1 min-h-0"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Stage 1 — Raw Stereo Input</span>
        <span className="text-[9px] text-zinc-600 font-mono">44,100 Hz · 16-bit · 2ch</span>
      </div>
      <svg className="flex-1 w-full" viewBox="0 0 800 120" preserveAspectRatio="xMidYMid meet">
        {/* Left channel */}
        <text x="5" y="25" fill="#F87171" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">L</text>
        <motion.path
          d={`M 20,30 ${Array.from({length:160}).map((_,i)=>`L ${20+i*4.8},${30 + Math.sin(i*0.15)*18 + Math.sin(i*0.7)*8 + Math.cos(i*0.3)*5}`).join(' ')}`}
          fill="none" stroke="#F87171" strokeWidth="1.5" opacity="0.6"
          initial={{pathLength:0}} animate={active?{pathLength:1}:{}}
          transition={{duration:1.5, delay:0.3}}
        />
        {/* Right channel */}
        <text x="5" y="85" fill="#60A5FA" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">R</text>
        <motion.path
          d={`M 20,90 ${Array.from({length:160}).map((_,i)=>`L ${20+i*4.8},${90 + Math.cos(i*0.12)*16 + Math.sin(i*0.65)*10 + Math.cos(i*0.25)*4}`).join(' ')}`}
          fill="none" stroke="#60A5FA" strokeWidth="1.5" opacity="0.6"
          initial={{pathLength:0}} animate={active?{pathLength:1}:{}}
          transition={{duration:1.5, delay:0.5}}
        />
        {/* Amplitude envelope guides */}
        <line x1="20" y1="60" x2="790" y2="60" stroke="white" strokeWidth="0.3" opacity="0.15" strokeDasharray="2 4" />
      </svg>
    </motion.div>

    {/* ── Flow Arrow with Processing Label ── */}
    <motion.div
      initial={{opacity:0}} animate={active?{opacity:1}:{}}
      transition={{delay:1.2}}
      className="relative z-10 flex items-center justify-center gap-4 shrink-0"
    >
      <div className="flex-1 h-px bg-zinc-700" />
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-md px-4 py-1.5">
        <span className="text-[9px] text-zinc-400">Stereo → Mono Mix</span>
        <span className="text-[10px] text-zinc-600">·</span>
        <span className="text-[9px] text-zinc-400">Peak Normalize</span>
        <span className="text-[10px] text-zinc-600">·</span>
        <span className="text-[9px] text-zinc-400">Lowpass @ 5.5 kHz</span>
        <span className="text-[10px] text-zinc-600">·</span>
        <span className="text-[9px] text-zinc-400">Decimate ÷4</span>
      </div>
      <div className="flex-1 h-px bg-zinc-700" />
    </motion.div>

    {/* ── Stage 2: Processed Mono Output ── */}
    <motion.div
      initial={{opacity:0, y:10}} animate={active?{opacity:1, y:0}:{}}
      transition={{delay:1.5}}
      className="relative z-10 flex-[2] bg-zinc-900/60 border border-[#7C93FB]/30 rounded-lg p-4 flex flex-col gap-1 min-h-0"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7C93FB]">Stage 2 — Normalized Mono Output</span>
        <span className="text-[9px] text-zinc-600 font-mono">11,025 Hz · 16-bit · 1ch</span>
      </div>
      <svg className="flex-1 w-full" viewBox="0 0 800 100" preserveAspectRatio="xMidYMid meet">
        {/* Normalized mono */}
        <motion.path
          d={`M 20,50 ${Array.from({length:160}).map((_,i)=>`L ${20+i*4.8},${50 + Math.sin(i*0.08)*32*Math.cos(i*0.04) + Math.sin(i*0.3)*8}`).join(' ')}`}
          fill="none" stroke={THEME.primary} strokeWidth="2.5" strokeLinecap="round"
          style={{filter: THEME.glow}}
          initial={{pathLength:0, opacity:0}} animate={active?{pathLength:1, opacity:1}:{}}
          transition={{duration:2, delay:1.8}}
        />
        {/* Peak normalization guides at ±1.0 */}
        <motion.line x1="20" y1="18" x2="790" y2="18" stroke={THEME.danger} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" initial={{opacity:0}} animate={active?{opacity:0.4}:{}} transition={{delay:2.2}} />
        <motion.line x1="20" y1="82" x2="790" y2="82" stroke={THEME.danger} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" initial={{opacity:0}} animate={active?{opacity:0.4}:{}} transition={{delay:2.2}} />
        <motion.text x="795" y="21" fill={THEME.danger} fontSize="7" opacity="0.6" fontFamily="Inter, sans-serif" initial={{opacity:0}} animate={active?{opacity:0.6}:{}} transition={{delay:2.3}}>+1.0</motion.text>
        <motion.text x="795" y="85" fill={THEME.danger} fontSize="7" opacity="0.6" fontFamily="Inter, sans-serif" initial={{opacity:0}} animate={active?{opacity:0.6}:{}} transition={{delay:2.3}}>−1.0</motion.text>
        {/* Zero line */}
        <line x1="20" y1="50" x2="790" y2="50" stroke="white" strokeWidth="0.3" opacity="0.15" strokeDasharray="2 4" />
      </svg>
    </motion.div>

    {/* ── Bottom: Key Metrics ── */}
    <motion.div
      initial={{opacity:0}} animate={active?{opacity:1}:{}}
      transition={{delay:2.5}}
      className="relative z-10 flex items-center gap-3 shrink-0"
    >
      {[
        { label: 'Mono Mix', formula: 'x[n] = ½·L[n] + ½·R[n]' },
        { label: 'Normalization', formula: 'x̂[n] = x[n] / max(|x|)' },
        { label: 'Antialiasing', formula: 'LPF cutoff = 5,512 Hz' },
        { label: 'Decimation', formula: '44,100 ÷ 4 = 11,025 Hz' },
      ].map((m, i) => (
        <div key={i} className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-md px-3 py-2">
          <div className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider">{m.label}</div>
          <div className="text-[11px] text-zinc-300 mt-0.5 font-medium" style={{fontFamily: "'Cambria Math', Georgia, serif", fontStyle:'italic'}}>{m.formula}</div>
        </div>
      ))}
    </motion.div>
  </div>
);

const FrameSegmentationVisual = ({ active }) => (
  <div className="w-full h-full relative p-12">
    <GridBg />
    <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 600">
      <DetailedAxis x={60} width={1000} height={500} titleX="Sample index (n) →" titleY="Window amplitude →" />
      
      <MathBlock x={100} y={40} delay={0.5}>w[n] = 0.54 − 0.46 · cos(2πn / N)</MathBlock>

      <Badge x={700} y={60} title="Frame Size" value="N = 2048 samples ≈ 186 ms" delay={1.0} />
      <Badge x={700} y={150} title="Hop Size" value="H = 512 samples (75% overlap)" delay={1.5} />

      {/* Frame Overlaps */}
      {Array.from({ length: 10 }).map((_, i) => (
        <g key={i}>
           <motion.path 
              d={`M ${80 + i*80},480 Q ${80 + i*80 + 80},50 ${80 + i*80 + 160},480`}
              fill={i===4 ? "rgba(124,147,251,0.2)" : "rgba(255,255,255,0.05)"}
              stroke={i===4 ? THEME.primary : "rgba(255,255,255,0.2)"}
              strokeWidth={i===4 ? 4 : 2}
              style={{ filter: i===4 ? THEME.glow : 'none' }}
              initial={{ scaleY: 0 }} animate={active ? { scaleY: 1 } : {}} transition={{ delay: i*0.1, type:"spring", bounce:0.5 }} transform={`translate(0, 0) scale(1, 1)`} transformOrigin="0 480"
           />
           <motion.line x1={80 + i*80} y1="480" x2={80 + i*80} y2="100" stroke={i===4 ? THEME.primary : "white"} strokeDasharray="5 5" opacity={i===4? 1 : 0.2} initial={{opacity:0}} animate={{opacity:0.5}} transition={{delay: i*0.1}} />
           
           {i === 4 && active && (
             <motion.text x={80 + i*80 + 80} y="30" fill={THEME.primary} fontSize="14" fontWeight="600" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle" style={{filter: THEME.glow}}>Current Frame</motion.text>
           )}
        </g>
      ))}

      {/* Measurement Bracket for overlap */}
      <motion.path d="M 400,520 L 400,530 L 480,530 L 480,520" fill="none" stroke={THEME.accent} strokeWidth="2" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:2.5}} />
      <motion.text x="440" y="555" fill={THEME.accent} fontSize="12" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:2.5}}>Hop (512)</motion.text>
    </svg>
  </div>
);

const SpectrogramVisual = ({ active }) => {
  // Generate deterministic spectrogram data: 80 time frames × 40 frequency bins
  const numCols = 80; // time frames
  const numRows = 40; // frequency bins (0 = low freq, 39 = high freq)
  
  const spectroData = Array.from({length: numRows}, (_, row) => 
    Array.from({length: numCols}, (_, col) => {
      // Base noise
      let val = 0.05 + ((col * 7 + row * 3 + 11) % 17) * 0.01;
      
      // Harmonic bands — simulating 3 harmonics of a melody
      const fundamental = 8 + Math.sin(col * 0.15) * 3;
      const harmonic2 = 16 + Math.sin(col * 0.15) * 3;
      const harmonic3 = 24 + Math.sin(col * 0.15) * 3;
      
      const distF = Math.abs(row - fundamental);
      const distH2 = Math.abs(row - harmonic2);
      const distH3 = Math.abs(row - harmonic3);
      
      if (distF < 1.5) val = 0.9 - distF * 0.3;
      else if (distH2 < 1.5) val = 0.65 - distH2 * 0.2;
      else if (distH3 < 1.5) val = 0.45 - distH3 * 0.15;
      
      // Percussive transients — vertical bright bands
      if ([10, 30, 50, 70].includes(col)) val = Math.max(val, 0.3 + row * 0.005);
      
      return Math.min(1, Math.max(0, val));
    })
  );

  // Color mapping: black → deep blue → primary → white
  const valToColor = (v) => {
    if (v < 0.15) return `rgba(20, 20, 30, 1)`;
    if (v < 0.3) return `rgba(40, 50, ${Math.round(80 + v * 200)}, 1)`;
    if (v < 0.5) return `rgba(${Math.round(60 + v * 100)}, ${Math.round(80 + v * 120)}, ${Math.round(180 + v * 100)}, 1)`;
    if (v < 0.75) return `rgba(${Math.round(100 + v * 100)}, ${Math.round(130 + v * 80)}, 251, 1)`;
    return `rgba(${Math.round(160 + v * 95)}, ${Math.round(180 + v * 75)}, 255, 1)`;
  };

  const cellW = 590 / numCols;
  const cellH = 300 / numRows;

  return (
    <div className="w-full h-full relative p-6 flex flex-col gap-3 overflow-hidden">
      <GridBg />

      {/* Header */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:0.2}}
        className="relative z-10 flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">FFT Spectrogram</span>
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700/40 rounded-md px-3 py-1">
            <span className="text-[12px] text-[#A5B4FC]" style={{fontFamily:"'Cambria Math', Georgia, serif", fontStyle:'italic'}}>X_k = Σ x_n · e^(−i2πkn/N)</span>
          </div>
        </div>
        <span className="text-[9px] text-zinc-600">O(N log N) Radix-2 DIT</span>
      </motion.div>

      {/* Spectrogram heatmap */}
      <motion.div
        initial={{opacity:0, y:10}} animate={active?{opacity:1, y:0}:{}}
        transition={{delay:0.3}}
        className="relative z-10 flex-1 bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 flex flex-col min-h-0"
      >
        <svg className="flex-1 w-full" viewBox="0 0 650 340" preserveAspectRatio="xMidYMid meet">
          {/* Y-axis label */}
          <text x="8" y="170" fill="white" fontSize="7" fontWeight="500" opacity="0.4" fontFamily="Inter, sans-serif" textAnchor="middle" transform="rotate(-90, 8, 170)">Frequency (Hz) →</text>
          
          {/* Y-axis tick labels */}
          {[0, 10, 20, 30, 39].map((row, i) => (
            <text key={`y-${i}`} x="22" y={10 + (39 - row) * cellH + cellH/2 + 2} fill="white" fontSize="5.5" opacity="0.35" textAnchor="end" fontFamily="Inter, sans-serif">
              {Math.round(row * (5512 / 39))}
            </text>
          ))}
          
          {/* X-axis label */}
          <text x="330" y="335" fill="white" fontSize="7" fontWeight="500" opacity="0.4" fontFamily="Inter, sans-serif" textAnchor="middle">Time (frames) →</text>
          
          {/* X-axis tick labels */}
          {[0, 20, 40, 60, 79].map((col, i) => (
            <text key={`x-${i}`} x={30 + col * cellW + cellW/2} y="320" fill="white" fontSize="5.5" opacity="0.35" textAnchor="middle" fontFamily="Inter, sans-serif">
              {col}
            </text>
          ))}

          {/* Heatmap cells */}
          {spectroData.map((freqRow, row) => 
            freqRow.map((val, col) => (
              <motion.rect
                key={`${row}-${col}`}
                x={30 + col * cellW}
                y={10 + (numRows - 1 - row) * cellH}
                width={cellW + 0.5}
                height={cellH + 0.5}
                fill={valToColor(val)}
                initial={{opacity:0}}
                animate={active ? {opacity:1} : {}}
                transition={{delay: 0.4 + col * 0.008 + row * 0.002, duration: 0.3}}
              />
            ))
          )}
          
          {/* Axis lines */}
          <line x1="30" y1="10" x2="30" y2={10 + numRows * cellH} stroke="white" strokeWidth="0.5" opacity="0.3" />
          <line x1="30" y1={10 + numRows * cellH} x2={30 + numCols * cellW} y2={10 + numRows * cellH} stroke="white" strokeWidth="0.5" opacity="0.3" />

          {/* Harmonic band annotations */}
          {active && (
            <motion.g initial={{opacity:0}} animate={{opacity:1}} transition={{delay:2}}>
              {/* Fundamental */}
              <line x1={30 + numCols * cellW + 5} y1={10 + (numRows - 8) * cellH} x2={30 + numCols * cellW + 5} y2={10 + (numRows - 11) * cellH} stroke={THEME.primary} strokeWidth="2" />
              <text x={30 + numCols * cellW + 10} y={10 + (numRows - 9.5) * cellH + 2} fill={THEME.primary} fontSize="5.5" fontWeight="600" fontFamily="Inter, sans-serif">F₀</text>
              
              {/* 2nd harmonic */}
              <line x1={30 + numCols * cellW + 5} y1={10 + (numRows - 15) * cellH} x2={30 + numCols * cellW + 5} y2={10 + (numRows - 18) * cellH} stroke={THEME.accent} strokeWidth="2" />
              <text x={30 + numCols * cellW + 10} y={10 + (numRows - 16.5) * cellH + 2} fill={THEME.accent} fontSize="5.5" fontWeight="600" fontFamily="Inter, sans-serif">2F₀</text>
              
              {/* 3rd harmonic */}
              <line x1={30 + numCols * cellW + 5} y1={10 + (numRows - 23) * cellH} x2={30 + numCols * cellW + 5} y2={10 + (numRows - 26) * cellH} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
              <text x={30 + numCols * cellW + 10} y={10 + (numRows - 24.5) * cellH + 2} fill="rgba(255,255,255,0.5)" fontSize="5.5" fontWeight="600" fontFamily="Inter, sans-serif">3F₀</text>
            </motion.g>
          )}
        </svg>
      </motion.div>

      {/* Bottom: Color scale + info */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:1.5}}
        className="relative z-10 flex items-center gap-4 shrink-0"
      >
        {/* Color gradient legend */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[9px] text-zinc-600">Low</span>
          <div className="flex-1 h-3 rounded-full overflow-hidden flex">
            {Array.from({length:40}).map((_, i) => (
              <div key={i} className="flex-1" style={{backgroundColor: valToColor(i / 39)}} />
            ))}
          </div>
          <span className="text-[9px] text-zinc-600">High</span>
          <span className="text-[8px] text-zinc-500 ml-1">Magnitude (dB)</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          {[
            { label: 'Frames', value: '80' },
            { label: 'FFT Size', value: '2048' },
            { label: 'Freq Bins', value: '1024' },
            { label: 'Nyquist', value: '5,512 Hz' },
          ].map((s, i) => (
            <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-md px-2.5 py-1.5">
              <div className="text-[7px] font-semibold text-zinc-600 uppercase tracking-wider">{s.label}</div>
              <div className="text-[10px] text-zinc-300 font-medium font-mono">{s.value}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const PowerSpectrumVisual = ({ active }) => {
  // Deterministic power spectrum data with musical peaks
  const numBins = 140;
  const peaks = [
    { bin: 12, label: '110 Hz', note: 'A2', height: 72, color: '#F87171' },
    { bin: 28, label: '220 Hz', note: 'A3', height: 85, color: '#FB923C' },
    { bin: 45, label: '440 Hz', note: 'A4', height: 95, color: '#FBBF24' },
    { bin: 62, label: '660 Hz', note: 'E5', height: 68, color: '#34D399' },
    { bin: 78, label: '880 Hz', note: 'A5', height: 78, color: '#22D3EE' },
    { bin: 105, label: '1.3 kHz', note: 'E6', height: 55, color: '#818CF8' },
    { bin: 125, label: '2.2 kHz', note: '', height: 42, color: '#A78BFA' },
  ];

  const spectrumData = Array.from({length: numBins}, (_, i) => {
    // Base 1/f noise floor
    let val = 8 + 25 / (1 + i * 0.05) + ((i * 7 + 5) % 9) * 0.8;
    // Add peaks
    peaks.forEach(p => {
      const dist = Math.abs(i - p.bin);
      if (dist < 3) val = Math.max(val, p.height - dist * 12);
      else if (dist < 6) val = Math.max(val, p.height * 0.3 - dist * 2);
    });
    return Math.min(98, Math.max(2, val));
  });

  return (
    <div className="w-full h-full relative p-6 flex flex-col gap-3 overflow-hidden">
      <GridBg />

      {/* Header */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:0.2}}
        className="relative z-10 flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Power Spectrum (Log Scale)</span>
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700/40 rounded-md px-3 py-1">
            <span className="text-[12px] text-[#A5B4FC]" style={{fontFamily:"'Cambria Math', Georgia, serif", fontStyle:'italic'}}>P(k) = 10 · log₁₀( |Re|² + |Im|² )</span>
          </div>
        </div>
        <span className="text-[9px] text-zinc-600">dB scale emphasizes perceptual features</span>
      </motion.div>

      {/* Spectrum chart */}
      <motion.div
        initial={{opacity:0, y:10}} animate={active?{opacity:1, y:0}:{}}
        transition={{delay:0.3}}
        className="relative z-10 flex-1 bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 flex flex-col min-h-0"
      >
        <svg className="flex-1 w-full" viewBox="0 0 620 280" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="powGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={THEME.primary} stopOpacity="0.4"/>
              <stop offset="100%" stopColor={THEME.primary} stopOpacity="0.02"/>
            </linearGradient>
          </defs>

          {/* Y-axis labels */}
          <text x="12" y="140" fill="white" fontSize="7" opacity="0.3" fontFamily="Inter, sans-serif" textAnchor="middle" transform="rotate(-90, 12, 140)">Power (dB) →</text>
          {[0, 25, 50, 75, 100].map((v, i) => (
            <g key={`y-${i}`}>
              <text x="25" y={250 - v * 2.3 + 2} fill="white" fontSize="5.5" opacity="0.3" textAnchor="end" fontFamily="Inter, sans-serif">{v}</text>
              <line x1="30" y1={250 - v * 2.3} x2="600" y2={250 - v * 2.3} stroke="white" strokeWidth="0.3" opacity="0.1" strokeDasharray="2 4" />
            </g>
          ))}

          {/* X-axis labels */}
          <text x="315" y="275" fill="white" fontSize="7" opacity="0.3" fontFamily="Inter, sans-serif" textAnchor="middle">Frequency (Hz) →</text>

          {/* Noise floor fill */}
          <motion.path
            d={`M 30,250 ${spectrumData.map((v, i) => `L ${30 + i * (570/numBins)},${250 - (8 + 25/(1+i*0.05)) * 2.3}`).join(' ')} L 600,250 Z`}
            fill="rgba(113,113,122,0.08)" stroke="none"
            initial={{opacity:0}} animate={active?{opacity:1}:{}}
            transition={{delay:0.5}}
          />

          {/* Spectrum filled area */}
          <motion.path
            d={`M 30,250 ${spectrumData.map((v, i) => `L ${30 + i * (570/numBins)},${250 - v * 2.3}`).join(' ')} L 600,250 Z`}
            fill="url(#powGrad2)" stroke="none"
            initial={{opacity:0}} animate={active?{opacity:1}:{}}
            transition={{delay:0.6, duration:0.8}}
          />

          {/* Spectrum line */}
          <motion.path
            d={`M ${spectrumData.map((v, i) => `${30 + i * (570/numBins)},${250 - v * 2.3}`).join(' L ')}`}
            fill="none" stroke={THEME.primary} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"
            style={{filter:'drop-shadow(0 0 4px rgba(124,147,251,0.5))'}}
            initial={{pathLength:0}} animate={active?{pathLength:1}:{}}
            transition={{delay:0.5, duration:2}}
          />

          {/* Peak annotations */}
          {peaks.map((p, i) => {
            const x = 30 + p.bin * (570/numBins);
            const y = 250 - p.height * 2.3;
            return (
              <motion.g key={i} initial={{opacity:0}} animate={active?{opacity:1}:{}} transition={{delay: 2 + i * 0.15}}>
                {/* Vertical drop line */}
                <line x1={x} y1={y} x2={x} y2={250} stroke={p.color} strokeWidth="0.6" opacity="0.4" strokeDasharray="2 2" />
                {/* Peak dot */}
                <circle cx={x} cy={y} r="2.5" fill={p.color} style={{filter:`drop-shadow(0 0 4px ${p.color})`}} />
                {/* Label */}
                <g transform={`translate(${x}, ${y - 8})`}>
                  <rect x="-18" y="-10" width="36" height="13" rx="2" fill="#1D1C1C" stroke={p.color} strokeWidth="0.5" opacity="0.9" />
                  <text x="0" y="-1" fill={p.color} fontSize="5.5" fontWeight="600" textAnchor="middle" fontFamily="Inter, sans-serif">{p.label}</text>
                </g>
                {p.note && (
                  <text x={x} y={y - 24} fill="white" fontSize="5" fontWeight="500" opacity="0.4" textAnchor="middle" fontFamily="Inter, sans-serif">{p.note}</text>
                )}
              </motion.g>
            );
          })}

          {/* Axis lines */}
          <line x1="30" y1="20" x2="30" y2="250" stroke="white" strokeWidth="0.5" opacity="0.25" />
          <line x1="30" y1="250" x2="600" y2="250" stroke="white" strokeWidth="0.5" opacity="0.25" />
        </svg>
      </motion.div>

      {/* Bottom info bar */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:2.5}}
        className="relative z-10 flex items-center gap-3 shrink-0"
      >
        {[
          { label: 'Transform', value: '|X(k)|² → dB' },
          { label: 'Resolution', value: '~5.4 Hz/bin' },
          { label: 'Dynamic Range', value: '~96 dB (16-bit)' },
          { label: 'Perceptual', value: 'Log scale weights low freq' },
        ].map((m, i) => (
          <div key={i} className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-md px-3 py-2">
            <div className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider">{m.label}</div>
            <div className="text-[10px] text-zinc-300 mt-0.5 font-medium">{m.value}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const NoiseSuppressionVisual = ({ active }) => {
  // Generate deterministic signal + noise data
  const numBins = 120;
  const signalData = Array.from({length: numBins}, (_, i) => {
    // Base noise floor
    const noise = 15 + ((i * 7 + 3) % 11) * 1.5 + Math.sin(i * 0.3) * 4;
    // Musical peaks at specific frequencies
    const isPeak = [15, 16, 35, 36, 55, 56, 75, 76, 95, 96].includes(i);
    const peakHeight = isPeak ? 55 + ((i * 3) % 20) : 0;
    return { noise, signal: noise + peakHeight, isPeak };
  });

  // Adaptive threshold (rolling mean + α·σ)
  const thresholdData = Array.from({length: numBins}, (_, i) => {
    return 22 + Math.sin(i * 0.05) * 3 + ((i * 5 + 2) % 7) * 0.5;
  });

  return (
    <div className="w-full h-full relative p-6 flex flex-col gap-3 overflow-hidden">
      <GridBg />

      {/* ── Top: Before — Raw Signal + Noise ── */}
      <motion.div
        initial={{opacity:0, y:10}} animate={active?{opacity:1, y:0}:{}}
        transition={{delay:0.2}}
        className="relative z-10 flex-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 flex flex-col min-h-0"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Before — Raw Power Spectrum with Noise</span>
          <div className="flex items-center gap-3 text-[9px] text-zinc-600">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />Noise floor</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7C93FB] inline-block" />Signal</span>
            <span className="flex items-center gap-1"><span className="w-4 h-[1.5px] inline-block" style={{background:'repeating-linear-gradient(90deg,#FCA5A5 0px,#FCA5A5 2px,transparent 2px,transparent 4px)'}} />Threshold</span>
          </div>
        </div>
        <svg className="flex-1 w-full" viewBox="0 0 600 100" preserveAspectRatio="xMidYMid meet">
          {/* Noise floor fill */}
          <motion.path
            d={`M 5,98 ${signalData.map((d,i) => `L ${5 + i*(590/numBins)},${98 - d.noise}`).join(' ')} L 595,98 Z`}
            fill="rgba(113,113,122,0.2)" stroke="none"
            initial={{opacity:0}} animate={active?{opacity:1}:{}}
            transition={{delay:0.4, duration:0.8}}
          />
          {/* Full signal (noise + peaks) */}
          {signalData.map((d, i) => {
            const x = 5 + i * (590 / numBins);
            const barH = d.signal;
            const aboveThreshold = d.signal > thresholdData[i];
            return (
              <motion.rect
                key={i}
                x={x} y={98 - barH} width={590/numBins - 0.5} height={barH}
                rx="0.5"
                fill={d.isPeak ? (aboveThreshold ? THEME.primary : 'rgba(124,147,251,0.3)') : 'rgba(113,113,122,0.35)'}
                initial={{height:0, y:98}}
                animate={active?{height:barH, y:98-barH}:{}}
                transition={{delay:0.3 + i*0.005, duration:0.4}}
              />
            );
          })}
          {/* Adaptive threshold line */}
          <motion.path
            d={`M ${thresholdData.map((t,i) => `${5 + i*(590/numBins)},${98 - t}`).join(' L ')}`}
            fill="none" stroke={THEME.danger} strokeWidth="1.2" strokeDasharray="3 3"
            style={{filter:'drop-shadow(0 0 4px rgba(252,165,165,0.6))'}}
            initial={{pathLength:0}} animate={active?{pathLength:1}:{}}
            transition={{delay:1.2, duration:1}}
          />
          {/* Sliding window indicator */}
          {active && (
            <motion.rect
              x="0" y="0" width="50" height="100" rx="3"
              fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.3"
              initial={{x:-50}} animate={{x:560}}
              transition={{duration:4, repeat:Infinity, ease:'linear', delay:2}}
            />
          )}
          {/* Threshold label */}
          <motion.text x="598" y={98 - thresholdData[numBins-1] + 3} fill={THEME.danger} fontSize="5" fontFamily="Inter, sans-serif" opacity="0.7" initial={{opacity:0}} animate={active?{opacity:0.7}:{}} transition={{delay:1.8}}>T(n)</motion.text>
        </svg>
      </motion.div>

      {/* ── Middle: Processing description ── */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:1.5}}
        className="relative z-10 flex items-center justify-center gap-4 shrink-0"
      >
        <div className="flex-1 h-px bg-zinc-700" />
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-md px-4 py-1.5">
          <span className="text-[10px] text-[#A5B4FC]" style={{fontFamily:"'Cambria Math', Georgia, serif", fontStyle:'italic'}}>T(n) = μ + α·σ</span>
          <span className="text-zinc-600 text-[10px]">·</span>
          <span className="text-[9px] text-zinc-400">Bins below threshold → suppressed</span>
        </div>
        <div className="flex-1 h-px bg-zinc-700" />
      </motion.div>

      {/* ── Bottom: After — Clean Signal ── */}
      <motion.div
        initial={{opacity:0, y:10}} animate={active?{opacity:1, y:0}:{}}
        transition={{delay:2}}
        className="relative z-10 flex-1 bg-zinc-900/60 border border-[#7C93FB]/30 rounded-lg p-4 flex flex-col min-h-0"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7C93FB]">After — Noise Suppressed</span>
          <motion.span initial={{opacity:0}} animate={active?{opacity:1}:{}} transition={{delay:3}} className="text-[9px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
            Only peaks above threshold survive
          </motion.span>
        </div>
        <svg className="flex-1 w-full" viewBox="0 0 600 100" preserveAspectRatio="xMidYMid meet">
          {/* Only peaks that exceed threshold survive */}
          {signalData.map((d, i) => {
            const x = 5 + i * (590 / numBins);
            const aboveThreshold = d.signal > thresholdData[i];
            const barH = aboveThreshold ? d.signal - thresholdData[i] : 0;
            const suppressedH = aboveThreshold ? 0 : d.signal * 0.15;
            return (
              <g key={i}>
                {/* Suppressed bins shown as ghost */}
                {!aboveThreshold && (
                  <motion.rect
                    x={x} y={98 - suppressedH} width={590/numBins - 0.5} height={suppressedH}
                    rx="0.5" fill="rgba(113,113,122,0.08)"
                    initial={{opacity:0}} animate={active?{opacity:1}:{}}
                    transition={{delay:2.5 + i*0.003}}
                  />
                )}
                {/* Surviving peaks */}
                {aboveThreshold && (
                  <motion.rect
                    x={x} y={98 - barH * 1.2} width={590/numBins - 0.5} height={barH * 1.2}
                    rx="0.5" fill={THEME.primary}
                    style={{filter:'drop-shadow(0 0 3px rgba(124,147,251,0.5))'}}
                    initial={{height:0, y:98}}
                    animate={active?{height:barH*1.2, y:98-barH*1.2}:{}}
                    transition={{delay:2.3 + i*0.01, duration:0.5, type:'spring'}}
                  />
                )}
              </g>
            );
          })}
          {/* Zero-energy baseline */}
          <line x1="5" y1="98" x2="595" y2="98" stroke="white" strokeWidth="0.3" opacity="0.15" />
        </svg>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:3}}
        className="relative z-10 flex items-center gap-4 text-[9px] text-zinc-500 shrink-0 px-1"
      >
        <span>Window size: 15 bins</span>
        <span>·</span>
        <span>α = 1.5 (sensitivity)</span>
        <span>·</span>
        <span>Retained: {signalData.filter((d,i) => d.signal > thresholdData[i]).length} / {numBins} bins ({Math.round(signalData.filter((d,i) => d.signal > thresholdData[i]).length / numBins * 100)}%)</span>
      </motion.div>
    </div>
  );
};

const SubBandPeakVisual = ({ active }) => {
  const bands = [
    { name: 'Sub-Bass', range: '0–250 Hz', color: '#F87171', colorBg: 'rgba(248,113,113,0.06)', colorBorder: 'rgba(248,113,113,0.15)', peakHz: '142 Hz', peakPos: 45 },
    { name: 'Bass',     range: '250–500 Hz', color: '#FB923C', colorBg: 'rgba(251,146,60,0.06)', colorBorder: 'rgba(251,146,60,0.15)', peakHz: '387 Hz', peakPos: 52 },
    { name: 'Low Mid',  range: '500–1k Hz', color: '#FBBF24', colorBg: 'rgba(251,191,36,0.06)', colorBorder: 'rgba(251,191,36,0.15)', peakHz: '724 Hz', peakPos: 60 },
    { name: 'Mid',      range: '1k–2k Hz', color: '#34D399', colorBg: 'rgba(52,211,153,0.06)', colorBorder: 'rgba(52,211,153,0.15)', peakHz: '1.4 kHz', peakPos: 48 },
    { name: 'High Mid', range: '2k–4k Hz', color: '#22D3EE', colorBg: 'rgba(34,211,238,0.06)', colorBorder: 'rgba(34,211,238,0.15)', peakHz: '3.1 kHz', peakPos: 55 },
    { name: 'Treble',   range: '4k–8k Hz', color: '#818CF8', colorBg: 'rgba(129,140,248,0.06)', colorBorder: 'rgba(129,140,248,0.15)', peakHz: '5.8 kHz', peakPos: 42 },
  ];

  return (
    <div className="w-full h-full relative p-6 flex flex-col gap-2.5 overflow-hidden">
      <GridBg />

      {/* Header */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:0.2}}
        className="relative z-10 flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">6 Parallel Sub-Band Scanners</span>
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700/40 rounded-md px-3 py-1">
            <span className="text-[12px] text-[#A5B4FC]" style={{fontFamily:"'Cambria Math', Georgia, serif", fontStyle:'italic'}}>Peak_i = max(X(B_i))</span>
          </div>
        </div>
        <span className="text-[9px] text-zinc-600">Each band scanned independently</span>
      </motion.div>

      {/* Band rows */}
      {bands.map((band, idx) => (
        <motion.div
          key={idx}
          initial={{x:-60, opacity:0}}
          animate={active?{x:0, opacity:1}:{}}
          transition={{delay: 0.4 + idx*0.12}}
          className="relative z-10 flex-1 rounded-lg border flex items-center overflow-hidden min-h-0"
          style={{backgroundColor: band.colorBg, borderColor: band.colorBorder}}
        >
          {/* Band label */}
          <div className="w-44 shrink-0 px-4 flex flex-col justify-center h-full">
            <span className="text-[11px] font-semibold" style={{color: band.color}}>{band.name}</span>
            <span className="text-[9px] text-zinc-500">{band.range}</span>
          </div>

          {/* Separator */}
          <div className="w-px h-[60%] bg-zinc-700/30 shrink-0" />

          {/* Frequency bars */}
          <div className="flex-1 h-full flex items-end px-2 py-1.5 gap-[1px] overflow-hidden relative">
            {Array.from({length:50}).map((_, i) => {
              const isPeakBar = i >= (band.peakPos - 1) && i <= (band.peakPos + 1);
              const isExactPeak = i === band.peakPos;
              const baseH = 10 + ((i * 7 + idx * 13 + 5) % 25);
              const h = isExactPeak ? 90 : isPeakBar ? 60 : baseH;
              return (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{
                    backgroundColor: isPeakBar ? band.color : `${band.color}15`,
                    filter: isExactPeak ? `drop-shadow(0 0 4px ${band.color})` : 'none',
                  }}
                  initial={{height: 0}}
                  animate={active ? {height: `${h}%`} : {}}
                  transition={{delay: 0.6 + idx*0.12 + i*0.008, duration: isPeakBar ? 0.6 : 0.3}}
                />
              );
            })}

            {/* Peak marker */}
            <motion.div
              initial={{scale:0, opacity:0}}
              animate={active?{scale:1, opacity:1}:{}}
              transition={{delay: 1.5 + idx*0.2, type:'spring', bounce:0.4}}
              className="absolute top-1 flex items-center gap-1"
              style={{left: `${(band.peakPos / 50) * 100 + 3}%`}}
            >
              <div className="bg-zinc-900/90 border rounded-md px-2 py-0.5 flex items-center gap-1.5" style={{borderColor: band.color}}>
                <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: band.color, boxShadow: `0 0 6px ${band.color}`}} />
                <span className="text-[8px] font-semibold" style={{color: band.color}}>{band.peakHz}</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ))}

      {/* Frequency axis legend */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:2}}
        className="relative z-10 flex items-center gap-2 text-[9px] text-zinc-600 shrink-0 justify-center"
      >
        <span>0 Hz</span>
        <div className="flex-1 max-w-[300px] h-2 rounded-full" style={{background:'linear-gradient(90deg, #F87171, #FB923C, #FBBF24, #34D399, #22D3EE, #818CF8)'}} />
        <span>8 kHz</span>
      </motion.div>
    </div>
  );
};

const ConstellationVisual = ({ active }) => {
  const points = Array.from({length: 120}).map(()=>({ x: 5+Math.random()*90, y: 5+Math.random()*90, r: Math.random()*3+2 }));
  return (
    <div className="w-full h-full relative p-12">
      <GridBg />
      <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 600">
        <DetailedAxis x={60} width={1000} height={500} titleX="Time (s) →" titleY="Frequency (Hz) →" />
        <MathBlock x={100} y={40} delay={0.2}>C = {'{'} (tᵢ, fᵢ) | P(tᵢ, fᵢ) is a local maximum {'}'}</MathBlock>
        <Badge x={700} y={40} title="Sparse Map" value="Approximately 30 peaks/sec" delay={0.6} />

        {/* Scanning grid */}
        {active && Array.from({length:10}).map((_,i)=>(
           <motion.line key={`scan-${i}`} x1={60} y1={20+i*48} x2={1000} y2={20+i*48} stroke={THEME.primary} strokeWidth="1" opacity="0.3" initial={{x:-1000}} animate={{x:0}} transition={{delay:1+i*0.1, duration:1}} />
        ))}

        {points.map((p,i) => (
          <motion.circle key={`p-${i}`} cx={60 + p.x*9.4} cy={20 + p.y*4.8} r={p.r} fill={THEME.primary} style={{filter:THEME.glow}} initial={{scale:0}} animate={active?{scale:1}:{}} transition={{delay: 1.5 + Math.random()*2}} />
        ))}

        {/* Annotated Peak */}
        {active && (
           <motion.g initial={{opacity:0}} animate={{opacity:1}} transition={{delay:4}}>
              <circle cx="450" cy="200" r="15" fill="none" stroke="white" strokeWidth="2" strokeDasharray="3 3"/>
              <line x1="450" y1="200" x2="520" y2="120" stroke="white" strokeWidth="2" />
              <Badge x={520} y={50} title="Selected Peak" value="t: 1.44s · f: 880 Hz · P: 45 dB" color="#FFF" />
           </motion.g>
        )}
      </svg>
    </div>
  );
};

const CombinatorialPairingVisual = ({ active }) => (
  <div className="w-full h-full relative p-12">
    <GridBg />
    <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 600">
      <DetailedAxis x={60} width={1000} height={500} titleX="Time →" titleY="Frequency →" />
      <MathBlock x={100} y={40} delay={0.2}>∀ t_anchor: targets ∈ [t_a + Δt_min, t_a + Δt_max] ∩ [f_a ± Δf]</MathBlock>

      <circle cx="200" cy="300" r="10" fill={THEME.primary} style={{filter:THEME.glow}} />
      {active && <Badge x={60} y={150} title="Anchor Peak" value="Origin point for pairing scan" delay={0.5} />}

      {/* Target Zone */}
      <motion.polygon 
        points="350,100 800,100 800,500 350,500" 
        fill="rgba(124,147,251,0.05)" stroke={THEME.primary} strokeWidth="3" strokeDasharray="15 15"
        initial={{opacity:0}} animate={active?{opacity:1}:{}} transition={{delay:1}} 
      />
      {active && <Badge x={700} y={30} title="Target Zone" value="Constrains search to limit density" delay={1.2} color={THEME.accent} />}

      {/* Raycast Animations */}
      {[ {x:400,y:150}, {x:550,y:250}, {x:750,y:120}, {x:450,y:400}, {x:680,y:450} ].map((t,i) => (
         <g key={`ray-${i}`}>
           <motion.line x1="200" y1="300" x2={t.x} y2={t.y} stroke="white" strokeWidth="2" strokeDasharray="5 5" style={{filter:THEME.whiteGlow}} initial={{pathLength:0}} animate={active?{pathLength:1}:{}} transition={{delay: 2+i*0.2, duration:0.5}} />
           <motion.circle cx={t.x} cy={t.y} r="8" fill="white" style={{filter:THEME.whiteGlow}} initial={{scale:0}} animate={active?{scale:1}:{}} transition={{delay: 2.3+i*0.2}} />
           {active && (
             <motion.foreignObject x={t.x+12} y={t.y-14} width="60" height="28" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:2.6+i*0.2}}>
               <div className="bg-zinc-900/90 border border-zinc-700/60 text-zinc-300 text-[10px] font-medium px-2 py-1 rounded-md">T{i+1}</div>
             </motion.foreignObject>
           )}
         </g>
      ))}
    </svg>
  </div>
);

const TimeDeltaVisual = ({ active }) => {
  const anchor = { t: 4.250, f: 880, note: 'A5', label: 'Anchor' };
  const target = { t: 6.100, f: 1250, note: 'E6', label: 'Target' };
  const deltaT = (target.t - anchor.t).toFixed(3);

  return (
    <div className="w-full h-full relative p-6 flex flex-col gap-3 overflow-hidden">
      <GridBg />

      {/* Header */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:0.2}}
        className="relative z-10 flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Time-Delta Encoding</span>
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700/40 rounded-md px-3 py-1">
            <span className="text-[12px] text-[#A5B4FC]" style={{fontFamily:"'Cambria Math', Georgia, serif", fontStyle:'italic'}}>Hash = (f_a, f_t, Δt)</span>
          </div>
        </div>
        <span className="text-[9px] text-zinc-600">Time-invariant fingerprint tuple</span>
      </motion.div>

      {/* Main visual — timeline with anchor + target */}
      <motion.div
        initial={{opacity:0, y:10}} animate={active?{opacity:1, y:0}:{}}
        transition={{delay:0.3}}
        className="relative z-10 flex-[3] bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 flex flex-col min-h-0"
      >
        <svg className="flex-1 w-full" viewBox="0 0 620 220" preserveAspectRatio="xMidYMid meet">
          {/* Timeline axis */}
          <line x1="30" y1="180" x2="590" y2="180" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <text x="310" y="198" fill="white" fontSize="7" opacity="0.3" fontFamily="Inter, sans-serif" textAnchor="middle">Time (seconds) →</text>
          
          {/* Timeline ticks */}
          {[3, 4, 5, 6, 7, 8].map((t, i) => (
            <g key={`tick-${i}`}>
              <line x1={30 + (t - 3) * 112} y1="178" x2={30 + (t - 3) * 112} y2="183" stroke="white" strokeWidth="0.5" opacity="0.3" />
              <text x={30 + (t - 3) * 112} y="192" fill="white" fontSize="6" opacity="0.3" textAnchor="middle" fontFamily="Inter, sans-serif">{t}s</text>
            </g>
          ))}

          {/* Frequency axis */}
          <line x1="30" y1="20" x2="30" y2="180" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <text x="10" y="100" fill="white" fontSize="7" opacity="0.3" fontFamily="Inter, sans-serif" textAnchor="middle" transform="rotate(-90, 10, 100)">Freq (Hz)</text>
          {[400, 800, 1200, 1600].map((f, i) => (
            <text key={`f-${i}`} x="25" y={180 - (f / 1800) * 155} fill="white" fontSize="5" opacity="0.25" textAnchor="end" fontFamily="Inter, sans-serif">{f}</text>
          ))}

          {/* Anchor point */}
          <motion.g initial={{opacity:0, scale:0}} animate={active?{opacity:1, scale:1}:{}} transition={{delay:0.6, type:'spring'}}>
            <circle cx={30 + (anchor.t - 3) * 112} cy={180 - (anchor.f / 1800) * 155} r="8" fill={THEME.primary} style={{filter:THEME.glow}} />
            <circle cx={30 + (anchor.t - 3) * 112} cy={180 - (anchor.f / 1800) * 155} r="14" fill="none" stroke={THEME.primary} strokeWidth="1" opacity="0.3" />
            {/* Anchor label */}
            <rect x={30 + (anchor.t - 3) * 112 - 40} y={180 - (anchor.f / 1800) * 155 - 35} width="80" height="22" rx="4" fill="#1D1C1C" stroke={THEME.primary} strokeWidth="0.8" />
            <text x={30 + (anchor.t - 3) * 112} y={180 - (anchor.f / 1800) * 155 - 22} fill={THEME.primary} fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="Inter, sans-serif">ANCHOR</text>
            <text x={30 + (anchor.t - 3) * 112} y={180 - (anchor.f / 1800) * 155 - 15} fill="white" fontSize="5.5" fontWeight="500" textAnchor="middle" fontFamily="Inter, sans-serif">{anchor.f} Hz ({anchor.note}) @ {anchor.t}s</text>
            {/* Vertical dashed drop line */}
            <line x1={30 + (anchor.t - 3) * 112} y1={180 - (anchor.f / 1800) * 155 + 8} x2={30 + (anchor.t - 3) * 112} y2="178" stroke={THEME.primary} strokeWidth="0.8" strokeDasharray="2 3" opacity="0.5" />
          </motion.g>

          {/* Target point */}
          <motion.g initial={{opacity:0, scale:0}} animate={active?{opacity:1, scale:1}:{}} transition={{delay:1.2, type:'spring'}}>
            <circle cx={30 + (target.t - 3) * 112} cy={180 - (target.f / 1800) * 155} r="8" fill="white" style={{filter:THEME.whiteGlow}} />
            <circle cx={30 + (target.t - 3) * 112} cy={180 - (target.f / 1800) * 155} r="14" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
            {/* Target label */}
            <rect x={30 + (target.t - 3) * 112 - 40} y={180 - (target.f / 1800) * 155 - 35} width="80" height="22" rx="4" fill="#1D1C1C" stroke="white" strokeWidth="0.8" opacity="0.9" />
            <text x={30 + (target.t - 3) * 112} y={180 - (target.f / 1800) * 155 - 22} fill="white" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="Inter, sans-serif">TARGET</text>
            <text x={30 + (target.t - 3) * 112} y={180 - (target.f / 1800) * 155 - 15} fill="white" fontSize="5.5" fontWeight="500" textAnchor="middle" fontFamily="Inter, sans-serif" opacity="0.8">{target.f} Hz ({target.note}) @ {target.t}s</text>
            <line x1={30 + (target.t - 3) * 112} y1={180 - (target.f / 1800) * 155 + 8} x2={30 + (target.t - 3) * 112} y2="178" stroke="white" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.3" />
          </motion.g>

          {/* Connection arrow */}
          <motion.path
            d={`M ${30 + (anchor.t-3)*112 + 10},${180 - (anchor.f/1800)*155} Q ${30 + ((anchor.t+target.t)/2-3)*112},${180 - ((anchor.f+target.f)/2/1800)*155 - 30} ${30 + (target.t-3)*112 - 10},${180 - (target.f/1800)*155}`}
            fill="none" stroke={THEME.danger} strokeWidth="1.5" strokeDasharray="4 3"
            style={{filter:'drop-shadow(0 0 3px #FCA5A5)'}}
            initial={{pathLength:0}} animate={active?{pathLength:1}:{}}
            transition={{delay:1.8, duration:0.8}}
          />
          <motion.polygon
            points={`${30 + (target.t-3)*112 - 14},${180 - (target.f/1800)*155 - 5} ${30 + (target.t-3)*112 - 10},${180 - (target.f/1800)*155} ${30 + (target.t-3)*112 - 14},${180 - (target.f/1800)*155 + 5}`}
            fill={THEME.danger}
            initial={{opacity:0}} animate={active?{opacity:1}:{}}
            transition={{delay:2.5}}
          />

          {/* Δt bracket on timeline */}
          <motion.g initial={{opacity:0}} animate={active?{opacity:1}:{}} transition={{delay:2.2}}>
            <line x1={30 + (anchor.t-3)*112} y1="160" x2={30 + (anchor.t-3)*112} y2="168" stroke={THEME.danger} strokeWidth="1" />
            <line x1={30 + (target.t-3)*112} y1="160" x2={30 + (target.t-3)*112} y2="168" stroke={THEME.danger} strokeWidth="1" />
            <line x1={30 + (anchor.t-3)*112} y1="164" x2={30 + (target.t-3)*112} y2="164" stroke={THEME.danger} strokeWidth="1.2" />
            <rect x={30 + ((anchor.t+target.t)/2-3)*112 - 25} y="155" width="50" height="14" rx="3" fill="#1D1C1C" stroke={THEME.danger} strokeWidth="0.6" />
            <text x={30 + ((anchor.t+target.t)/2-3)*112} y="164" fill={THEME.danger} fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="Inter, sans-serif">Δt = {deltaT}s</text>
          </motion.g>
        </svg>
      </motion.div>

      {/* Bottom: Hash tuple output */}
      <motion.div
        initial={{opacity:0, y:10}} animate={active?{opacity:1, y:0}:{}}
        transition={{delay:2.8}}
        className="relative z-10 shrink-0 bg-zinc-900/60 border border-[#7C93FB]/30 rounded-lg p-4 flex items-center gap-4"
      >
        <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider shrink-0">Output Tuple</div>
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="bg-[#7C93FB]/10 border border-[#7C93FB]/30 rounded-md px-3 py-1.5 text-[12px] font-mono text-[#7C93FB] font-semibold">f_a = {anchor.f}</span>
          <span className="text-zinc-600">·</span>
          <span className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-[12px] font-mono text-zinc-300 font-semibold">f_t = {target.f}</span>
          <span className="text-zinc-600">·</span>
          <span className="bg-[#FCA5A5]/10 border border-[#FCA5A5]/30 rounded-md px-3 py-1.5 text-[12px] font-mono font-bold" style={{color: THEME.danger}}>Δt = {deltaT}</span>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-zinc-600">→</span>
          <span className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-[11px] font-mono text-[#A5B4FC] font-semibold">Hash: 0x{((anchor.f * 131 + target.f * 17 + Math.round(parseFloat(deltaT)*1000)) >>> 0).toString(16).toUpperCase().slice(-8).padStart(8, '0')}</span>
        </div>
      </motion.div>

      {/* Key insight */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:3.5}}
        className="relative z-10 flex items-center gap-3 text-[9px] text-zinc-500 shrink-0 px-1"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
        <span className="text-emerald-400/80">Using Δt instead of absolute timestamps makes the hash invariant to where in the song the recording starts</span>
      </motion.div>
    </div>
  );
};

const EntropyFilteringVisual = ({ active }) => (
  <div className="w-full h-full relative p-12">
    <GridBg />
    <MathBlock x={50} y={40} delay={0.2}>if count(pairs in region) {'>'} ρ_thresh → discard</MathBlock>
    <Badge x={700} y={40} title="Density Reduction" value="Prunes ~80% of redundant data" delay={0.5} />

    <div className="absolute top-[30%] left-[10%] right-[10%] h-[50%] flex justify-between items-center gap-10">
       <div className="flex-1 h-full bg-zinc-900/80 border border-zinc-700/40 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-4 w-full text-center text-zinc-500 font-semibold tracking-wide z-10 text-base">Raw Vectors</div>
          <svg className="w-full h-full opacity-40">
            {Array.from({length:250}).map((_,i)=><line key={i} x1={Math.random()*400} y1={Math.random()*400} x2={Math.random()*400} y2={Math.random()*400} stroke={i%3===0?THEME.danger:'white'} strokeWidth={i%3===0?1.5:0.5} />)}
          </svg>
          {active && <motion.div className="absolute inset-x-0 h-10 bg-[#FCA5A5]/30 shadow-[0_0_30px_#FCA5A5]" initial={{y:-50}} animate={{y:400}} transition={{duration:2, repeat:Infinity, repeatType:"reverse"}} />}
       </div>

       <div className="text-white font-bold text-5xl opacity-60">→</div>

       <div className="flex-1 h-full bg-zinc-900/80 border-2 border-[#7C93FB]/60 rounded-xl relative overflow-hidden shadow-[0_0_40px_rgba(124,147,251,0.15)]">
          <div className="absolute top-4 w-full text-center text-[#7C93FB] font-semibold tracking-wide z-10 text-base">Pruned Output</div>
          <svg className="w-full h-full">
            {Array.from({length:35}).map((_,i)=><motion.line key={i} x1={20+Math.random()*300} y1={20+Math.random()*300} x2={20+Math.random()*300} y2={20+Math.random()*300} stroke={THEME.primary} strokeWidth="3" style={{filter: THEME.glow}} initial={{pathLength:0}} animate={active?{pathLength:1}:{}} transition={{duration:1, delay:1.5+Math.random()*1}} />)}
          </svg>
       </div>
    </div>
  </div>
);

const InvertedIndexVisual = ({ active }) => {
  // Deterministic hash table entries
  const hashEntries = [
    { hash: '0xA3F17B2E', matches: [{sid: 'Hotel California', artist: 'Eagles', offset: '14.23s'}, {sid: 'Take It Easy', artist: 'Eagles', offset: '2.81s'}] },
    { hash: '0x7BC4D901', matches: [{sid: 'Shape of You', artist: 'Ed Sheeran', offset: '45.67s'}] },
    { hash: '0xE20D5A8C', matches: [{sid: 'Bohemian Rhapsody', artist: 'Queen', offset: '78.12s'}, {sid: 'Killer Queen', artist: 'Queen', offset: '31.44s'}, {sid: 'Imagine', artist: 'Lennon', offset: '5.01s'}] },
    { hash: '0x51A8F340', matches: [{sid: 'Blinding Lights', artist: 'Weeknd', offset: '22.90s'}] },
    { hash: '0x9F33BC17', matches: [{sid: 'Stairway', artist: 'Led Zep', offset: '118.55s'}, {sid: 'Shape of You', artist: 'Ed Sheeran', offset: '47.20s'}] },
    { hash: '0xD6E12F9A', matches: [{sid: 'Bohemian Rhapsody', artist: 'Queen', offset: '80.33s'}] },
    { hash: '0x4F8A6C05', matches: [{sid: 'Hotel California', artist: 'Eagles', offset: '16.01s'}, {sid: 'Comfortably Numb', artist: 'Pink Floyd', offset: '55.88s'}] },
    { hash: '0x82CB1D67', matches: [{sid: 'Blinding Lights', artist: 'Weeknd', offset: '25.11s'}, {sid: 'Save Your Tears', artist: 'Weeknd', offset: '8.45s'}, {sid: 'Starboy', artist: 'Weeknd', offset: '72.33s'}] },
  ];

  // The "query" hash being looked up
  const queryHash = '0xE20D5A8C';
  const queryIdx = hashEntries.findIndex(e => e.hash === queryHash);

  return (
    <div className="w-full h-full relative p-6 flex flex-col gap-3 overflow-hidden">
      <GridBg />

      {/* Header */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:0.2}}
        className="relative z-10 flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Inverted Hash Index</span>
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700/40 rounded-md px-3 py-1">
            <span className="text-[12px] text-[#A5B4FC]" style={{fontFamily:"'Cambria Math', Georgia, serif", fontStyle:'italic'}}>Hash₃₂ → [(SongID, Offset), …]</span>
          </div>
        </div>
        <span className="text-[9px] text-zinc-600">O(1) constant-time lookup</span>
      </motion.div>

      {/* Hash table */}
      <motion.div
        initial={{opacity:0, y:10}} animate={active?{opacity:1, y:0}:{}}
        transition={{delay:0.3}}
        className="relative z-10 flex-1 bg-black/60 border border-zinc-800 rounded-lg overflow-hidden flex flex-col min-h-0"
      >
        {/* Table header */}
        <div className="flex items-center px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F87171]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
          </div>
          <span className="text-[10px] text-zinc-500 font-medium ml-4">AURA Database — hash_index.db</span>
          <span className="text-[9px] text-zinc-600 ml-auto font-mono">8 entries shown / 2.4M total</span>
        </div>

        {/* Column headers */}
        <div className="flex items-center px-4 py-1.5 border-b border-zinc-800/60 shrink-0">
          <span className="text-[8px] font-semibold text-zinc-600 uppercase tracking-wider w-8">#</span>
          <span className="text-[8px] font-semibold text-zinc-600 uppercase tracking-wider w-28">Hash Key</span>
          <span className="text-[8px] font-semibold text-zinc-600 uppercase tracking-wider w-6 text-center"></span>
          <span className="text-[8px] font-semibold text-zinc-600 uppercase tracking-wider flex-1">Matched Songs (SongID, Offset)</span>
        </div>

        {/* Rows */}
        <div className="flex-1 flex flex-col justify-evenly px-1 py-1 overflow-hidden">
          {hashEntries.map((entry, i) => {
            const isQueried = i === queryIdx;
            return (
              <motion.div
                key={i}
                initial={{opacity:0, x:-20}}
                animate={active?{opacity:1, x:0}:{}}
                transition={{delay: 0.5 + i * 0.1}}
                className={`flex items-center px-3 py-1.5 rounded-md transition-colors ${
                  isQueried ? 'bg-[#7C93FB]/[0.08] border border-[#7C93FB]/30' : 'hover:bg-zinc-800/30 border border-transparent'
                }`}
              >
                {/* Row index */}
                <span className="text-[9px] text-zinc-700 w-8 font-mono">{i.toString().padStart(2, '0')}</span>

                {/* Hash key */}
                <span className={`text-[10px] font-mono font-semibold w-28 ${
                  isQueried ? 'text-[#7C93FB]' : 'text-[#FCA5A5]/70'
                }`}>
                  {entry.hash}
                </span>

                {/* Arrow */}
                <span className="text-zinc-600 w-6 text-center text-[10px]">→</span>

                {/* Matches */}
                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                  {entry.matches.map((m, mi) => (
                    <motion.span
                      key={mi}
                      initial={{opacity:0, scale:0.9}}
                      animate={active?{opacity:1, scale:1}:{}}
                      transition={{delay: 0.8 + i * 0.1 + mi * 0.05}}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] border ${
                        isQueried
                          ? 'bg-[#7C93FB]/10 border-[#7C93FB]/30 text-[#A5B4FC]'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span className="font-medium">{m.sid}</span>
                      <span className={`font-mono text-[8px] ${isQueried ? 'text-[#7C93FB]/60' : 'text-zinc-600'}`}>@ {m.offset}</span>
                    </motion.span>
                  ))}
                </div>

                {/* Hit count */}
                <span className={`text-[8px] font-mono ml-2 px-1.5 py-0.5 rounded ${isQueried ? 'text-[#7C93FB] bg-[#7C93FB]/10' : 'text-zinc-600'}`}>
                  {entry.matches.length} hit{entry.matches.length > 1 ? 's' : ''}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Query lookup animation */}
        {active && (
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}}
            transition={{delay:2.5}}
            className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center gap-3 shrink-0"
          >
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Query</span>
            <span className="text-[10px] font-mono text-[#7C93FB] font-semibold">{queryHash}</span>
            <span className="text-zinc-600">→</span>
            <motion.span
              initial={{opacity:0, x:10}}
              animate={{opacity:1, x:0}}
              transition={{delay:3, type:'spring'}}
              className="text-[10px] text-emerald-400 font-medium flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
              Found 3 candidate songs in O(1)
            </motion.span>
          </motion.div>
        )}
      </motion.div>

      {/* Stats footer */}
      <motion.div
        initial={{opacity:0}} animate={active?{opacity:1}:{}}
        transition={{delay:2}}
        className="relative z-10 flex items-center gap-3 shrink-0"
      >
        {[
          { label: 'Hash Size', value: '32-bit' },
          { label: 'Buckets', value: '2^20 slots' },
          { label: 'Collisions', value: 'Chained lists' },
          { label: 'Total Entries', value: '~2.4M hashes' },
        ].map((s, i) => (
          <div key={i} className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-md px-3 py-2">
            <div className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider">{s.label}</div>
            <div className="text-[10px] text-zinc-300 mt-0.5 font-medium font-mono">{s.value}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const HistogramVotingVisual = ({ active }) => {
  // Hash matches: query hashes matched against DB entries
  // For the TRUE match (Song B), all Δt values cluster around +4.2s
  // For wrong songs, Δt is scattered randomly
  const hashMatches = [
    { hash: "0xA3F1", qT: 0.42, dbT_B: 4.62, dbT_A: 2.10, dbT_C: 7.81 },
    { hash: "0x7BC4", qT: 0.93, dbT_B: 5.14, dbT_A: 6.55, dbT_C: 1.20 },
    { hash: "0xE20D", qT: 1.61, dbT_B: 5.80, dbT_A: 0.88, dbT_C: 5.33 },
    { hash: "0x51A8", qT: 2.08, dbT_B: 6.29, dbT_A: 3.71, dbT_C: 8.90 },
    { hash: "0x9F33", qT: 2.74, dbT_B: 6.95, dbT_A: 8.12, dbT_C: 3.47 },
    { hash: "0xD6E1", qT: 3.15, dbT_B: 7.34, dbT_A: 1.55, dbT_C: 6.02 },
  ];

  // Pre-compute Δt for each
  const getDeltas = (song) => hashMatches.map(m => {
    const dbT = song === 'A' ? m.dbT_A : song === 'B' ? m.dbT_B : m.dbT_C;
    return +(dbT - m.qT).toFixed(2);
  });

  const deltasA = getDeltas('A');
  const deltasB = getDeltas('B');
  const deltasC = getDeltas('C');

  // Build histogram bins for each song (range -4 to +10, bin width 1s)
  const binRange = { min: -4, max: 10, step: 1 };
  const numBins = (binRange.max - binRange.min) / binRange.step;

  const buildHist = (deltas) => {
    const bins = Array.from({length: numBins}, (_, i) => ({ 
      offset: binRange.min + i * binRange.step, 
      count: 0,
      votes: []
    }));
    deltas.forEach((d, idx) => {
      const binIdx = Math.floor((d - binRange.min) / binRange.step);
      if (binIdx >= 0 && binIdx < numBins) {
        bins[binIdx].count++;
        bins[binIdx].votes.push(idx);
      }
    });
    return bins;
  };

  const histA = buildHist(deltasA);
  const histB = buildHist(deltasB);
  const histC = buildHist(deltasC);

  const candidates = [
    { name: "Bohemian Rhapsody", artist: "Queen", hist: histA, deltas: deltasA, isMatch: false, maxVotes: Math.max(...histA.map(b=>b.count)) },
    { name: "Shape of You", artist: "Ed Sheeran", hist: histB, deltas: deltasB, isMatch: true, maxVotes: Math.max(...histB.map(b=>b.count)) },
    { name: "Blinding Lights", artist: "The Weeknd", hist: histC, deltas: deltasC, isMatch: false, maxVotes: Math.max(...histC.map(b=>b.count)) },
  ];

  const threshold = 3; // vote threshold for match

  return (
    <div className="w-full h-full relative flex flex-col p-6 gap-4 overflow-hidden">
      <GridBg />

      {/* ── TOP: Alignment Concept Diagram ── */}
      <motion.div 
        initial={{opacity:0, y:-10}} animate={active?{opacity:1, y:0}:{}} 
        transition={{delay:0.2, duration:0.5}}
        className="relative z-10 flex flex-col gap-2 shrink-0"
      >
        {/* Query vs DB timeline */}
        <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-lg px-5 py-3">
          <div className="flex flex-col gap-2 flex-1">
            {/* Query timeline */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-zinc-500 w-14 shrink-0 uppercase tracking-wider">Query</span>
              <div className="flex-1 h-6 bg-zinc-800 rounded-md relative overflow-hidden">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-[#7C93FB]/20 border-r-2 border-[#7C93FB] rounded-l-md"
                  style={{width: '35%'}}
                  initial={{scaleX:0}} animate={active?{scaleX:1}:{}}
                  transition={{delay:0.4, duration:0.6}}
                />
                {/* Hash marks on query */}
                {hashMatches.map((m, i) => (
                  <motion.div key={i} className="absolute top-0 bottom-0 w-[2px] bg-[#7C93FB]" 
                    style={{left: `${(m.qT / 3.5) * 35}%`}}
                    initial={{scaleY:0}} animate={active?{scaleY:1}:{}}
                    transition={{delay: 0.6 + i*0.08}}
                  />
                ))}
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-zinc-500">~3.5s snippet</span>
              </div>
            </div>
            {/* DB Song timeline */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-zinc-500 w-14 shrink-0 uppercase tracking-wider">DB</span>
              <div className="flex-1 h-6 bg-zinc-800 rounded-md relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 right-0 bg-zinc-700/20 rounded-md" />
                {/* Matching region highlighted with offset */}
                <motion.div 
                  className="absolute inset-y-0 bg-[#7C93FB]/10 border-x-2 border-[#7C93FB]/40"
                  style={{left: '40%', width: '35%'}}
                  initial={{opacity:0}} animate={active?{opacity:1}:{}}
                  transition={{delay:1.0, duration:0.8}}
                />
                {/* Hash marks on DB at offset positions */}
                {hashMatches.map((m, i) => (
                  <motion.div key={i} className="absolute top-0 bottom-0 w-[2px] bg-[#7C93FB]/60" 
                    style={{left: `${(m.dbT_B / 10) * 100}%`}}
                    initial={{scaleY:0}} animate={active?{scaleY:1}:{}}
                    transition={{delay: 1.2 + i*0.08}}
                  />
                ))}
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-zinc-500">Full song ~4min</span>
              </div>
            </div>
          </div>
          
          {/* Offset label */}
          <motion.div 
            initial={{opacity:0}} animate={active?{opacity:1}:{}} 
            transition={{delay:1.5}}
            className="shrink-0 flex flex-col items-center gap-0.5"
          >
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Offset</span>
            <span className="text-[16px] font-semibold text-[#7C93FB]" style={{fontFamily: "'Cambria Math', Georgia, serif"}}>Δt ≈ +4.2s</span>
            <span className="text-[8px] text-zinc-600">All hashes agree</span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── MIDDLE: Hash Match Table + Histograms ── */}
      <div className="flex-1 flex gap-4 min-h-0 relative z-10">
        
        {/* Left: Hash offset calculation table */}
        <motion.div 
          initial={{opacity:0, x:-20}} animate={active?{opacity:1, x:0}:{}}
          transition={{delay:0.8}}
          className="w-[260px] shrink-0 flex flex-col bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden"
        >
          {/* Table header */}
          <div className="flex items-center px-3 py-2 border-b border-zinc-800 bg-zinc-900/80">
            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider w-16">Hash</span>
            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider w-12 text-center">t_q</span>
            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider w-12 text-center">t_db</span>
            <span className="text-[9px] font-semibold text-[#7C93FB] uppercase tracking-wider flex-1 text-center">Δt</span>
          </div>
          
          {/* Table rows — showing Song B (match) calculations */}
          <div className="flex-1 flex flex-col justify-evenly px-1 py-1">
            {hashMatches.map((m, i) => {
              const dt = (m.dbT_B - m.qT).toFixed(2);
              return (
                <motion.div 
                  key={i}
                  initial={{opacity:0, x:-15}} 
                  animate={active?{opacity:1, x:0}:{}}
                  transition={{delay: 1.4 + i*0.15}}
                  className="flex items-center px-2 py-1.5 rounded hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="text-[10px] font-mono text-[#A5B4FC] w-16">{m.hash}</span>
                  <span className="text-[10px] text-zinc-400 w-12 text-center font-mono">{m.qT.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-400 w-12 text-center font-mono">{m.dbT_B.toFixed(2)}</span>
                  <motion.span 
                    className="text-[11px] font-semibold text-[#7C93FB] flex-1 text-center font-mono"
                    initial={{opacity:0, scale:0.8}} 
                    animate={active?{opacity:1, scale:1}:{}}
                    transition={{delay: 2.0 + i*0.15, type:"spring"}}
                  >
                    +{dt}
                  </motion.span>
                </motion.div>
              );
            })}
          </div>

          {/* All same! indicator */}
          <motion.div 
            initial={{opacity:0}} animate={active?{opacity:1}:{}}
            transition={{delay:3.2}}
            className="px-3 py-2 border-t border-zinc-800 flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span className="text-[10px] text-emerald-400 font-medium">All Δt ≈ +4.2s — consistent offset!</span>
          </motion.div>
        </motion.div>

        {/* Right: Three candidate histograms */}
        <div className="flex-1 flex flex-col gap-2.5 min-h-0">
          {candidates.map((cand, ci) => {
            const maxPossible = 6; // max theoretical bar height
            return (
              <motion.div
                key={ci}
                initial={{opacity:0, y:15}}
                animate={active?{opacity:1, y:0}:{}}
                transition={{delay: 1.6 + ci*0.25}}
                className={`flex-1 rounded-lg border relative overflow-hidden min-h-0 ${
                  cand.isMatch 
                    ? 'border-[#7C93FB]/50 bg-[#7C93FB]/[0.03]' 
                    : 'border-zinc-800/60 bg-zinc-900/30'
                }`}
              >
                {/* Song header */}
                <div className="absolute top-1.5 left-3 right-3 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold ${cand.isMatch ? 'text-[#7C93FB]' : 'text-zinc-500'}`}>
                      {cand.name}
                    </span>
                    <span className="text-[9px] text-zinc-600">{cand.artist}</span>
                    {cand.isMatch && active && (
                      <motion.span
                        initial={{opacity:0, scale:0.5}}
                        animate={{opacity:1, scale:1}}
                        transition={{delay:3.8, type:"spring", bounce:0.5}}
                        className="text-[8px] font-bold bg-[#7C93FB] text-[#1D1C1C] px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(124,147,251,0.5)]"
                      >
                        ✓ MATCH
                      </motion.span>
                    )}
                  </div>
                  <span className={`text-[9px] font-mono ${cand.isMatch ? 'text-[#7C93FB]' : 'text-zinc-600'}`}>
                    peak: {cand.maxVotes}
                  </span>
                </div>

                {/* Histogram SVG */}
                <svg className="w-full h-full" viewBox="0 0 560 100" preserveAspectRatio="xMidYMid meet">
                  {/* Axis baseline */}
                  <line x1="30" y1="88" x2="540" y2="88" stroke="white" strokeWidth="0.5" opacity="0.15" />
                  
                  {/* Threshold line */}
                  <motion.line
                    x1="30" y1={88 - (threshold / maxPossible) * 65}
                    x2="540" y2={88 - (threshold / maxPossible) * 65}
                    stroke={THEME.danger}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.6"
                    initial={{opacity:0}} animate={active?{opacity:0.6}:{}}
                    transition={{delay: 2.8}}
                  />
                  {ci === 1 && (
                    <motion.text 
                      x="545" y={88 - (threshold / maxPossible) * 65 + 3}
                      fill={THEME.danger} fontSize="6" fontFamily="Inter, system-ui, sans-serif"
                      initial={{opacity:0}} animate={active?{opacity:0.7}:{}}
                      transition={{delay:3}}
                    >
                      θ
                    </motion.text>
                  )}

                  {/* Bin labels on axis */}
                  {cand.hist.map((bin, bi) => (
                    <text key={`label-${bi}`} x={35 + bi * (510/numBins) + (510/numBins)/2} y="97" 
                      fill="white" fontSize="5" opacity="0.25" textAnchor="middle"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {bin.offset >= 0 ? `+${bin.offset}` : bin.offset}
                    </text>
                  ))}

                  {/* Histogram bars */}
                  {cand.hist.map((bin, bi) => {
                    const barW = (510 / numBins) - 3;
                    const x = 35 + bi * (510 / numBins);
                    const barH = (bin.count / maxPossible) * 65;
                    const isWinning = cand.isMatch && bin.count >= threshold;

                    return (
                      <g key={bi}>
                        <motion.rect
                          x={x}
                          y={88 - barH}
                          width={barW}
                          height={barH}
                          rx="2"
                          fill={isWinning ? THEME.primary : cand.isMatch ? 'rgba(124,147,251,0.15)' : 'rgba(255,255,255,0.08)'}
                          style={{filter: isWinning ? 'drop-shadow(0 0 8px rgba(124,147,251,0.7))' : 'none'}}
                          initial={{height:0, y:88}}
                          animate={active?{height: barH, y: 88 - barH}:{}}
                          transition={{delay: 2.2 + ci*0.2 + bi*0.04, duration: isWinning ? 0.8 : 0.3, type: isWinning ? 'spring' : 'tween'}}
                        />

                        {/* Vote count on top of bar */}
                        {bin.count > 0 && (
                          <motion.text
                            x={x + barW/2}
                            y={88 - barH - 3}
                            fill={isWinning ? THEME.primary : 'rgba(255,255,255,0.3)'}
                            fontSize={isWinning ? "8" : "6"}
                            fontWeight={isWinning ? "700" : "400"}
                            textAnchor="middle"
                            fontFamily="Inter, system-ui, sans-serif"
                            initial={{opacity:0}} 
                            animate={active?{opacity:1}:{}}
                            transition={{delay: 2.8 + ci*0.2 + bi*0.04}}
                          >
                            {bin.count}
                          </motion.text>
                        )}

                        {/* Animated vote dots falling into winning bin */}
                        {isWinning && active && bin.votes.map((voteIdx, vi) => (
                          <motion.circle
                            key={`vote-${vi}`}
                            cx={x + barW/2 + (vi-bin.votes.length/2)*3}
                            cy={88 - barH + 5 + vi * 5}
                            r="2"
                            fill="white"
                            style={{filter: 'drop-shadow(0 0 3px white)'}}
                            initial={{cy: -20, opacity:0}}
                            animate={{cy: 88 - barH + 5 + vi * ((barH - 4) / bin.count), opacity:1}}
                            transition={{delay: 2.5 + vi*0.2, duration:0.6, type:"spring", bounce:0.3}}
                          />
                        ))}
                      </g>
                    );
                  })}

                  {/* Winner annotation */}
                  {cand.isMatch && active && (() => {
                    const winBin = cand.hist.reduce((best, b) => b.count > best.count ? b : best, cand.hist[0]);
                    const winIdx = cand.hist.indexOf(winBin);
                    const winX = 35 + winIdx * (510/numBins) + (510/numBins)/2;
                    const winY = 88 - (winBin.count / maxPossible) * 65;
                    return (
                      <motion.g initial={{opacity:0}} animate={{opacity:1}} transition={{delay:3.5}}>
                        {/* Callout line */}
                        <line x1={winX} y1={winY - 6} x2={winX + 60} y2={winY - 18} stroke="white" strokeWidth="0.8" opacity="0.6" />
                        <circle cx={winX} cy={winY - 6} r="1.5" fill="white" />
                        {/* Label */}
                        <rect x={winX + 55} y={winY - 28} width="108" height="20" rx="3" fill="#1D1C1C" stroke="white" strokeWidth="0.5" opacity="0.9" />
                        <text x={winX + 62} y={winY - 15} fill="white" fontSize="7" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
                          6 votes at Δt = +{winBin.offset}s
                        </text>
                      </motion.g>
                    );
                  })()}
                </svg>
              </motion.div>
            );
          })}

          {/* Legend row */}
          <motion.div
            initial={{opacity:0}} animate={active?{opacity:1}:{}}
            transition={{delay:3.5}}
            className="flex items-center gap-5 text-[9px] text-zinc-500 px-1 shrink-0"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-[1.5px] inline-block" style={{background: `repeating-linear-gradient(90deg, #FCA5A5 0px, #FCA5A5 3px, transparent 3px, transparent 6px)`}} />
              Threshold (θ = {threshold})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#7C93FB] rounded-sm inline-block shadow-[0_0_4px_#7C93FB]" />
              Winning bin
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-white rounded-full inline-block shadow-[0_0_3px_white]" />
              Individual votes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-white/10 rounded-sm inline-block" />
              Noise
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
};


const STEPS = [
  { id: 1, title: "Raw Audio Signal", component: WaveformVisual, desc: "The system captures a high-fidelity stereo audio stream and immediately applies a multi-stage preprocessing pipeline. First, the left and right channels are combined into a single mono mix using equal-weight averaging. Then, a hardware-grade low-pass antialiasing filter removes all frequency content above 5.5 kHz — the upper bound of musically relevant information for fingerprinting. Finally, a decimation stage reduces the sample rate by a factor of 4 (from 44.1 kHz down to 11.025 kHz), dramatically shrinking the data volume while retaining the spectral characteristics needed for accurate identification." },
  { id: 2, title: "Frame Segmentation", component: FrameSegmentationVisual, desc: "The continuous audio signal is divided into short, overlapping analysis windows called frames. Each frame is exactly 2048 samples long (approximately 186 ms at 11.025 kHz), providing sufficient frequency resolution to distinguish nearby tones. Consecutive frames overlap by 75% — a hop size of just 512 samples — ensuring that transient events near frame boundaries are never missed. Before analysis, each frame is multiplied by a Hamming window function, a smooth bell-shaped curve that tapers the signal to zero at the edges. This critical step prevents spectral leakage artifacts that would otherwise corrupt the frequency analysis." },
  { id: 3, title: "Spectrogram (FFT)", component: SpectrogramVisual, desc: "Each windowed frame is transformed from the time domain into the frequency domain using a Radix-2 Decimation-in-Time Fast Fourier Transform — an O(N log N) algorithm that decomposes each 2048-sample block into its constituent sinusoidal components. The result is a two-dimensional matrix where each column represents a time frame and each row represents a frequency bin, with cell values encoding complex amplitudes. Together, these columns form a spectrogram: a time-frequency heat map that reveals the harmonic structure, formant patterns, and rhythmic pulse of the audio." },
  { id: 4, title: "Power Spectrum", component: PowerSpectrumVisual, desc: "The raw complex-valued FFT output is converted into a power spectrum by computing the squared magnitude of each frequency bin's real and imaginary components. This value is then projected onto a logarithmic (decibel) scale using the formula P(k) = 10 · log₁₀(|Re|² + |Im|²). The logarithmic transformation is essential because it mirrors the nonlinear sensitivity of the human auditory system — our ears perceive loudness on a roughly logarithmic scale. The resulting representation compresses the enormous dynamic range of real-world audio into a manageable scale, making subtle but important tonal features visible alongside dominant ones." },
  { id: 5, title: "Noise Suppression", component: NoiseSuppressionVisual, desc: "A real-time adaptive noise floor algorithm continuously estimates the local statistical properties of the signal — specifically the running mean (μ) and standard deviation (σ) within a sliding window of neighboring bins. A dynamic threshold T = μ + α·σ is computed at every point; any spectral energy that fails to exceed this threshold is classified as broadband ambient noise and zeroed out. The sensitivity parameter α is tuned to balance between aggressive noise rejection and preservation of quiet but genuine musical content. This step is critical for real-world robustness, allowing the system to operate reliably in noisy environments like cafés, cars, or crowded venues." },
  { id: 6, title: "Sub-Band Peak Extraction", component: SubBandPeakVisual, desc: "Rather than searching the entire spectrum for peaks, the algorithm partitions the frequency axis into six perceptually meaningful bands: Sub-Bass (0–250 Hz), Bass (250–500 Hz), Low Mid (500–1 kHz), Mid (1–2 kHz), High Mid (2–4 kHz), and Treble (4–8 kHz). Within each band, an independent scanner identifies the single strongest frequency bin — the local spectral maximum. This guarantees that structurally important features from every register of the audio are preserved: a deep bass groove won't mask a delicate high-hat pattern, and vice versa. The six peak scanners run concurrently for maximum throughput." },
  { id: 7, title: "Constellation Map", component: ConstellationVisual, desc: "The extracted peaks are projected onto a sparse two-dimensional coordinate system where the x-axis represents time and the y-axis represents frequency. Each peak becomes a point in this 'constellation map' — a dramatically compressed representation that reduces thousands of raw audio samples per frame down to just a few landmark coordinates. The map typically retains around 30 peaks per second of audio. This sparse encoding is the key to the system's noise resilience: minor variations in recording quality, background noise, or volume only shift peak intensities slightly, leaving the constellation geometry largely intact — much like how star patterns remain recognizable despite atmospheric distortion." },
  { id: 8, title: "Combinatorial Pairing", component: CombinatorialPairingVisual, desc: "Each constellation point is designated as an 'anchor' and paired with nearby points that fall within a bounded target zone — a rectangular region defined by minimum/maximum time offsets (Δt) and a frequency range (±Δf) relative to the anchor. This combinatorial strategy generates multiple overlapping pair vectors per anchor, creating a rich web of relationships that captures the local spectral structure. The target zone boundaries are carefully calibrated: too small, and the fingerprint lacks distinctiveness; too large, and the search space explodes with spurious matches. The result is a set of anchor–target pairs that encode the musical relationships between nearby spectral events." },
  { id: 9, title: "Time-Delta Encoding", component: TimeDeltaVisual, desc: "Each anchor–target pair is encoded as a compact tuple: (f_anchor, f_target, Δt), where Δt = t_target − t_anchor is the relative time difference between the two peaks. By recording only the time delta — never the absolute timestamp — the encoding becomes completely invariant to where in the song the sample was captured. A snippet from the middle of a track produces the same set of tuples as one from the beginning, because the internal time relationships are identical. This property is what makes the system capable of recognizing a song from any arbitrary starting point in its playback." },
  // { id: 10, title: "Entropy Filtering", component: EntropyFilteringVisual, desc: "The combinatorial pairing phase can produce an enormous number of candidate vectors, especially in spectrally dense regions like percussive hits or broadband noise bursts. The entropy filter addresses this by measuring the local density of pairs in each time-frequency neighborhood. If the count of pairs in a region exceeds a density threshold ρ, the entire cluster is discarded — these over-populated areas carry little discriminative power and would degrade both storage efficiency and matching precision. This aggressive pruning step typically eliminates around 80% of raw pair data, dramatically reducing memory consumption and database insertion time while preserving only the most informative, structurally distinctive fingerprint fragments." },
  { id: 10, title: "Inverted Hash Index", component: InvertedIndexVisual, desc: "Each surviving (f₁, f₂, Δt) tuple is compressed into a single 32-bit hash integer through a deterministic bitwise packing operation. This hash serves as a key in an inverted index — a hash-map data structure where each key maps to an array of (SongID, TimeOffset) entries. Lookups are O(1) constant-time, meaning the system can locate all songs containing a specific spectral fingerprint instantaneously regardless of database size. During ingestion, new entries are appended to existing bucket lists; during querying, the same hash computation is performed on the query audio and the corresponding bucket is retrieved in a single memory access." },
  { id: 11, title: "Histogram Voting", component: HistogramVotingVisual, desc: "The final identification stage collects all hash matches between the query and the database, then organizes them by computing each match's time offset: Δt = t_database − t_query. These offsets are accumulated into a histogram where each bin represents a candidate temporal alignment between the query and a stored song. If a song is truly the match, the majority of its hash hits will share the same offset bin, producing a sharp, dominant spike. When the vote count in any single bin exceeds the confidence threshold, the system declares a positive match. The height of the winning bin relative to the runner-up provides a quantitative confidence margin — in practice, true matches typically exceed the threshold by over 1000%, making false positives extremely rare." },
];

export {
  WaveformVisual,
  FrameSegmentationVisual,
  SpectrogramVisual,
  PowerSpectrumVisual,
  NoiseSuppressionVisual,
  SubBandPeakVisual,
  ConstellationVisual,
  CombinatorialPairingVisual,
  TimeDeltaVisual,
  EntropyFilteringVisual,
  InvertedIndexVisual,
  HistogramVotingVisual,
};

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(1);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => setActiveStep(p => p===STEPS.length?1:p+1), 5000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const activeData = STEPS[activeStep-1];
  const Component = activeData.component;

  return (
    <div className="flex flex-col h-screen w-full bg-[#1D1C1C] overflow-hidden selection:bg-[#7C93FB]/30 font-sans">
      <main className="flex flex-1 overflow-hidden">
        
        {/* Left Side: Descriptive Text Panel */}
        <div className="w-[35%] flex flex-col justify-center px-12 relative z-20  bg-[#1D1C1C]">
           {/* <GridBg /> */}
           {/* Subtle scanline */}
           {/* <motion.div className="absolute top-0 left-0 right-0 h-px bg-[#7C93FB]/20" animate={{y: ['0vh', '100vh']}} transition={{duration: 8, repeat:Infinity, ease:"linear"}} />
            */}
           <AnimatePresence mode="wait">
              <motion.div key={activeStep} initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} transition={{duration:0.4, ease:"easeOut"}} className="space-y-5 relative z-10 ">
                 <div className="text-[160px] font-black text-[#7C93FB]/[0.06] leading-[0.7] tracking-tighter absolute -top-14 -left-6 pointer-events-none select-none">{activeStep < 10 ? `0${activeStep}` : activeStep}</div>
                 
                 <div className="inline-flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/40 rounded-md px-3 py-1.5">
                   <span className="text-[#7C93FB] font-semibold text-xs tracking-wide">Stage {activeStep}</span>
                   <span className="text-zinc-600 text-xs">of {STEPS.length}</span>
                 </div>
                 
                 <h2 className="text-4xl font-bold text-white tracking-tight leading-tight">{activeData.title}</h2>
                 <p className="text-[15px] text-zinc-400 font-normal leading-relaxed">{activeData.desc}</p>
              </motion.div>
           </AnimatePresence>
        </div>

        {/* Right Side: Visualization */}
        <div className="flex-1 relative overflow-hidden bg-[#1D1C1C] shadow-inner  ">
           {/* Center ambient glow */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#7C93FB]/10 rounded-full blur-[150px] pointer-events-none" />
           <AnimatePresence mode="wait">
             <motion.div key={activeStep} initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0}} transition={{duration:0.4}} className="absolute inset-0 pb-[100px] transform-gpu mt-[100px] mr-[50px]">
               <Component active={true} />
             </motion.div>
           </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation Bar — no scrollbar */}
      <div className="absolute bottom-0 left-0 right-0 h-[70px] bg-[#1D1C1C]/95 backdrop-blur-sm border-t border-zinc-800 flex items-center px-4 z-50">
        <button onClick={() => setAutoPlay(!autoPlay)} className={`shrink-0 mx-3 flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${autoPlay?'bg-[#7C93FB] text-white shadow-[0_0_20px_rgba(124,147,251,0.4)]':'bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 hover:text-white hover:bg-zinc-700/80'}`}>
           {autoPlay ? <Pause fill="currentColor" size={20}/> : <Play fill="currentColor" size={20} className="ml-0.5"/>}
        </button>
        
        <div className="bottom-nav flex flex-1 items-center gap-1 overflow-x-auto h-full px-3" style={{scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch'}}>
           <style>{`.bottom-nav::-webkit-scrollbar { display: none; }`}</style>
           {STEPS.map((step) => (
              <button 
                key={step.id} 
                onClick={() => setActiveStep(step.id)}
                className={`flex flex-col text-left justify-center shrink-0 w-[200px] h-[60px] px-4 rounded-lg transition-all duration-200 relative overflow-hidden group ${activeStep === step.id ? 'bg-[#7C93FB]/15 border border-[#7C93FB]/40' : 'bg-zinc-800/40 border border-zinc-800 hover:border-zinc-600'}`}
              >
                 <div className={`text-[10px] font-semibold tracking-wider relative z-10 ${activeStep === step.id ? 'text-[#7C93FB]' : 'text-zinc-500'}`}>Stage {step.id}</div>
                 <div className={`text-[12px] font-semibold mt-0.5 leading-tight tracking-tight whitespace-nowrap overflow-hidden text-ellipsis relative z-10 ${activeStep === step.id ? 'text-zinc-100' : 'text-zinc-400'}`}>{step.title}</div>
                 
                 {/* Progress indicator */}
                 {activeStep === step.id && autoPlay && (
                   <motion.div className="absolute bottom-0 left-0 h-[2px] bg-[#7C93FB]" initial={{width:0}} animate={{width:'100%'}} transition={{duration:5, ease:"linear"}} key={activeStep}/>
                 )}
              </button>
           ))}
        </div>
      </div>
    </div>
  );
}
