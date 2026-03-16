import React from 'react';
import { X, AlertTriangle, ShieldCheck, ShieldAlert, Crosshair, MapPin, Play, FastForward, Square } from 'lucide-react';
import { useMapStore } from '../lib/state';
import { genAIClient } from '../lib/genai-client';

const IntelCard: React.FC = () => {
  const { strategicIntel, setStrategicIntel, setCommand, mapController, activeTourIndex, startTour, nextTourStop, endTour, setStreetViewConfig } = useMapStore();

  if (!strategicIntel) return null;

  const handleClose = () => {
    setStrategicIntel(null);
    endTour();
  };

  const handleFlyTo = (waypoint: any) => {
    if (waypoint.position) {
        setCommand({
            type: 'FLY_TO',
            target: { 
                center: waypoint.position,
                tilt: 45,
                heading: 0,
                range: 1500
            }
        });
    }
  };

  const executeTourStop = (wp: any) => {
      // 1. Fly to the location
      handleFlyTo(wp);
      
      // 2. Tell the main persona we arrived so they can introduce it
      const message = `We are arriving at ${wp.name}. ${wp.narration ? `Please say: "${wp.narration}"` : 'Please introduce the stop.'} Then, tell me you are handing me over to the local guide.`;
      genAIClient.sendText(message);
      
      // 3. Wait for flight, then dive in
      setTimeout(() => {
          setCommand({ type: 'DIVE', target: wp.position });
          
          // 4. Wait for dive animation, then switch to local persona
          setTimeout(() => {
              genAIClient.transitionToLocalPersona(wp.position, `Tour stop: ${wp.name}. ${wp.significance}`);
          }, 4000);
      }, 4000);
  };

  const handleStartTour = () => {
      startTour();
      if (strategicIntel.waypoints.length > 0) {
          executeTourStop(strategicIntel.waypoints[0]);
      }
  };

  const handleNextStop = () => {
      if (activeTourIndex !== null && activeTourIndex < strategicIntel.waypoints.length - 1) {
          nextTourStop();
          
          // Exit street view first
          setStreetViewConfig(null);
          
          // Switch back to main persona temporarily for the flight
          genAIClient.transitionToDefaultPersona();
          
          // Wait for exit animation, then fly to next stop
          setTimeout(() => {
              executeTourStop(strategicIntel.waypoints[activeTourIndex + 1]);
          }, 1500);
      } else {
          endTour();
          setStreetViewConfig(null);
          genAIClient.transitionToDefaultPersona();
          genAIClient.sendText("We have finished the tour. Please conclude our journey.");
      }
  };

  // Determine Risk Level Color
  const riskText = strategicIntel.risk_factors.toLowerCase();
  let riskColor = 'text-blue-400';
  let riskBorder = 'border-blue-500';
  let RiskIcon = ShieldCheck;
  
  if (riskText.includes('high') || riskText.includes('critical')) {
      riskColor = 'text-red-500';
      riskBorder = 'border-red-500';
      RiskIcon = ShieldAlert;
  } else if (riskText.includes('moderate') || riskText.includes('medium')) {
      riskColor = 'text-amber-400';
      riskBorder = 'border-amber-500';
      RiskIcon = AlertTriangle;
  }

  return (
    <div className="absolute top-24 right-0 md:right-6 bottom-24 w-full md:w-[400px] z-50 pointer-events-none flex flex-col items-end">
        <div className="pointer-events-auto bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right-10 duration-500 w-full max-h-full">
            
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-black/20 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full`} />
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <div className="text-[10px] font-mono text-neutral-500 tracking-[0.2em] uppercase mb-1">STRATEGIC INTEL DOSSIER</div>
                        <h2 className="text-lg font-bold text-white font-mono tracking-wide leading-tight uppercase">
                            {strategicIntel.mission_name || 'MISSION: CLASSIFIED'}
                        </h2>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="text-neutral-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Scroll Area */}
            <div className="overflow-y-auto custom-scrollbar p-5 space-y-6">
                
                {/* Risk Assessment */}
                <div className={`p-4 rounded-lg border bg-black/40 ${riskBorder} ${riskColor} flex items-start gap-4`}>
                    <RiskIcon className="w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                        <div className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 mb-1">RISK ASSESSMENT</div>
                        <div className="text-sm font-medium leading-relaxed">{strategicIntel.risk_factors}</div>
                    </div>
                </div>

                {/* Executive Summary */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-3 bg-cyan-500 rounded-full" />
                        <span className="text-xs font-mono font-bold text-cyan-400 tracking-widest uppercase">BRIEFING</span>
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed font-sans whitespace-pre-wrap">
                        {strategicIntel.strategic_summary}
                    </p>
                </div>

                {/* Tactical Assets (Waypoints) */}
                {strategicIntel.waypoints.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                <span className="text-xs font-mono font-bold text-emerald-400 tracking-widest uppercase">
                                    {strategicIntel.isTour ? 'TOUR STOPS' : 'TACTICAL ASSETS'}
                                </span>
                            </div>
                            {strategicIntel.isTour && activeTourIndex === null && (
                                <button onClick={handleStartTour} className="flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500 hover:text-black transition-colors">
                                    <Play className="w-3 h-3" /> START TOUR
                                </button>
                            )}
                            {strategicIntel.isTour && activeTourIndex !== null && (
                                <div className="flex items-center gap-2">
                                    <button onClick={handleNextStop} className="flex items-center gap-1 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded hover:bg-cyan-500 hover:text-black transition-colors">
                                        <FastForward className="w-3 h-3" /> NEXT
                                    </button>
                                    <button onClick={endTour} className="flex items-center gap-1 text-[10px] font-mono font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500 hover:text-black transition-colors">
                                        <Square className="w-3 h-3" /> END
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            {strategicIntel.waypoints.map((wp, idx) => {
                                const isActiveStop = activeTourIndex === idx;
                                const isPastStop = activeTourIndex !== null && idx < activeTourIndex;
                                
                                return (
                                <button
                                    key={idx}
                                    onClick={() => handleFlyTo(wp)}
                                    disabled={!wp.position}
                                    className={`
                                        w-full text-left p-3 rounded-lg border transition-all group relative overflow-hidden
                                        ${wp.position ? 'cursor-pointer' : 'opacity-60 cursor-default'}
                                        ${isActiveStop ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-emerald-500/30'}
                                    `}
                                >
                                    {isActiveStop && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-1 p-1.5 rounded-md ${isActiveStop ? 'bg-emerald-500 text-black' : wp.position ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors' : 'bg-neutral-800 text-neutral-500'}`}>
                                            {wp.position ? <Crosshair className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <div className={`text-sm font-bold truncate pr-2 ${isActiveStop ? 'text-emerald-400' : isPastStop ? 'text-neutral-400' : 'text-white'}`}>{wp.name}</div>
                                                <div className="text-[9px] font-mono text-neutral-500 uppercase shrink-0">{wp.type}</div>
                                            </div>
                                            <div className="text-xs text-neutral-400 line-clamp-2">{wp.significance}</div>
                                            <div className="text-[10px] text-neutral-600 mt-1 truncate">{wp.address}</div>
                                            {isActiveStop && wp.narration && (
                                                <div className="mt-2 p-2 bg-black/40 rounded border border-emerald-500/20 text-xs text-emerald-100 italic">
                                                    "{wp.narration}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-black/40 border-t border-white/5 text-center">
                <div className="text-[9px] font-mono text-neutral-600 tracking-[0.3em] uppercase">
                    GENERATED BY GEMINI 3 PRO
                </div>
            </div>
        </div>
    </div>
  );
};

export default IntelCard;