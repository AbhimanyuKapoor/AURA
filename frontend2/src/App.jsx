import React, { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import WebRecorder from "./WebRecorder";
import Results from "./Results";
import AudioVisualizer from "./AudioVisualizer";
import Showcase from "./Showcase";

import SongList from "./SongList";
import Diagnostics from "./Diagnostics";
import Visualisation from "./Visualisation";
import HowItWorks from "./HowItWorks";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  Library,
  Activity,
  Waves,
  BookOpen,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/", icon: Mic, label: "Hum" },
  { path: "/library", icon: Library, label: "Library" },

  // { path: "/visualisation", icon: Waves, label: "Visualise" },
  { path: "/how-it-works", icon: BookOpen, label: "Algorithm" },
  { path: "/status", icon: Activity, label: "Status" },
];

function HamburgerMenu() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const hiddenRoutes = ["/showcase", ];
  if (hiddenRoutes.includes(location.pathname)) return null;

  return (
    <div
      className="fixed top-6 right-6 z-[60]"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger button */}
      <motion.button
        className="flex flex-col items-center justify-center w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.5)] gap-[5px] p-3"
        animate={
          open
            ? { borderColor: "rgba(255,255,255,0.15)" }
            : { borderColor: "rgba(255,255,255,0.08)" }
        }
      >
        <motion.span
          className="block w-full h-px bg-zinc-400 rounded-full origin-center"
          animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          className="block w-full h-px bg-zinc-400 rounded-full"
          animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.15 }}
        />
        <motion.span
          className="block w-full h-px bg-zinc-400 rounded-full origin-center"
          animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.2 }}
        />
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-12 right-0 min-w-[160px] bg-zinc-900/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.7)] overflow-hidden p-1.5 flex flex-col gap-0.5"
          >
            {NAV_ITEMS.map(({ path, icon: Icon, label }, i) => {
              const active = location.pathname === path;
              return (
                <motion.button
                  key={path}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => {
                    navigate(path);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-150 w-full ${
                    active
                      ? "bg-white text-zinc-950"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    {label}
                  </span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-zinc-950" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const location = useLocation();

  useEffect(() => {
    console.log(location.pathname);
  }, [location.pathname]);

  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-100 font-sans relative selection:bg-white/30">
      <AudioVisualizer stream={micStream} isRecording={isRecording} />
      {(
        <div className="w-full h-full overflow-y-auto relative z-10 custom-scrollbar">
          <div className="absolute inset-0 z-50 pointer-events-none flex items-start justify-start p-0">
            <motion.div
              layout
              className={`pointer-events-auto cursor-pointer p-8 ${
                location.pathname === "/showcase"
                  ? "absolute inset-0 flex items-center justify-center p-0"
                  : "relative flex"
              }`}
            >
              <motion.img
                layout
                layoutId="main-logo"
                src="/aura-text-logo.svg"
                alt="AURA Logo"
                onClick={() => {
                  if (location.pathname === "/showcase") {
                    navigate(-1);
                  } else {
                    navigate("/showcase");
                  }
                }}
                className={
                  location.pathname === "/showcase"
                    ? "w-[70%] max-w-4xl"
                    : "h-16"
                }
                whileHover={{ scale: 1.05 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 30,
                }}
              />
            </motion.div>
          </div>

          <div className="relative w-full h-full transform-gpu">
            <AnimatePresence>
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/"
                  element={
                    <WebRecorder
                      isRecording={isRecording}
                      setIsRecording={setIsRecording}
                      micStream={micStream}
                      setMicStream={setMicStream}
                    />
                  }
                />
                <Route path="/results" element={<Results />} />
                <Route path="/showcase" element={<Showcase />} />
                <Route path="/library" element={<SongList />} />

                {/* <Route path="/visualisation" element={<Visualisation />} /> */}
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/status" element={<Diagnostics />} />
              </Routes>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* {location.pathname === "/how-it-works" && (
        <div className="w-full h-full relative z-10">
          <HowItWorks />
        </div>
      )} */}

      <HamburgerMenu />
    </div>
  );
}

export default App;
