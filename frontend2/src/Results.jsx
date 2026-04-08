import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Disc3, Music2 } from 'lucide-react';

function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackInfo } = location.state || { trackInfo: [] };

  const handleBackClick = () => {
    navigate('/');
  };

  if (!trackInfo || trackInfo.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center text-zinc-500 font-mono text-xs z-10 relative">
        <p>No matches found.</p>
        <button onClick={handleBackClick} className="mt-4 text-white hover:underline">Go Back</button>
      </div>
    );
  }

  const topMatch = trackInfo[0];
  const otherMatches = trackInfo.slice(1, 5);

  return (
    <div className="flex flex-col items-center w-full min-h-screen pt-12 pb-32 px-4 relative z-10 animate-in fade-in zoom-in-95 duration-700">
      
      {/* Header bar */}
      <div className="absolute top-0 left-0 w-full flex items-center justify-between p-6 z-30">
        <button 
          onClick={handleBackClick} 
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all active:scale-95 backdrop-blur-sm"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="text-[10px] font-mono text-white/80 uppercase tracking-[0.3em] font-semibold bg-white/10 border border-white/20 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-sm">
          Match Found
        </div>
      </div>

      {/* Massive Spinning Vinyl Disk (50% of screen height) */}
      <div className="relative group mt-12 mb-8">
        <div className="relative w-[50vh] h-[50vh] max-w-[500px] max-h-[500px] min-w-[250px] min-h-[250px] rounded-full overflow-hidden border-[8px] border-zinc-950/90 shadow-[0_40px_80px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.1)] animate-[spin_20s_linear_infinite]">
          {topMatch.album_image ? (
            <img src={topMatch.album_image} alt={topMatch.album} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <Music2 size={60} className="text-zinc-600" />
            </div>
          )}
          {/* Vinyl record grooves overlay */}
          <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none mix-blend-overlay shadow-[inset_0_0_30px_rgba(0,0,0,0.6)]"></div>
          <div className="absolute inset-6 rounded-full border border-black/20 pointer-events-none"></div>
          <div className="absolute inset-12 rounded-full border border-black/20 pointer-events-none"></div>
          <div className="absolute inset-16 rounded-full border border-black/20 pointer-events-none"></div>
          <div className="absolute inset-24 rounded-full border border-black/20 pointer-events-none"></div>
          
          {/* The center vinyl hole */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-zinc-950 rounded-full border-[4px] border-zinc-800 shadow-[inset_0_4px_15px_rgba(0,0,0,1)] flex items-center justify-center">
            <div className="w-4 h-4 bg-zinc-900 rounded-full shadow-[inset_0_2px_5px_rgba(0,0,0,1)]"></div>
          </div>
        </div>
      </div>

      {/* Track Info */}
      <div className="text-center px-8 w-full max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-black text-white truncate w-full tracking-tight drop-shadow-xl">{topMatch.track}</h2>
        <p className="text-base md:text-lg font-medium text-white shadow-zinc-900 drop-shadow-md mt-2 truncate tracking-wide">
          {topMatch.artist}
        </p>
        {topMatch.confidence && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-mono text-zinc-300 tracking-wider">
              {topMatch.confidence}% confidence
            </span>
          </div>
        )}
      </div>

      {/* Audio Player */}
      <div className="w-full max-w-md px-4 mt-8">
        <audio 
          className="w-full h-12 rounded-full bg-zinc-950/80 shadow-inner border border-white/10 backdrop-blur-md [&::-webkit-media-controls-panel]:bg-transparent [&::-webkit-media-controls-current-time-display]:text-zinc-300 [&::-webkit-media-controls-time-remaining-display]:text-zinc-300 drop-shadow-2xl" 
          controls 
          src={topMatch.track_url} 
        />
      </div>

      {/* Flat List of Other Matches (No big card or individual cards) */}
      {otherMatches.length > 0 && (
        <div className="w-full max-w-2xl mt-16 px-4">
          <div className="flex items-center gap-3 mb-6 px-4">
            <Disc3 size={14} className="text-zinc-500" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold">Related Matches</h3>
            <div className="h-px bg-white/5 flex-1 ml-4"></div>
          </div>
          
          <div className="flex flex-col w-full">
            {otherMatches.map((track, index) => (
              <div key={index} className="flex items-center justify-between py-4 px-6 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors cursor-default group">
                <div className="flex flex-col min-w-0 pr-6">
                  <p className="text-base font-bold text-zinc-300 truncate group-hover:text-white transition-colors">{track.track}</p>
                  <p className="text-xs text-zinc-500 truncate mt-1 group-hover:text-white/80 transition-colors uppercase tracking-wider">{track.artist}</p>
                </div>
                {track.album_image && (
                  <img src={track.album_image} alt={track.album} className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity shadow-lg group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Results;
