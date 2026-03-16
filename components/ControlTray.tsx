import React from 'react';
import { Navigation, MapPin, ScanEye, Search } from 'lucide-react';
import { useMapStore } from '../lib/state';
import { MapMarker } from '../types';

const ControlTray: React.FC = () => {
  const { 
    mapController, 
    setMarkers, 
    clearMarkers, 
    setSystemMessage,
    status,
    setStatus,
    streetViewConfig
  } = useMapStore();

  const handleFlyToParis = () => {
    if (mapController) {
      mapController.flyTo(
        { lat: 48.8566, lng: 2.3522, altitude: 1000 },
        { 
            tilt: 45, 
            heading: 0,
            range: 1500 
        }
      );
    }
  };

  const handleAddChicagoMuseums = () => {
    const museums: MapMarker[] = [
      { 
        id: 'adler', 
        position: { lat: 41.8663, lng: -87.6068 }, 
        title: 'Adler Planetarium',
      },
      { 
        id: 'field', 
        position: { lat: 41.8663, lng: -87.6140 }, 
        title: 'Field Museum',
      },
      { 
        id: 'shedd', 
        position: { lat: 41.8676, lng: -87.6140 }, 
        title: 'Shedd Aquarium',
      }
    ];

    clearMarkers();
    setMarkers(museums);
    
    if (mapController) {
      mapController.frameEntities(museums.map(m => m.position));
    }

    setSystemMessage({ text: 'Intel Loaded: Chicago Sector', type: 'info' });
    setTimeout(() => setSystemMessage(null), 3000);
  };

  const handleToggleTargetingMode = () => {
    if (streetViewConfig || status === 'FLYING') return;

    if (status === 'TARGETING') {
        setStatus('IDLE');
    } else {
        setStatus('TARGETING');
        setSystemMessage({ text: 'Tactical Targeting Engaged', type: 'success' });
        setTimeout(() => setSystemMessage(null), 3000);
    }
  };

  const handleToggleDiscoveryMode = () => {
    if (streetViewConfig || status === 'FLYING') return;

    if (status === 'DISCOVERY') {
        setStatus('IDLE');
    } else {
        setStatus('DISCOVERY');
        setSystemMessage({ text: 'Intel Scanner: Active', type: 'info' });
        setTimeout(() => setSystemMessage(null), 3000);
    }
  };

  const isTargeting = status === 'TARGETING';
  const isDiscovery = status === 'DISCOVERY';

  // Status visual configuration
  const statusConfig = {
    'IDLE': { label: 'TRAVERSE STANDBY', style: 'text-neutral-500 border-neutral-700/50 bg-neutral-900/50' },
    'TARGETING': { label: 'TACTICAL LOCK', style: 'text-red-400 border-red-500/50 bg-red-900/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]' },
    'DISCOVERY': { label: 'INTEL SCANNER', style: 'text-cyan-400 border-cyan-500/50 bg-cyan-900/50 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.3)]' },
    'FLYING': { label: 'TRAJECTORY LOCKED', style: 'text-emerald-400 border-emerald-500/50 bg-emerald-900/50' },
    'STREETVIEW_LOADING': { label: 'ESTABLISHING OPTICAL LINK...', style: 'text-yellow-400 border-yellow-500/50 bg-yellow-900/50 animate-pulse' },
    'STREETVIEW_READY': { label: 'OPTICAL LINK ONLINE', style: 'text-green-400 border-green-500/50 bg-green-900/50' },
    'ERROR': { label: 'SYSTEM MALFUNCTION', style: 'text-red-500 border-red-500 bg-red-950' }
  }[status] || { label: 'UNKNOWN', style: 'text-neutral-500' };

  return (
    <div className="flex flex-col gap-4 pointer-events-auto items-end">
      {/* Test Controls */}
      <div className="flex gap-2 p-2 rounded-xl backdrop-blur-md bg-neutral-900/50 border border-white/10 shadow-lg">
        <button
          onClick={handleFlyToParis}
          className="p-3 text-white transition-all hover:bg-white/10 rounded-lg flex items-center gap-2 group"
          title="Fly to Paris"
        >
          <Navigation className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
          <span className="text-sm font-medium">Paris</span>
        </button>
        <div className="w-px bg-white/20 mx-1" />
        <button
          onClick={handleAddChicagoMuseums}
          className="p-3 text-white transition-all hover:bg-white/10 rounded-lg flex items-center gap-2 group"
          title="Add Chicago Museums"
        >
          <MapPin className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />
          <span className="text-sm font-medium">Chicago</span>
        </button>
      </div>

      {/* Status Indicator */}
      <div className={`
        px-4 py-2 rounded-lg backdrop-blur-xl border 
        font-mono text-[10px] font-bold tracking-[0.2em] uppercase
        transition-all duration-300 ease-in-out
        ${statusConfig.style}
      `}>
        {statusConfig.label}
      </div>

      {/* Main Actions */}
      <div className="flex items-center justify-center gap-4 p-4 rounded-2xl backdrop-blur-xl bg-neutral-900/60 border border-white/10 shadow-2xl">
        
        {/* Discovery Mode (Blue) */}
        <button 
          onClick={handleToggleDiscoveryMode}
          className={`
            p-4 rounded-full transition-all duration-300 border
            ${isDiscovery 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)]' 
                : 'bg-white/5 text-blue-500/50 border-blue-500/20 hover:bg-blue-500/10 hover:scale-105 hover:text-blue-400'}
          `}
          title={isDiscovery ? "Disable Intel Scanner" : "Enable Intel Scanner"}
        >
          <Search className="w-6 h-6" />
        </button>

        <div className="w-px h-8 bg-white/10" />

        {/* Targeting/Sniper Mode (Red) */}
        <button 
          onClick={handleToggleTargetingMode}
          className={`
            p-4 rounded-full transition-all duration-300 border
            ${isTargeting 
                ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                : 'bg-white/5 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 hover:scale-105 hover:text-purple-300'}
          `}
          title={isTargeting ? "Disengage Tactical Lock" : "Engage Tactical Lock"}
        >
          <ScanEye className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default ControlTray;