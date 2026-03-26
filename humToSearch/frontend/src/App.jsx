import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import WebRecorder from './WebRecorder';
import Results from './Results';
import AudioVisualizer from './AudioVisualizer';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [micStream, setMicStream] = useState(null);

  return (
    <Router>
      <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-100 font-sans relative selection:bg-emerald-500/30">
        <AudioVisualizer stream={micStream} isRecording={isRecording} />
        <div className="w-full h-full overflow-y-auto relative z-10 custom-scrollbar">
          <Routes>
            <Route path="/" element={<WebRecorder isRecording={isRecording} setIsRecording={setIsRecording} micStream={micStream} setMicStream={setMicStream} />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
