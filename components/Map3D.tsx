import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { useMapStore } from '../lib/state';
import { MapController } from '../lib/map-controller';
import { Marker3D } from './Marker3D';
import '../map-3d-types';

const Map3D: React.FC = () => {
  const mapRef = useRef<google.maps.maps3d.Map3DElement | null>(null);
  
  // Libraries
  const maps3dLib = useMapsLibrary('maps3d');
  const elevationLib = useMapsLibrary('elevation');
  const streetViewLib = useMapsLibrary('streetView');
  const geocodingLib = useMapsLibrary('geocoding');
  
  // Local UI State
  const [areMarkersReady, setAreMarkersReady] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  
  // Local transient state for the "Lock" animation
  const [isLocked, setIsLocked] = useState(false); 
  
  // Global Store
  const { 
      markers, 
      selectedMarkerId, 
      setSelectedMarkerId, 
      addMarker, 
      setMapController,
      setStreetViewConfig,
      setSystemMessage,
      streetViewConfig,
      mapController,
      status,
      setStatus,
      setStreetViewLoaded,
      activeCommand,
      clearCommand,
      addLog,
      strategicIntel
  } = useMapStore();

  const isTargeting = status === 'TARGETING';
  const isDiscovery = status === 'DISCOVERY';

  // 1. Initialize Map Controller
  useEffect(() => {
    if (mapRef.current && maps3dLib) {
        customElements.whenDefined('gmp-map-3d').then(() => {
            if (mapRef.current && !useMapStore.getState().mapController) {
                setMapController(new MapController(mapRef.current));
            }
        });
        customElements.whenDefined('gmp-marker-3d').then(() => {
            setAreMarkersReady(true);
        });
    }
  }, [maps3dLib, setMapController]);

  // 2. Initialize Map Services
  useEffect(() => {
      if (mapController && elevationLib && streetViewLib && geocodingLib) {
          mapController.initServices({
              elevation: new elevationLib.ElevationService(),
              streetView: new streetViewLib.StreetViewService(),
              geocoder: new geocodingLib.Geocoder()
          });
      }
  }, [mapController, elevationLib, streetViewLib, geocodingLib]);

  // 3. THE REACTIVE BRIDGE: Command Listener
  useEffect(() => {
    if (!activeCommand || !mapController) return;

    const executeCommand = async () => {
        console.log(`[Bridge] Executing Command: ${activeCommand.type}`);
        
        switch (activeCommand.type) {
            case 'FLY_TO':
                mapController.flyTo(activeCommand.target.center, { ...activeCommand.target });
                break;

            case 'FIT_BOUNDS':
                mapController.frameEntities(activeCommand.targets);
                break;

            case 'DIVE':
                // Complex Dive Sequence moved here
                const coords = activeCommand.target;
                addLog('Initiating Optical Dive sequence...');
                
                // 1. Search for Panorama
                const result = await mapController.findNearestPanorama(coords);
                
                if (!result) {
                    addLog('Target obscured. No optical data available.', 'system');
                    setSystemMessage({ text: 'No Optical Signal', type: 'error' });
                    setTimeout(() => setSystemMessage(null), 2000);
                    break;
                }

                // 2. Prepare UI
                setSystemMessage({ text: 'Optical Link Established', type: 'success' });
                setSelectedMarkerId(null);

                // 3. Initialize Street View
                setStreetViewConfig({ position: result.location, panoId: result.panoId });

                // 4. Execute Camera Dive
                await mapController.engageOpticalLock(coords);

                // Check cancellation
                if (!useMapStore.getState().streetViewConfig) {
                    setStatus('IDLE');
                    break;
                }

                // 5. Reveal Overlay
                const isLoaded = useMapStore.getState().streetViewLoaded;
                setStatus(isLoaded ? 'STREETVIEW_READY' : 'STREETVIEW_LOADING');
                
                setTimeout(() => setSystemMessage(null), 2000);
                break;
        }
        clearCommand();
    };

    executeCommand();

  }, [activeCommand, mapController, clearCommand, setStreetViewConfig, setStatus, setSelectedMarkerId, setSystemMessage, addLog]);

  // 4. Reset Local Lock State when Status Changes
  useEffect(() => {
      if (status !== 'TARGETING') {
          setIsLocked(false);
      }
  }, [status]);

  // 5. Cursor Tracking
  useEffect(() => {
    const isAnyCustomCursorMode = isTargeting || isDiscovery;
    if (!isAnyCustomCursorMode || isLocked) return;
    
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isTargeting, isDiscovery, isLocked]);

  // 6. Global Map Interactions
  useEffect(() => {
    if (!mapController) return;
    
    const handleInteract = async (e: Event) => {
        const event = e as any;
        if (!event.position) return;
        
        if (useMapStore.getState().status === 'FLYING' || isLocked) return;

        if (useMapStore.getState().selectedMarkerId) {
            setSelectedMarkerId(null);
            return;
        }

        const coords = event.position;
        const currentStatus = useMapStore.getState().status;

        // MODE: DISCOVERY
        if (currentStatus === 'DISCOVERY') {
             let newPlaceId = event.placeId;
             let title = 'Identifying...';
             
             if (!newPlaceId) {
                const info = await mapController.identifyLocation(coords);
                newPlaceId = info.placeId;
                title = info.title;
             } else {
                 title = 'Intel Acquired';
             }

             addMarker({
                id: `marker-${Date.now()}`,
                position: coords,
                title,
                placeId: newPlaceId || undefined 
             });
            
             setSystemMessage({ text: newPlaceId ? 'Intel Acquired' : 'Waypoint Logged', type: 'success' });
             setTimeout(() => setSystemMessage(null), 3000);
             return;
        }

        // MODE: TARGETING (Click-to-Dive)
        if (currentStatus === 'TARGETING') {
            const visualTarget = {
                lat: coords.lat,
                lng: coords.lng,
                altitude: coords.altitude || 0
            };

            setIsLocked(true);
            
            // Dispatch DIVE Command via Bridge
            useMapStore.getState().setCommand({ type: 'DIVE', target: visualTarget });
            
            return;
        }

        // MODE: NAVIGATION (Default)
        if (currentStatus === 'IDLE') {
            mapController.flyTo(coords);
        }
    };

    const cleanup = mapController.addListener('gmp-click', handleInteract);
    return cleanup;

  }, [mapController, isLocked, addMarker, setSelectedMarkerId, setSystemMessage, status]); 


  // 7. Street View Exit Watcher
  const prevConfigRef = useRef<any>(null);
  useEffect(() => {
    const prevConfig = prevConfigRef.current;
    if (prevConfig && !streetViewConfig && mapController) {
        mapController.disengageOpticalLock();
    }
    prevConfigRef.current = streetViewConfig;
  }, [streetViewConfig, mapController]);


  // Cursor Rendering Logic
  const showFixedRedCursor = isTargeting && !isLocked;
  const showLockedGreenCursor = isTargeting && isLocked;
  const showDiscoveryCursor = isDiscovery && !isLocked;
  const isAnyCustomCursor = isTargeting || isDiscovery;

  return (
    <>
      {/* @ts-ignore */}
      <gmp-map-3d
        ref={mapRef}
        mode="SATELLITE"
        default-ui-hidden="true"
        tilt="0"
        heading="0"
        range="200000"
        className={isAnyCustomCursor ? '!cursor-none' : ''}
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block',
          cursor: isAnyCustomCursor ? 'none' : 'default' 
        } as React.CSSProperties}
      >
        {maps3dLib && areMarkersReady && markers.map((marker) => (
          <Marker3D key={marker.id} marker={marker} />
        ))}
      {/* @ts-ignore */}
      </gmp-map-3d>

      {/* Red Cursor */}
      {showFixedRedCursor && (
        <div className="fixed pointer-events-none z-[9999] mix-blend-screen transition-all duration-300 ease-out text-red-500"
             style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}>
            <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 border-[3px] rounded-full opacity-80 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]" />
                <div className="absolute inset-3 border-2 rounded-full border-t-transparent border-b-transparent animate-[spin_3s_linear_infinite] border-red-500/50" />
                <div className="absolute w-full h-[1px] opacity-30 bg-red-500" />
                <div className="absolute h-full w-[1px] opacity-30 bg-red-500" />
                <div className="w-2 h-2 rounded-full relative z-10 bg-red-500 animate-ping" />
            </div>
        </div>
      )}

      {/* Blue Cursor */}
      {showDiscoveryCursor && (
        <div className="fixed pointer-events-none z-[9999] mix-blend-screen transition-all duration-100 ease-out text-cyan-400"
             style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}>
             <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 border border-cyan-400/30 rounded-full animate-pulse" />
                <div className="absolute inset-8 border border-cyan-400/60 rounded-full" />
                <div className="absolute w-full h-[1px] bg-cyan-400/50" />
                <div className="absolute h-full w-[1px] bg-cyan-400/50" />
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full z-10 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            </div>
        </div>
      )}

      {/* Green Cursor */}
      {showLockedGreenCursor && (
        <div className="fixed pointer-events-none z-[9999] mix-blend-screen transition-all duration-100 ease-out text-emerald-400"
             style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%) scale(1.1)' }}>
            <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 border-[4px] rounded-full border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)]" />
                <div className="absolute inset-3 border-2 rounded-full border-emerald-400/50" />
                <div className="w-3 h-3 rounded-full relative z-10 bg-emerald-400" />
                <div className="absolute -bottom-12 bg-emerald-950/90 border px-4 py-1.5 rounded-sm text-[11px] font-bold tracking-[0.25em] shadow-xl border-emerald-400 text-emerald-400">TARGET LOCKED</div>
            </div>
        </div>
      )}
    </>
  );
};

export default Map3D;