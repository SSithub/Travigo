export interface Coordinates {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface MapMarker {
  id: string;
  position: Coordinates;
  title: string;
  description?: string;
  placeId?: string;
  // Rich data from Grounding
  groundingMetadata?: {
    summary?: string;
    rating?: number;
    userRatingCount?: number;
    websiteUri?: string;
    types?: string[];
  };
}

export interface CameraTarget {
  center: Coordinates;
  tilt: number;
  heading: number;
  range: number;
}

export interface StreetViewConfig {
  position: Coordinates;
  panoId: string;
}

// The Reactive Bridge Commands
export type MapCommand = 
  | { type: 'FLY_TO'; target: CameraTarget }
  | { type: 'FIT_BOUNDS'; targets: Coordinates[] }
  | { type: 'DIVE'; target: Coordinates }
  | { type: 'ORBIT'; center: Coordinates };

export type AppStatus = 
  | 'IDLE'               // Standard Navigation
  | 'TARGETING'          // Red Cursor: Waiting for user to pick a target
  | 'DISCOVERY'          // Blue Cursor: Waiting for user to identify a place
  | 'FLYING'             // Cinematic Camera Movement (Dive/FlyTo)
  | 'STREETVIEW_LOADING' // Optical Dive complete, waiting for Tiles
  | 'STREETVIEW_READY'   // Fully interactive Street View
  | 'ROUTE_FLYTHROUGH'   // Animating along a route
  | 'ERROR';

export interface StrategicWaypoint {
    name: string;
    address: string;
    significance: string;
    type: string;
    position?: Coordinates; // Enriched with coords if geocoded
    narration?: string; // What the persona should say when arriving at this stop
}

export interface StrategicIntel {
    mission_name: string;
    strategic_summary: string;
    risk_factors: string;
    isTour?: boolean;
    tourThemeColor?: string;
    waypoints: StrategicWaypoint[];
}