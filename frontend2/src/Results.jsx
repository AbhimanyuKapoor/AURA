import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Disc3, Music2 } from 'lucide-react';

function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackInfo } = location.state || { trackInfo: [] };
  const [showRelated, setShowRelated] = useState(false);
  const relatedRef = useRef(null);

  const handleBackClick = () => {
    navigate('/');
  };

  const handleRelatedClick = () => {
    const nextShow = !showRelated;
    setShowRelated(nextShow);
    if (nextShow) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          relatedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
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
      <div className="flex flex-col items-center w-full min-h-[100dvh] pt-12 pb-32 px-4 relative z-10 animate-in fade-in zoom-in-95 duration-700 cursor-pointer">
  
        {/* Inner container wrapper */}
        <div className="flex flex-col items-center w-full h-full cursor-default">

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

      {/* Flat List of Other Matches */}
      {otherMatches.length > 0 && (
        <div ref={relatedRef} className="w-full max-w-2xl mt-16 px-4">
          <button
            type="button"
            onClick={handleRelatedClick}
            className="w-full flex items-center gap-3 mb-6 px-4 py-3 text-left rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
            aria-expanded={showRelated}
          >
            <Disc3 size={14} className="text-zinc-400" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              {otherMatches.length} Related Match{otherMatches.length > 1 ? 'es' : ''}
            </h3>
            <div className="h-px bg-white/10 flex-1 ml-4"></div>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${showRelated ? 'rotate-180' : ''}`} />
          </button>
          
          {showRelated && (
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
          )}
        </div>
      )}
        </div>
      </div>
  );
}

export default Results;
