import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { X, Users } from 'lucide-react';
import { StreetViewConfig, Coordinates } from '../types';
import { useMapStore } from '../lib/state';
import StreamingConsole from './StreamingConsole';
import { genAIClient } from '../lib/genai-client';

interface StreetViewProps {
  config: StreetViewConfig;
  onClose: (finalPosition?: Coordinates) => void;
  onError: (error: string) => void;
}

const StreetView: React.FC<StreetViewProps> = ({ config, onClose, onError }) => {
  const streetViewLib = useMapsLibrary('streetView');
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const hasErrorRef = useRef(false); 
  const [isReady, setIsReady] = useState(false);
  
  // Local UI State
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  
  // Use status action
  const { setStatus, setStreetViewLoaded, activePersona } = useMapStore();

  useEffect(() => {
    if (!streetViewLib || !containerRef.current) return;

    console.log(`[StreetView] Mounting. PanoID: ${config.panoId}`);

    // Reset local state
    setIsReady(false);
    hasErrorRef.current = false;

    // Initialize with pano ID immediately for pre-warming
    const panorama = new streetViewLib.StreetViewPanorama(containerRef.current, {
      pano: config.panoId, 
      position: config.position,
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      addressControl: false,
      showRoadLabels: false,
      fullscreenControl: false,
      controlSize: 32,
      motionTracking: false,
      motionTrackingControl: false,
      disableDefaultUI: false,
      visible: true 
    });

    // Centralized Ready Handler
    const handleReady = () => {
        // Prevent duplicate firing or firing after error
        if (hasErrorRef.current) return;

        setIsReady((prev) => {
            if (!prev) {
                console.log('[StreetView] Content Technically Loaded.');
                
                // 1. Tell the store we have data (so the Director knows)
                setStreetViewLoaded(true);

                // 2. Check if the App is waiting for us (Director has finished the movie)
                // We access the store directly to avoid closure staleness
                const currentStatus = useMapStore.getState().status;
                if (currentStatus === 'STREETVIEW_LOADING') {
                    console.log('[StreetView] App was waiting. Upgrading to READY.');
                    setStatus('STREETVIEW_READY');
                } else {
                    console.log(`[StreetView] App status is ${currentStatus}. Staying silent.`);
                }
                
                return true;
            }
            return prev;
        });
    };

    // Safety timeout: If tiles don't load in 1.5s, we force ready state
    const safetyTimeout = setTimeout(() => {
        console.log(`[StreetView] Safety Timeout. hasError: ${hasErrorRef.current}`);
        handleReady();
    }, 1500);

    // Success Listener
    const tilesListener = panorama.addListener('tilesloaded', () => {
        console.log(`[StreetView] Tiles Loaded event.`);
        handleReady();
    });

    // Failure Listener
    const statusListener = panorama.addListener('status_changed', () => {
        const status = panorama.getStatus();
        console.log(`[StreetView] Status Change Detected: ${status}`);
        
        if (status !== 'OK') {
             hasErrorRef.current = true;
             console.warn('[StreetView] CRITICAL FAILURE. Triggering Emergency Eject.');
             onError(`Optical Feed Interrupted: ${status}`);
        }
    });
    
    panoramaRef.current = panorama;

    return () => {
        console.log('[StreetView] Unmounting. Cleaning up listeners.');
        clearTimeout(safetyTimeout);
        if (tilesListener) google.maps.event.removeListener(tilesListener);
        if (statusListener) google.maps.event.removeListener(statusListener);
    };
  }, [streetViewLib, config.panoId, config.position, setStatus, setStreetViewLoaded, onError]);

  const handleClose = () => {
    console.log('[StreetView] Manual Close Requested');
    
    // Ensure we trigger the Persona Switch Back if we are in a Local Persona
    if (activePersona && !activePersona.isDefault) {
        genAIClient.transitionToDefaultPersona();
    }

    if (panoramaRef.current) {
        const pos = panoramaRef.current.getPosition();
        if (pos) {
            onClose({ lat: pos.lat(), lng: pos.lng() });
            return;
        }
    }
    onClose(config.position);
  };

  return (
    <div className="w-full h-full bg-transparent relative">
      {/* The Street View Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* HUD Overlay Layer */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Top Center Exit Button */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 pointer-events-auto z-50">
            <button 
                onClick={handleClose}
                className="
                    group flex items-center gap-3 px-6 py-3 
                    bg-red-500/10 backdrop-blur-xl border border-red-500/40 
                    text-red-400 font-mono text-sm tracking-widest uppercase
                    rounded-full shadow-[0_0_20px_rgba(239,68,68,0.2)]
                    hover:bg-red-500/20 hover:scale-105 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]
                    transition-all duration-300
                "
            >
                <span className="group-hover:text-red-300">Close Link</span>
                <div className="bg-red-500/20 p-1 rounded-full group-hover:bg-red-500/40 transition-colors">
                    <X className="w-4 h-4" />
                </div>
            </button>
        </div>

        {/* Info Corner - Top Left */}
        <div className="absolute top-6 left-6 pointer-events-auto">
            <div className="bg-neutral-900/80 backdrop-blur-md border-l-2 border-cyan-500 px-4 py-2 rounded-r-lg shadow-lg">
                <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase block mb-1">TRAVERSE OPTICAL FEED // LIVE</span>
                <div className="text-[10px] text-neutral-400 font-mono leading-tight">
                    LAT: {config.position.lat.toFixed(5)} <br/>
                    LNG: {config.position.lng.toFixed(5)}
                </div>
            </div>
        </div>

        {/* Sliding Drawer Container */}
        {/* Layout: Button -> Gap (24px/gap-6) -> Console (45vh) */}
        {/* When closed, we translate down by 45vh, leaving the button visible at the bottom */}
        <div 
            className={`
                absolute bottom-0 left-1/2 -translate-x-1/2 
                flex flex-col items-center gap-6 
                pointer-events-auto z-50 
                transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)
                ${isConsoleOpen ? 'translate-y-[-24px]' : 'translate-y-[45vh]'}
            `}
        >
            {/* Trigger Button (Acts as Handle/Header) */}
            <button 
                onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                className={`
                    group flex items-center justify-center w-20 h-20
                    backdrop-blur-xl border-2
                    rounded-full transition-all duration-500 ease-out
                    ${isConsoleOpen 
                        ? 'bg-neutral-900/90 border-white/5 text-neutral-600 shadow-none scale-100' // Dark "Latch" Mode (Solid, Matte, Dark)
                        : 'bg-neutral-900/40 border-white/20 text-white hover:bg-white/10 hover:border-white/40 hover:scale-105 animate-pulse shadow-[0_0_20px_rgba(0,0,0,0.3)]' // Bright "Beacon" Mode
                    }
                `}
                title={isConsoleOpen ? "Collapse Console" : "Open Communication Console"}
            >
                <Users className={`w-10 h-10 transition-transform duration-300 ${isConsoleOpen ? 'scale-90 opacity-75' : 'scale-100 opacity-100 group-hover:scale-110'}`} />
            </button>

            {/* The Console Widget - Restricted to 45% of Viewport Height */}
            <div className="h-[45vh] w-[90vw] max-w-[380px]">
                <StreamingConsole 
                    variant="hud"
                    className="w-full h-full rounded-3xl border shadow-2xl" 
                />
            </div>
        </div>

        {/* Decorator Lines */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-white/10 rounded-tl-3xl m-4"></div>
        <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-white/10 rounded-tr-3xl m-4"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-white/10 rounded-bl-3xl m-4"></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-white/10 rounded-br-3xl m-4"></div>
      </div>
    </div>
  );
};

export default StreetView;