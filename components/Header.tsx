import React, { useRef } from 'react';
import { useMapStore } from '../lib/state';
import { Sparkles, Gamepad2 } from 'lucide-react';

const Header: React.FC = () => {
  const { toggleControlTray, setSystemMessage, appMode } = useMapStore();
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);

  const handleInteraction = () => {
    const now = Date.now();
    if (now - lastClickTimeRef.current > 1000) { // Reset if more than 1s between clicks
        clickCountRef.current = 0;
    }
    
    clickCountRef.current += 1;
    lastClickTimeRef.current = now;

    if (clickCountRef.current === 6) {
        toggleControlTray();
        setSystemMessage({ text: 'Developer Controls Unlocked', type: 'success' });
        clickCountRef.current = 0;
        setTimeout(() => setSystemMessage(null), 3000);
    }
  };

  const isGameMode = appMode === 'game';

  return (
    <div 
      onClick={handleInteraction}
      className="flex items-center gap-5 px-8 py-4 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-black/60 transition-all select-none group relative overflow-hidden"
    >
      {/* Animated Glow Behind */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${isGameMode ? 'bg-purple-500 blur-2xl' : 'bg-cyan-500 blur-2xl'}`} />

      {/* Icon Block */}
      <div className={`p-2 rounded-lg border transition-all duration-500 relative z-10 ${isGameMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.4)]'}`}>
         {isGameMode ? <Gamepad2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </div>

      {/* Title Block with Shimmer & Glitch Effect */}
      <div className="flex flex-col relative z-10">
          <div className="relative">
              {/* Main Text with Shimmer Gradient */}
              <h1 className="text-xl font-black tracking-[0.5em] text-transparent bg-clip-text bg-shimmer-linear animate-shimmer leading-none pb-1 relative z-10">
                TRAVIGO
              </h1>
              
              {/* Glitch Overlay 1 */}
              <h1 className="absolute top-0 left-0 text-xl font-black tracking-[0.5em] text-cyan-400 leading-none opacity-0 group-hover:animate-glitch mix-blend-screen" style={{ animationDelay: '0.1s' }}>
                TRAVIGO
              </h1>
              {/* Glitch Overlay 2 */}
              <h1 className="absolute top-0 left-0 text-xl font-black tracking-[0.5em] text-red-500 leading-none opacity-0 group-hover:animate-glitch mix-blend-screen" style={{ animationDelay: '0.2s', animationDirection: 'reverse' }}>
                TRAVIGO
              </h1>
          </div>
          <div className={`h-[2px] w-0 group-hover:w-full transition-all duration-700 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 ${isGameMode ? 'shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'shadow-[0_0_10px_rgba(34,211,238,0.8)]'}`} />
      </div>
      
      <div className="w-px h-8 bg-white/10 relative z-10" />
      
      {/* Status Block */}
      <div className="flex flex-col gap-0.5 relative z-10 min-w-[120px]">
         <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)] ${isGameMode ? 'bg-purple-400' : 'bg-cyan-400'}`} />
            <span className={`text-[9px] font-mono tracking-widest uppercase ${isGameMode ? 'text-purple-300' : 'text-cyan-300'}`}>
                {isGameMode ? '' : ''}
            </span>
         </div>
      </div>
    </div>
  );
};

export default Header;