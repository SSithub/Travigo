import React, { useState } from 'react';
import { X, Navigation, Play, Square, MapPin, Clock, Footprints, Car, Train, Bike } from 'lucide-react';
import { useMapStore } from '../lib/state';

const RouteCard: React.FC = () => {
  const { routeInfo, setRouteInfo, setCommand, status, setStatus } = useMapStore();
  const [flyThroughInterval, setFlyThroughInterval] = useState<any>(null);

  if (!routeInfo) return null;

  const handleClose = () => {
    setRouteInfo(null);
    stopFlyThrough();
  };

  const startFlyThrough = () => {
    if (!routeInfo || routeInfo.polyline.length === 0) return;
    
    setStatus('ROUTE_FLYTHROUGH');
    
    let currentIndex = 0;
    const path = routeInfo.polyline;
    
    // Initial jump to start
    setCommand({
        type: 'FLY_TO',
        target: {
            center: path[0],
            tilt: 65,
            heading: 0,
            range: 150
        }
    });

    // Simple animation loop
    const interval = setInterval(() => {
        currentIndex += 2; // Skip some points for speed
        if (currentIndex >= path.length - 1) {
            stopFlyThrough();
            return;
        }

        const current = path[currentIndex];
        const next = path[currentIndex + 1];
        
        // Calculate heading
        const lat1 = current.lat * Math.PI / 180;
        const lng1 = current.lng * Math.PI / 180;
        const lat2 = next.lat * Math.PI / 180;
        const lng2 = next.lng * Math.PI / 180;
        
        const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
        const heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

        setCommand({
            type: 'FLY_TO',
            target: {
                center: current,
                tilt: 65,
                heading: heading,
                range: 150
            }
        });
    }, 1000); // Update every second

    setFlyThroughInterval(interval);
  };

  const stopFlyThrough = () => {
    if (flyThroughInterval) {
        clearInterval(flyThroughInterval);
        setFlyThroughInterval(null);
    }
    if (status === 'ROUTE_FLYTHROUGH') {
        setStatus('IDLE');
        // Re-frame the route
        if (routeInfo) {
            setCommand({
                type: 'FIT_BOUNDS',
                targets: [
                    { lat: routeInfo.bounds.north, lng: routeInfo.bounds.east },
                    { lat: routeInfo.bounds.south, lng: routeInfo.bounds.west }
                ]
            });
        }
    }
  };

  const getModeIcon = () => {
      switch (routeInfo.travelMode) {
          case 'WALKING': return <Footprints className="w-5 h-5" />;
          case 'DRIVING': return <Car className="w-5 h-5" />;
          case 'BICYCLING': return <Bike className="w-5 h-5" />;
          case 'TRANSIT': return <Train className="w-5 h-5" />;
          default: return <Navigation className="w-5 h-5" />;
      }
  };

  const isFlying = status === 'ROUTE_FLYTHROUGH';

  return (
    <div className="w-80 bg-black/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden z-40 flex flex-col pointer-events-auto">
      {/* Header */}
      <div className="bg-blue-900/40 px-4 py-3 flex justify-between items-center border-b border-blue-500/30">
        <div className="flex items-center gap-2 text-blue-400">
          {getModeIcon()}
          <span className="font-mono text-sm uppercase tracking-wider font-semibold">
            {routeInfo.travelMode} ROUTE
          </span>
        </div>
        <button 
          onClick={handleClose}
          className="text-blue-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4">
        
        <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2 text-gray-300">
                <MapPin className="w-4 h-4 mt-1 text-gray-500 shrink-0" />
                <span className="text-sm line-clamp-2">{routeInfo.origin}</span>
            </div>
            <div className="flex items-start gap-2 text-white">
                <MapPin className="w-4 h-4 mt-1 text-blue-400 shrink-0" />
                <span className="text-sm font-medium line-clamp-2">{routeInfo.destination}</span>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-lg p-3 flex flex-col items-center justify-center border border-white/10">
                <Navigation className="w-5 h-5 text-blue-400 mb-1" />
                <span className="text-lg font-bold text-white">{routeInfo.distance}</span>
            </div>
            <div className="bg-white/5 rounded-lg p-3 flex flex-col items-center justify-center border border-white/10">
                <Clock className="w-5 h-5 text-blue-400 mb-1" />
                <span className="text-lg font-bold text-white">{routeInfo.duration}</span>
            </div>
        </div>

        {/* Action Button */}
        <button
            onClick={isFlying ? stopFlyThrough : startFlyThrough}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isFlying 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)]'
            }`}
        >
            {isFlying ? (
                <>
                    <Square className="w-5 h-5 fill-current" />
                    STOP FLY-THROUGH
                </>
            ) : (
                <>
                    <Play className="w-5 h-5 fill-current" />
                    START FLY-THROUGH
                </>
            )}
        </button>

      </div>
    </div>
  );
};

export default RouteCard;
