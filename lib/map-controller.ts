import { Coordinates } from '../types';

export class MapController {
  public mapElement: google.maps.maps3d.Map3DElement;
  private elevationService: google.maps.ElevationService | null = null;
  private streetViewService: google.maps.StreetViewService | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  
  // History state for "Undo" functionality
  private preDiveState: google.maps.maps3d.CameraState | null = null;

  constructor(mapElement: google.maps.maps3d.Map3DElement) {
    this.mapElement = mapElement;
  }

  /**
   * Initialize all Google Maps services in one go.
   */
  public initServices(services: {
      elevation?: google.maps.ElevationService;
      streetView?: google.maps.StreetViewService;
      geocoder?: google.maps.Geocoder;
  }) {
      if (services.elevation) this.elevationService = services.elevation;
      if (services.streetView) this.streetViewService = services.streetView;
      if (services.geocoder) this.geocoder = services.geocoder;
  }

  /**
   * Standardized event listener wrapper.
   * Returns a cleanup function.
   */
  public addListener(eventName: string, handler: (e: Event) => void): () => void {
      this.mapElement.addEventListener(eventName, handler);
      return () => this.mapElement.removeEventListener(eventName, handler);
  }

  // --- Private Helpers ---

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private getDistanceInKm(start: { lat: number; lng: number }, end: { lat: number; lng: number }): number {
    if (!start || !end) return 0;
    const R = 6371; 
    const dLat = this.deg2rad(end.lat - start.lat);
    const dLon = this.deg2rad(end.lng - start.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(start.lat)) * Math.cos(this.deg2rad(end.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateDuration(distanceKm: number): number {
    if (distanceKm < 5) return 2000;      
    if (distanceKm < 1000) return 3500;   
    return 5000;                          
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getElevation(lat: number, lng: number): Promise<number> {
      if (!this.elevationService) return 0;
      try {
          const result = await this.elevationService.getElevationForLocations({
              locations: [{ lat, lng }],
          });
          if (result.results && result.results[0]) {
              return result.results[0].elevation;
          }
      } catch (e) {
          console.warn('[MapController] Failed to fetch elevation', e);
      }
      return 0;
  }

  // --- Public Methods ---

  /**
   * Reverse geocodes a coordinate to find a Place ID and Name.
   */
  public async identifyLocation(coords: Coordinates): Promise<{ placeId?: string; title: string }> {
      if (!this.geocoder) return { title: 'Designated Waypoint' };
      
      try {
          const response = await this.geocoder.geocode({ location: { lat: coords.lat, lng: coords.lng } });
          if (response.results && response.results.length > 0) {
              return { 
                  placeId: response.results[0].place_id,
                  title: 'Identifying...' // The marker component will fetch the display name
              };
          }
      } catch (e) {
          console.warn('[MapController] Geocoding failed', e);
      }
      return { title: 'Designated Waypoint' };
  }

  /**
   * Abstraction for finding the nearest Street View panorama.
   */
  public async findNearestPanorama(
    target: Coordinates, 
    radius: number = 50
  ): Promise<{ panoId: string; location: Coordinates } | null> {
    if (!this.streetViewService) {
        console.warn('[MapController] StreetViewService is not initialized yet.');
        return null;
    }

    try {
        console.log(`[MapController] Searching for pano near ${target.lat.toFixed(5)}, ${target.lng.toFixed(5)} (r=${radius})`);
        const { data } = await this.streetViewService.getPanorama({
            location: { lat: target.lat, lng: target.lng },
            radius: radius,
            preference: google.maps.StreetViewPreference.NEAREST
        });

        const panoId = data.location?.pano;
        const lat = data.location?.latLng?.lat();
        const lng = data.location?.latLng?.lng();

        if (panoId && lat !== undefined && lng !== undefined) {
            console.log(`[MapController] Pano found: ${panoId}`);
            return {
                panoId,
                location: { lat, lng }
            };
        } else {
            console.warn('[MapController] API returned OK but missing pano/latlng data', data);
        }
    } catch (e) {
        console.error('[MapController] StreetViewService Error (Possible Quota or Network):', e);
        return null;
    }
    return null;
  }

  public flyTo(
    center: Coordinates,
    options: {
      tilt?: number;
      heading?: number;
      range?: number;
      durationMillis?: number;
    } = {}
  ) {
    const currentCenter = this.mapElement.center || { lat: 0, lng: 0, altitude: 0 };
    
    // Smart Defaults: Use current map state if option is missing
    const currentHeading = this.mapElement.heading || 0;
    const currentTilt = this.mapElement.tilt || 0;
    const currentRange = this.mapElement.range || 2000;

    const distance = this.getDistanceInKm(currentCenter, center);
    const duration = options.durationMillis ?? this.calculateDuration(distance);
    
    this.mapElement.flyCameraTo({
      endCamera: {
        center: {
            lat: center.lat,
            lng: center.lng,
            altitude: center.altitude || 0
        },
        tilt: options.tilt ?? currentTilt,
        heading: options.heading ?? currentHeading,
        range: options.range ?? currentRange,
        roll: 0,
      },
      durationMillis: duration,
    });
  }

  public async frameEntities(locations: Coordinates[]) {
    if (locations.length === 0) return;

    let sumLat = 0;
    let sumLng = 0;
    
    locations.forEach(loc => {
      sumLat += loc.lat;
      sumLng += loc.lng;
    });

    const centerLat = sumLat / locations.length;
    const centerLng = sumLng / locations.length;

    let maxLatDiff = 0;
    let maxLngDiff = 0;

    locations.forEach(loc => {
      maxLatDiff = Math.max(maxLatDiff, Math.abs(loc.lat - centerLat));
      maxLngDiff = Math.max(maxLngDiff, Math.abs(loc.lng - centerLng));
    });

    const spread = Math.max(maxLatDiff, maxLngDiff); 
    const spreadMeters = spread * 111000;
    const targetRange = spreadMeters > 0 ? spreadMeters * 3.5 : 1000;

    // Use centralized helper
    const altitude = await this.getElevation(centerLat, centerLng);

    this.flyTo(
      { lat: centerLat, lng: centerLng, altitude }, 
      {
        range: Math.max(targetRange, 500), 
        tilt: 45,
        heading: 0 
      }
    );
  }

  // --- Phase 2: Cinematic Dive Logic ---

  public async engageOpticalLock(visualTarget: Coordinates): Promise<void> {
    // 1. Snapshot State
    const c = this.mapElement.center; 
    this.preDiveState = {
        center: { lat: c.lat, lng: c.lng, altitude: c.altitude || 0 },
        tilt: this.mapElement.tilt,
        heading: this.mapElement.heading,
        range: this.mapElement.range,
        roll: this.mapElement.roll
    };

    // 2. UX Delay
    await this.wait(600);

    // 3. Elevation Correction
    let finalAltitude = visualTarget.altitude || 0;
    
    if (Math.abs(finalAltitude) < 0.1) {
        const elevation = await this.getElevation(visualTarget.lat, visualTarget.lng);
        if (elevation > 0) finalAltitude = elevation;
    }

    // 4. Execution: Fly In
    const currentRange = this.mapElement.range || 1500;
    const approachRange = Math.min(currentRange, 50);

    this.mapElement.flyCameraTo({
        endCamera: {
            center: { lat: visualTarget.lat, lng: visualTarget.lng, altitude: finalAltitude },
            tilt: this.mapElement.tilt,
            heading: this.mapElement.heading,
            range: approachRange,
            roll: 0
        },
        durationMillis: 1500
    });

    // 5. Wait for flight to finish
    await this.wait(1600);
  }

  public disengageOpticalLock() {
    if (this.preDiveState) {
        const { heading, range, center, tilt, roll } = this.preDiveState;

        this.mapElement.flyCameraTo({
            endCamera: {
                center: center, 
                tilt: tilt,     
                heading: heading,
                range: range,   
                roll: roll || 0
            },
            durationMillis: 2000
        });
        
        this.preDiveState = null;
    } else {
        const currentCenter = this.mapElement.center;
        this.flyTo(
            { lat: currentCenter.lat, lng: currentCenter.lng, altitude: 0 },
            { range: 1500, tilt: 45, durationMillis: 2500 }
        );
    }
  }
}