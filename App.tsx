import React, { useEffect, useState, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import Map3D from './components/Map3D';
import StreamingConsole from './components/StreamingConsole';
import ControlTray from './components/ControlTray';
import StreetView from './components/StreetView';
import Header from './components/Header';
import IntelCard from './components/IntelCard';
import RouteCard from './components/RouteCard';
import { useMapStore } from './lib/state';
import { Coordinates } from './types';
import { MAPS_API_KEY } from './lib/config';

// Declaration for the global Google Maps Auth Failure callback
declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

export default function App() {
  const {
    streetViewConfig,
    status,
    setStreetViewConfig,
    systemMessage,
    setSystemMessage,
    isControlTrayVisible
  } = useMapStore();

  // State Machine Logic: Street View is only visible when status is READY
  const isStreetViewVisible = status === 'STREETVIEW_READY';

  // UX State
  const [isUiVisible, setIsUiVisible] = useState(true);

  // Effect: React to Visibility Change
  // Reactive: If Street View is ready, hide UI.
  // Reactive: If Street View Config is null (we exited), show UI.
  // This ensures that even if Street View crashes or exits without user interaction, UI comes back.
  useEffect(() => {
    if (isStreetViewVisible) {
      setIsUiVisible(false);
    } else if (!streetViewConfig) {
      setIsUiVisible(true);
    }
  }, [isStreetViewVisible, streetViewConfig]);

  // Handle unexpected errors (e.g. Quota Exceeded, Network Error)
  const handleStreetViewError = useCallback((errorMsg: string) => {
    console.error(`[App] StreetView Error Caught: ${errorMsg}`);
    setStreetViewConfig(null);
    setSystemMessage({ text: errorMsg, type: 'error' });
    // Clear error message after a few seconds
    setTimeout(() => setSystemMessage(null), 5000);
  }, [setStreetViewConfig, setSystemMessage]);

  // Effect: Global Auth Failure Handler (Quota/Billing)
  useEffect(() => {
    // This function is called by the Google Maps SDK when the API Key is invalid
    // OR when the Project Billing is disabled / Quota Exceeded.
    window.gm_authFailure = () => {
      console.error('[App] CRITICAL: Google Maps Auth/Quota Failure Detected via gm_authFailure');
      handleStreetViewError('System Alert: API Quota Exceeded or Auth Failure');
    };

    return () => {
      // Cleanup: strictly speaking we can't fully "remove" it if SDK holds it, 
      // but we can null it out to prevent leaks if this component unmounts.
      window.gm_authFailure = undefined;
    };
  }, [handleStreetViewError]);

  // User Clicks "Exit" in Street View
  const handleExitStreetView = (finalPosition?: Coordinates) => {
    // Reset session in store (triggers cleanup in Map3D via useEffect)
    // This will implicitly set status to IDLE via the store action
    setStreetViewConfig(null);
  };

  const isTargeting = status === 'TARGETING';
  const isDiscovery = status === 'DISCOVERY';
  const isAnyTargetingActive = isTargeting || isDiscovery;

  return (
    <APIProvider apiKey={MAPS_API_KEY} libraries={['maps3d', 'places', 'geocoding', 'elevation', 'streetView', 'routes', 'geometry']}>
      <div className="w-full h-screen relative bg-black overflow-hidden font-sans select-none">

        {/* Layer 0: 3D Map (Background) */}
        <div className="absolute inset-0 z-0">
          <Map3D />
        </div>

        {/* Layer 0.5: Targeting Reticle Helper (Text) */}
        {isAnyTargetingActive && !streetViewConfig && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <div className={`
                    w-[80%] h-[80%] border rounded-3xl opacity-50
                    ${isDiscovery ? 'border-cyan-500/20' : 'border-red-500/20'}
                `} />
            <div className={`
                    absolute top-10 left-1/2 -translate-x-1/2 font-mono text-xs tracking-[0.3em] animate-pulse
                    ${isDiscovery ? 'text-cyan-500' : 'text-red-500'}
                `}>
              {isDiscovery ? "CLICK TO IDENTIFY LOCATION" : "SELECT LANDING ZONE"}
            </div>
          </div>
        )}

        {/* Layer 1: Street View Overlay (Immersive Mode) */}
        {/* Mounted when config exists to pre-load, Visible only when Status is READY */}
        {streetViewConfig && (
          <div className={`
                absolute inset-0 z-20 transition-opacity duration-1000 ease-in-out
                ${isStreetViewVisible ? 'opacity-100 pointer-events-auto' : 'opacity-[0.01] pointer-events-none'}
            `}>
            <StreetView
              config={streetViewConfig}
              onClose={handleExitStreetView}
              onError={handleStreetViewError}
            />
          </div>
        )}

        {/* System Message Toast */}
        <div className={`
            absolute top-24 left-1/2 -translate-x-1/2 z-[60]
            px-6 py-3 rounded-full backdrop-blur-md border shadow-2xl
            font-mono text-xs uppercase tracking-widest transition-all duration-500
            ${systemMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
            ${systemMessage?.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-200' :
            systemMessage?.type === 'info' ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' :
              'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'}
        `}>
          {systemMessage?.text}
        </div>

        {/* Layer 2: HUD / UI Layer (Top) */}
        {/* Added 'invisible' class when hidden to ensure pointer events are disabled on children */}
        <div className={`absolute inset-0 z-50 pointer-events-none transition-all duration-700 ease-in-out ${isUiVisible ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-10 invisible'}`}>

          {/* Main Header */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto z-50">
            <Header />
          </div>

          <div className="absolute top-6 left-6 pointer-events-auto z-50">
            <RouteCard />
          </div>

          <StreamingConsole className="
            absolute z-10
            bottom-0 left-0 right-0 
            h-[45vh] 
            rounded-t-3xl 
            border-t border-white/20
            
            md:top-6 md:left-6 md:bottom-6 md:right-auto 
            md:w-[380px] md:h-auto 
            md:rounded-3xl 
            md:border
          " />

          {/* New Strategic Intel Overlay */}
          <IntelCard />

          <div className={`
            absolute bottom-6 right-6 pointer-events-auto transition-all duration-500 transform
            ${isControlTrayVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}
          `}>
            <ControlTray />
          </div>

        </div>

      </div>
    </APIProvider>
  );
}