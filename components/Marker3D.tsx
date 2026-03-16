import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { useMapStore } from '../lib/state';
import { MapMarker } from '../types';
import '../map-3d-types';

export const Marker3D: React.FC<{ marker: MapMarker }> = ({ marker }) => {
  const markerRef = useRef<google.maps.maps3d.Marker3DInteractiveElement>(null);
  const popoverRef = useRef<google.maps.maps3d.PopoverElement>(null);

  // Store Access
  const {
    selectedMarkerId,
    setSelectedMarkerId,
    setSystemMessage,
    performOpticalDive,
    markers,
    setMarkers,
    mapController
  } = useMapStore();

  const isSelected = selectedMarkerId === marker.id;

  // Libraries
  const markerLib = useMapsLibrary('marker');
  const placesLib = useMapsLibrary('places');

  // Local State
  const [placeData, setPlaceData] = useState<{
    name: string;
    status: string;
    rating: number;
    userRatingsTotal: number;
  } | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(marker.title);
  const [opticalState, setOpticalState] = useState<'idle' | 'checking' | 'active' | 'error'>('idle');

  // 1. Setup Marker Visuals
  useEffect(() => {
    if (!markerLib || !markerRef.current) return;
    
    let isMounted = true;
    const el = markerRef.current;

    const setupMarker = async () => {
        while (el.firstChild) { el.removeChild(el.firstChild); }

        if (marker.placeId && placesLib) {
            try {
                // @ts-ignore
                const place = new placesLib.Place({ id: marker.placeId });
                await place.fetchFields({ 
                    fields: ['displayName', 'svgIconMaskURI', 'iconBackgroundColor'] 
                });

                if (!isMounted) return;

                if (place.displayName) {
                    setDisplayTitle(place.displayName);
                }

                const pinOptions: google.maps.marker.PinElementOptions = {
                    scale: 1.0, 
                    background: place.iconBackgroundColor || '#0ea5e9', 
                    glyphSrc: place.svgIconMaskURI,
                    borderColor: '#000000',
                };

                const pin = new markerLib.PinElement(pinOptions);
                if (pin.element && isMounted) el.append(pin.element);
                return;

            } catch (err) {
                if (!isMounted) return;
            }
        }

        if (!isMounted) return;

        const pinOptions: google.maps.marker.PinElementOptions = {
            scale: 0.9,
            background: '#171717',
            borderColor: '#525252',
            glyphColor: '#a3a3a3',
        };

        const pin = new markerLib.PinElement(pinOptions);
        if (pin.element && isMounted) el.append(pin.element);
    };

    setupMarker();

    return () => {
        isMounted = false;
        if (el) {
            while (el.firstChild) { el.removeChild(el.firstChild); }
        }
    };
  }, [markerLib, placesLib, marker.id, marker.placeId]);

  // 2. Link Popover
  useEffect(() => {
    const el = markerRef.current;
    const popover = popoverRef.current;

    if (el && popover) {
        el.gmpPopoverTargetElement = popover;
        const handleOpen = async (e: Event) => {
             e.stopPropagation();
             // Toggle selection logic
             const currentSelected = useMapStore.getState().selectedMarkerId;
             if (currentSelected !== marker.id) {
                 setSelectedMarkerId(marker.id);
             }

             if (marker.placeId && placesLib && !placeData && !isLoadingPlace) {
                setIsLoadingPlace(true);
                try {
                    // @ts-ignore
                    const place = new placesLib.Place({ id: marker.placeId });
                    await place.fetchFields({ 
                        fields: ['displayName', 'rating', 'userRatingCount', 'businessStatus'] 
                    });
                    setPlaceData({
                        name: place.displayName,
                        status: place.businessStatus,
                        rating: place.rating,
                        userRatingsTotal: place.userRatingCount,
                    });
                } catch (e) {
                } finally {
                    setIsLoadingPlace(false);
                }
             }
        };
        el.addEventListener('gmp-click', handleOpen);
        return () => el.removeEventListener('gmp-click', handleOpen);
    }
  }, [marker.placeId, placesLib, placeData, isLoadingPlace, marker.id, setSelectedMarkerId]);

  // 3. Action Handlers

  const handlePurge = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      // Defer to avoid event conflict
      setTimeout(() => {
          const updated = markers.filter(m => m.id !== marker.id);
          setMarkers(updated);
          if (selectedMarkerId === marker.id) setSelectedMarkerId(null);
      }, 0);
  };

  const handleOpticalLink = async () => {
    if (!mapController) {
        setSystemMessage({ text: 'System Initializing...', type: 'error' });
        return;
    }

    setOpticalState('checking');
    
    // Execute Centralized Dive Logic
    if (performOpticalDive) {
        const success = await performOpticalDive(marker.position);
        
        if (success) {
            setOpticalState('active'); // Shows "LINKED"
            setTimeout(() => setOpticalState('idle'), 2000);
        } else {
            setOpticalState('error');
            setTimeout(() => setOpticalState('idle'), 2000);
        }
    } else {
        // Fallback if store action missing
        setSystemMessage({ text: 'Optical Dive Unavailable', type: 'error' });
        setOpticalState('error');
    }
  };

  return (
    <>
        {/* @ts-ignore */}
        <gmp-marker-3d-interactive
            ref={markerRef}
            position={`${marker.position.lat},${marker.position.lng},0`}
            altitude-mode="RELATIVE_TO_MESH"
            title={displayTitle}
        />
        {/* Fix: Use className instead of class for React compatibility */}
        {/* @ts-ignore */}
        <gmp-popover ref={popoverRef} className="scifi-popover">
            <div className="bg-neutral-950/90 backdrop-blur-xl border border-white/10 text-white w-[280px] font-mono shadow-2xl rounded-sm overflow-hidden">
                <div className={`px-4 py-3 border-b border-white/10 flex justify-between items-start ${marker.placeId ? 'bg-cyan-950/30' : 'bg-neutral-900/50'}`}>
                    <div>
                        <h3 className="font-sans font-bold text-sm tracking-wide text-white leading-tight mb-1">
                            {placeData ? placeData.name : marker.title}
                        </h3>
                        <span className={`text-[9px] uppercase tracking-widest ${marker.placeId ? 'text-cyan-400' : 'text-neutral-500'}`}>
                            {marker.placeId ? 'Official Place Entity' : 'Manual Coordinate'}
                        </span>
                    </div>
                </div>
                <div className="p-4 space-y-3">
                    {placeData && placeData.rating && (
                         <div className="flex items-center justify-between text-[10px] border-b border-white/5 pb-2">
                            <span className="text-neutral-500">REPUTATION</span>
                            <span className="text-cyan-300">{placeData.rating.toFixed(1)} <span className="text-neutral-600">/ 5.0</span></span>
                        </div>
                    )}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center"><span className="text-neutral-600 text-[9px]">LAT</span><span className="text-neutral-300 text-[10px]">{marker.position.lat.toFixed(5)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-neutral-600 text-[9px]">LNG</span><span className="text-neutral-300 text-[10px]">{marker.position.lng.toFixed(5)}</span></div>
                    </div>
                    {isLoadingPlace && <div className="text-[9px] text-cyan-500 animate-pulse text-center pt-1">:: DECRYPTING METADATA ::</div>}
                </div>
                <div className="flex border-t border-white/10 h-10">
                    <button onClick={handleOpticalLink} disabled={opticalState === 'checking' || opticalState === 'active'} className={`flex-1 transition-all flex items-center justify-center gap-2 group relative ${opticalState === 'error' ? 'bg-red-500/10 text-red-500 cursor-not-allowed' : 'hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300'}`}>
                         <span className="text-[10px] font-bold tracking-[0.2em]">{opticalState === 'checking' ? 'SCANNING...' : opticalState === 'active' ? 'LINKED' : opticalState === 'error' ? 'NO SIGNAL' : 'ENGAGE'}</span>
                    </button>
                    <div className="w-px bg-white/10" />
                    <button onClick={handlePurge} className="w-12 hover:bg-red-900/20 text-neutral-500 hover:text-red-400 transition-colors flex items-center justify-center group">
                        <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        {/* @ts-ignore */}
        </gmp-popover>
    </>
  );
};