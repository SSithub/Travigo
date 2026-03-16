import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Mic, MicOff, Keyboard, ArrowUp, Loader, Activity, Gamepad2, Sparkles, Radio } from 'lucide-react';
import { useMapStore } from '../lib/state';
import { genAIClient } from '../lib/genai-client';

interface ControlButtonProps {
  onClick: () => void;
  isActive: boolean;
  isDisabled?: boolean;
  activeColor: 'blue' | 'emerald' | 'red' | 'purple' | 'amber' | 'pink';
  icon: React.ReactNode;
  label: string;
  showPulse?: boolean;
  pulseWhenIdle?: boolean;
}

const ControlButton: React.FC<ControlButtonProps> = ({ 
  onClick, isActive, isDisabled = false, activeColor, icon, label, showPulse = false, pulseWhenIdle = false 
}) => {
  const BASE_SIZE = "w-16 h-16"; 
  const ICON_SIZE = "w-7 h-7";

  const colorMap = {
    blue: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20",
    pink: "text-pink-400 bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20",
  };

  const pulseColorMap = {
    blue: "bg-cyan-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
    pink: "bg-pink-500"
  };

  const attractMap = {
    blue: "text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:bg-cyan-500/5",
    emerald: "text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-emerald-500/5",
    red: "text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:bg-red-500/5",
    purple: "text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:bg-purple-500/5",
    amber: "text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.15)] hover:bg-amber-500/5",
    pink: "text-pink-400 border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.15)] hover:bg-pink-500/5"
  };

  const disabledStyles = "opacity-50 cursor-wait bg-transparent border-transparent text-neutral-500";
  const defaultStyles = "text-neutral-500 bg-transparent border-transparent hover:bg-white/5";

  const isAttracting = !isActive && pulseWhenIdle && !isDisabled;
  const shouldPulse = !isDisabled && ((isActive && showPulse) || isAttracting);

  return (
    <button 
      onClick={isDisabled ? undefined : onClick}
      title={label}
      disabled={isDisabled}
      className={`
        ${BASE_SIZE} 
        rounded-full flex items-center justify-center 
        transition-all duration-2500 border relative overflow-hidden shrink-0
        ${isDisabled 
            ? disabledStyles 
            : isActive 
                ? colorMap[activeColor] 
                : isAttracting
                    ? attractMap[activeColor]
                    : defaultStyles
        }
      `}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { 
          className: `${ICON_SIZE} relative z-10 ${(icon as React.ReactElement<any>).props.className || ''}` 
      })}
      
      {shouldPulse && (
        <div className={`absolute inset-0 opacity-20 animate-pulse rounded-full ${pulseColorMap[activeColor]}`} />
      )}
    </button>
  );
};

interface StreamingConsoleProps {
  className?: string;
  variant?: 'default' | 'hud';
}

const StreamingConsole: React.FC<StreamingConsoleProps> = ({ className = "", variant = 'default' }) => {
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false); 
  const [isMicBusy, setIsMicBusy] = useState(false); 
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [inputText, setInputText] = useState("");

  const { toggleControlTray, setSystemMessage, logs, appMode, setAppMode, activePersona, isPersonaChanging } = useMapStore();
  const isGameMode = appMode === 'game';
  const isLocalPersona = activePersona && !activePersona.isDefault;
  
  // Theme Logic
  // Default Zephyr = Blue (Cyan)
  // Default Puck = Purple
  // Local (Concierge Mode) = Amber
  // Game Entity (Game Mode) = Pink
  
  let themeColor = 'text-cyan-400 border-cyan-500';
  let themeBg = 'bg-cyan-950';
  
  if (isLocalPersona) {
      if (isGameMode) {
          // Game Entity (Pink)
          themeColor = 'text-pink-400 border-pink-500';
          themeBg = 'bg-pink-950';
      } else {
          // Local Guide (Amber)
          themeColor = 'text-amber-400 border-amber-500';
          themeBg = 'bg-amber-950';
      }
  } else if (isGameMode) {
      // Puck (Purple)
      themeColor = 'text-purple-400 border-purple-500';
      themeBg = 'bg-purple-950';
  }

  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);

  const handleSecretTrigger = () => {
    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;
    if (timeDiff > 3000) clickCountRef.current = 0;

    clickCountRef.current += 1;
    lastClickTimeRef.current = now;

    if (clickCountRef.current === 6) {
        toggleControlTray();
        setSystemMessage({ text: 'Developer Controls Unlocked', type: 'success' });
        clickCountRef.current = 0;
        setTimeout(() => setSystemMessage(null), 3000);
    }
  };

  const handleModeToggle = async (mode: 'concierge' | 'game') => {
    if (appMode === mode) return;

    // Disconnect if currently live
    if (isLive) {
       genAIClient.disconnect();
       setIsLive(false);
       setSystemMessage({ text: 'Switching Persona...', type: 'info' });
    }

    setAppMode(mode);
    setTimeout(() => setSystemMessage(null), 1500);
  };

  const handleToggleSession = async () => {
    if (isLive) {
        genAIClient.disconnect();
        setIsLive(false);
        setIsKeyboardMode(false);
        setIsMicOn(false);
        if (variant === 'hud') {
             setSystemMessage({ text: 'Session Terminated', type: 'info' });
             setTimeout(() => setSystemMessage(null), 2000);
        }
    } else {
        if (isConnecting || isPersonaChanging) return;
        
        setIsConnecting(true);
        
        try {
            await genAIClient.connect();
            setIsLive(true);
            setIsMicOn(false); 
            setIsAudioOn(true);
            
            if (variant === 'hud') {
                setSystemMessage({ text: 'Audio Link Established', type: 'success' });
                setTimeout(() => setSystemMessage(null), 2000);
            }
        } catch (error) {
            console.error(error);
            setSystemMessage({ text: 'Connection Failed', type: 'error' });
            setTimeout(() => setSystemMessage(null), 3000);
        } finally {
            setIsConnecting(false);
        }
    }
  };
  
  // Update local live state if store changes (e.g. auto reconnect during persona switch)
  useEffect(() => {
     if (activePersona && !isLive && !isConnecting) {
         if (genAIClient.isConnected) setIsLive(true);
     }
     
     if (isPersonaChanging) {
         setIsLive(false); // Visually disconnect during switch
     } else if (genAIClient.isConnected) {
         setIsLive(true);
     }
  }, [activePersona, isPersonaChanging]);


  const toggleAudio = () => {
      if (!isLive) return;
      const newState = !isAudioOn;
      setIsAudioOn(newState);
      genAIClient.setAudioMuted(!newState);
  };

  const toggleMic = async () => {
      if (!isLive || isMicBusy) return;
      
      setIsMicBusy(true);

      try {
          const shouldBeMuted = isMicOn; 
          const newIsOnState = await genAIClient.setMicMuted(shouldBeMuted);
          setIsMicOn(newIsOnState);

          if (!shouldBeMuted) { 
              if (newIsOnState) {
                   setSystemMessage({ text: 'Microphone Active', type: 'success' });
                   setTimeout(() => setSystemMessage(null), 2000);
              } else {
                   setSystemMessage({ text: 'Microphone Access Denied', type: 'error' });
                   setTimeout(() => setSystemMessage(null), 3000);
              }
          } else {
              setSystemMessage({ text: 'Microphone Muted', type: 'info' });
              setTimeout(() => setSystemMessage(null), 2000);
          }
      } catch (e) {
          console.error(e);
          setIsMicOn(false);
      } finally {
          setIsMicBusy(false);
      }
  };

  const toggleKeyboard = () => {
      if (isLive) setIsKeyboardMode(!isKeyboardMode);
  };

  const handleSendText = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!inputText.trim()) return;
      
      const text = inputText;
      setInputText(""); 
      
      await genAIClient.sendText(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendText();
      }
  };

  const logsContainerRef = useRef<HTMLDivElement>(null);
  
  const displayLogs = logs.filter(log => log.source !== 'system');

  useEffect(() => {
      if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      }
  }, [displayLogs, isLive]); 

  const containerStyles = variant === 'hud' 
    ? 'bg-black/40 backdrop-blur-2xl border-white/20' 
    : 'bg-neutral-900/80 backdrop-blur-xl'; 
  
  const personaLabel = activePersona 
    ? (activePersona.isDefault ? (isGameMode ? 'PUCK' : 'ZEPHYR') : activePersona.name.toUpperCase()) 
    : (isGameMode ? 'PUCK' : 'ZEPHYR');

  // Helper for dynamic colors
  const getThemeColorName = () => {
      if (isLocalPersona) {
          return isGameMode ? 'pink' : 'amber';
      }
      if (isGameMode) return 'purple';
      return 'blue';
  };
  
  const themeName = getThemeColorName();

  // Helper to construct dynamic classes based on themeName
  // We can't interpolate full tailwind classes dynamically if they aren't safe-listed, 
  // but color names usually work if they match standard palette.
  // Using explicit mapping is safer.
  
  const themeMap = {
      blue: {
          text: 'text-cyan-400',
          bg: 'bg-cyan-500',
          border: 'border-cyan-500',
          pulse: 'shadow-[0_0_8px_rgba(34,211,238,0.8)]',
          bubbleBg: 'bg-cyan-950/20 border-cyan-500/10 hover:bg-cyan-950/30',
          bubbleBorder: 'bg-cyan-500/40',
          bubbleText: 'text-cyan-50',
          placeholder: 'placeholder-cyan-500/30 focus:border-cyan-500/50',
          buttonBg: 'text-cyan-400 bg-cyan-950 hover:bg-cyan-500 border-cyan-500/20'
      },
      purple: {
          text: 'text-purple-400',
          bg: 'bg-purple-500',
          border: 'border-purple-500',
          pulse: 'shadow-[0_0_8px_rgba(168,85,247,0.8)]',
          bubbleBg: 'bg-purple-950/20 border-purple-500/10 hover:bg-purple-950/30',
          bubbleBorder: 'bg-purple-500/40',
          bubbleText: 'text-purple-50',
          placeholder: 'placeholder-purple-500/30 focus:border-purple-500/50',
          buttonBg: 'text-purple-400 bg-purple-950 hover:bg-purple-500 border-purple-500/20'
      },
      amber: {
          text: 'text-amber-400',
          bg: 'bg-amber-500',
          border: 'border-amber-500',
          pulse: 'shadow-[0_0_8px_rgba(251,191,36,0.8)]',
          bubbleBg: 'bg-amber-950/20 border-amber-500/10 hover:bg-amber-950/30',
          bubbleBorder: 'bg-amber-500/40',
          bubbleText: 'text-amber-50',
          placeholder: 'placeholder-amber-500/30 focus:border-amber-500/50',
          buttonBg: 'text-amber-400 bg-amber-950 hover:bg-amber-500 border-amber-500/20'
      },
      pink: {
          text: 'text-pink-400',
          bg: 'bg-pink-500',
          border: 'border-pink-500',
          pulse: 'shadow-[0_0_8px_rgba(236,72,153,0.8)]',
          bubbleBg: 'bg-pink-950/20 border-pink-500/10 hover:bg-pink-950/30',
          bubbleBorder: 'bg-pink-500/40',
          bubbleText: 'text-pink-50',
          placeholder: 'placeholder-pink-500/30 focus:border-pink-500/50',
          buttonBg: 'text-pink-400 bg-pink-950 hover:bg-pink-500 border-pink-500/20'
      }
  };

  const T = themeMap[themeName as keyof typeof themeMap];


  return (
    <div className={`
      flex flex-col
      transition-all duration-300 ease-in-out
      shadow-2xl
      overflow-hidden
      pointer-events-auto
      ${containerStyles}
      ${className}
    `}>
      {/* Header */}
      {variant !== 'hud' && (
        <div className="p-6 flex items-center justify-between shrink-0 h-20 border-b border-white/5 bg-black/20">
            <div className="flex items-center gap-4">
                {/* Mode Toggles */}
                <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                    <button 
                        onClick={() => handleModeToggle('concierge')}
                        className={`
                            px-3 py-1.5 rounded-md flex items-center gap-2 transition-all text-xs font-mono font-bold tracking-wider
                            ${!isGameMode ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-neutral-500 hover:text-neutral-300'}
                        `}
                    >
                        <Sparkles className="w-3 h-3" />
                        ZEPHYR
                    </button>
                    <button 
                        onClick={() => handleModeToggle('game')}
                        className={`
                            px-3 py-1.5 rounded-md flex items-center gap-2 transition-all text-xs font-mono font-bold tracking-wider
                            ${isGameMode ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-neutral-500 hover:text-neutral-300'}
                        `}
                    >
                        <Gamepad2 className="w-3 h-3" />
                        PUCK
                    </button>
                </div>
            </div>

            <div className="flex flex-col items-end">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isLive ? `${themeBg}/30 ${themeColor.split(' ')[1]}/30` : 'border-neutral-700/30 bg-neutral-900/30'}`}>
                 <span className={`text-[9px] font-mono tracking-widest ${isLive ? themeColor.split(' ')[0] : 'text-neutral-500'}`}>
                    {isConnecting || isPersonaChanging ? 'INIT' : isLive ? 'ONLINE' : 'OFFLINE'}
                 </span>
                 <div className={`w-1.5 h-1.5 rounded-full transition-all duration-1000 ${isLive ? `${T.bg.replace('bg-', 'bg-')}-400 ${T.pulse} animate-pulse` : 'bg-neutral-700'}`} />
              </div>
            </div>
        </div>
      )}

      {/* Neural Feed / Log Area */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col gap-2 relative">
          
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          <div 
              ref={logsContainerRef}
              className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 space-y-2"
          >
              {/* Empty State */}
              {displayLogs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-4 opacity-40">
                    {isPersonaChanging ? (
                        <Radio className={`w-12 h-12 animate-pulse ${isGameMode ? 'text-pink-500' : 'text-amber-500'}`} />
                    ) : isLocalPersona ? (
                        <Radio className={`w-12 h-12 ${isGameMode ? 'text-pink-500' : 'text-amber-500'}`} />
                    ) : isGameMode ? (
                        <Gamepad2 className={`w-12 h-12 ${isConnecting ? 'text-purple-500 animate-pulse' : 'text-neutral-700'}`} strokeWidth={1} />
                    ) : (
                        <Activity className={`w-12 h-12 ${isConnecting ? 'text-cyan-500 animate-pulse' : 'text-neutral-700'}`} strokeWidth={1} />
                    )}
                    
                    <div className="flex flex-col items-center gap-1">
                        <span className="tracking-[0.3em] font-mono text-[10px] uppercase text-neutral-500">
                            {isPersonaChanging ? (isGameMode ? 'SUMMONING ENTITY...' : 'SCANNING LOCAL FREQUENCIES...') : 
                             isConnecting ? 'ESTABLISHING UPLINK...' : 
                             (isLive ? `${personaLabel} CONNECTED` : 'AWAITING INPUT')}
                        </span>
                        {activePersona && isLocalPersona && (
                             <span className={`text-[9px] ${isGameMode ? 'text-pink-400/60' : 'text-amber-400/60'} font-mono`}>{activePersona.role.toUpperCase()}</span>
                        )}
                    </div>
                </div>
              )}
              
              {/* Messages Loop */}
              {displayLogs.map((log) => {
                  if (log.source === 'user') {
                      return (
                          <div key={log.id} className="flex flex-col items-end pl-8 mb-6 animate-in slide-in-from-right-4 fade-in duration-300">
                              <div className="relative max-w-[90%] flex flex-col items-end group">
                                 {/* Tech Border Right */}
                                 <div className="absolute -right-3 top-0 bottom-0 w-[2px] bg-emerald-500/40 group-hover:bg-emerald-400 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all rounded-full" />
                                 
                                 {/* Header */}
                                 <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                     <div className="h-px w-8 bg-emerald-500/30" />
                                     <span className="text-[9px] font-mono text-emerald-400 tracking-[0.2em] uppercase">COMMAND</span>
                                 </div>

                                 {/* Bubble */}
                                 <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-l-lg rounded-br-none rounded-tr-lg p-3 backdrop-blur-sm hover:bg-emerald-950/30 transition-colors">
                                      <p className="font-sans text-sm text-emerald-50 leading-relaxed whitespace-pre-wrap text-right">
                                          {log.text}
                                      </p>
                                 </div>
                              </div>
                          </div>
                      );
                  }

                  const aiName = isLocalPersona ? `${activePersona?.name} // ${activePersona?.role}` : (isGameMode ? 'PUCK // GM' : 'ZEPHYR // AI');

                  return (
                      <div key={log.id} className="flex flex-col items-start pr-8 mb-6 animate-in slide-in-from-left-4 fade-in duration-300">
                          <div className="relative max-w-[90%] flex flex-col items-start group">
                              {/* Tech Border Left */}
                              <div className={`absolute -left-3 top-0 bottom-0 w-[2px] ${T.bubbleBorder} transition-all rounded-full`} />

                              {/* Header */}
                              <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                  <span className={`text-[9px] font-mono ${T.text} tracking-[0.2em] uppercase`}>
                                     {aiName}
                                  </span>
                                  <div className={`h-px w-12 ${T.bubbleBorder}`} />
                              </div>

                              {/* Bubble */}
                              <div className={`${T.bubbleBg} border rounded-r-lg rounded-bl-none rounded-tl-lg p-3 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-colors`}>
                                  <p className={`font-sans text-sm ${T.bubbleText} leading-relaxed whitespace-pre-wrap`}>
                                      {log.text}
                                  </p>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {/* Control Deck (Footer) */}
      <div className="p-5 shrink-0 flex flex-col gap-5 border-t border-white/5 bg-black/40">
        
        {/* Keyboard Input Area */}
        {isKeyboardMode && isLive && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="relative group">
                    <div className={`absolute inset-0 ${T.bg.replace('bg-', 'bg-')}-500/5 rounded-lg blur-sm transition-all`} />
                    <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`relative w-full bg-black/60 border border-white/10 rounded-lg p-3 pr-12 text-sm text-white ${T.placeholder} resize-none focus:outline-none focus:bg-black/80 transition-all font-mono leading-relaxed tracking-tight`}
                        rows={1}
                        placeholder="ENTER COMMAND SEQUENCE..."
                        autoFocus
                    />
                    <button 
                        onClick={() => handleSendText()}
                        className={`absolute bottom-1.5 right-1.5 p-2 text-white rounded transition-all shadow-lg border ${T.buttonBg}`}
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                </div>
             </div>
        )}

        {/* Dynamic Action Group */}
        <div className="flex items-center justify-center gap-6">
        
            <ControlButton 
              onClick={handleToggleSession}
              isActive={isLive}
              isDisabled={isConnecting || isPersonaChanging}
              activeColor={themeName as any}
              icon={isConnecting || isPersonaChanging
                ? <Loader className="animate-spin" /> 
                : (isLive ? <Pause className="fill-current" /> : <Play className="ml-1 fill-current" />)
              }
              label={isConnecting ? "System Initializing..." : (isLive ? "End Session" : "Start session")}
              pulseWhenIdle={!isConnecting}
            />

            <div className="h-10 w-px bg-white/10 shrink-0" />

            {isLive ? (
                <div className="flex gap-4">
                    <ControlButton 
                      onClick={toggleAudio}
                      isActive={isAudioOn}
                      activeColor="emerald"
                      icon={isAudioOn ? <Volume2 /> : <VolumeX />}
                      label="Toggle App Audio"
                    />

                    <ControlButton 
                      onClick={toggleMic}
                      isActive={isMicOn}
                      isDisabled={isMicBusy} 
                      activeColor="red"
                      icon={isMicOn ? <Mic /> : <MicOff />}
                      label="Toggle Microphone Input"
                    />

                    <ControlButton 
                      onClick={toggleKeyboard}
                      isActive={isKeyboardMode}
                      activeColor={themeName as any}
                      icon={<Keyboard />}
                      label="Toggle Text Input"
                    />
                </div>
            ) : (
                 <div className="flex items-center justify-center">
                    <span className={`${isLocalPersona ? (isGameMode ? 'text-pink-400/40' : 'text-amber-400/40') : (isGameMode ? 'text-purple-400/40' : 'text-cyan-400/40')} font-mono text-[10px] tracking-[0.2em] whitespace-nowrap select-none animate-pulse`}>
                        {isConnecting || isPersonaChanging ? ':: DECRYPTING PROTOCOLS ::' : ":: SYSTEM STANDBY ::"}
                    </span>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StreamingConsole;