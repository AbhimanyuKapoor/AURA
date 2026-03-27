import React, { useEffect, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import WebRecorder from './WebRecorder';
import Results from './Results';
import AudioVisualizer from './AudioVisualizer';
import Showcase from './Showcase';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

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
      <div className="w-full h-full overflow-y-auto relative z-10 custom-scrollbar">
        <div className='absolute inset-0 z-50 pointer-events-none flex items-start justify-start p-0'>
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
                  navigate("/");
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
                damping: 30
              }}
            />
          </motion.div>
        </div>

        <div className="relative w-full h-full transform-gpu">
          <AnimatePresence>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<WebRecorder isRecording={isRecording} setIsRecording={setIsRecording} micStream={micStream} setMicStream={setMicStream} />} />
              <Route path="/results" element={<Results />} />
              <Route path="/showcase" element={<Showcase />} />
            </Routes>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;
