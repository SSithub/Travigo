import React from 'react';

// This file augments the Google Maps type definitions to support the experimental 3D maps library.

declare global {
  namespace google.maps {
    // Stub for ElevationService if missing in standard types
    class ElevationService {
      getElevationForLocations(request: any): Promise<any>;
    }

    interface StreetViewPanoramaData {
        location?: {
            pano?: string;
            latLng?: { lat: () => number; lng: () => number };
        };
    }

    class StreetViewService {
      getPanorama(request: any): Promise<{ data: StreetViewPanoramaData }>;
    }
    
    interface MapsEventListener {
        remove(): void;
    }

    class StreetViewPanorama {
      constructor(container: Element, opts?: any);
      getPosition(): { lat: () => number; lng: () => number } | null | undefined;
      setPov(pov: { heading: number; pitch: number }): void;
      setZoom(zoom: number): void;
      setVisible(flag: boolean): void;
      addListener(eventName: string, handler: (e: any) => void): MapsEventListener;
      getStatus(): string;
    }

    namespace event {
        function removeListener(listener: MapsEventListener): void;
        function addListener(instance: any, eventName: string, handler: Function): MapsEventListener;
        function trigger(instance: any, eventName: string, ...args: any[]): void;
    }

    // Stub for Geocoder if missing in standard types
    class Geocoder {
      geocode(request: GeocoderRequest): Promise<GeocoderResponse>;
    }

    interface GeocoderRequest {
      address?: string;
      location?: { lat: number; lng: number } | any;
      placeId?: string;
      bounds?: any;
      componentRestrictions?: any;
      region?: string;
    }

    interface GeocoderResponse {
      results: GeocoderResult[];
    }

    interface GeocoderResult {
      address_components: any[];
      formatted_address: string;
      geometry: any;
      place_id: string;
      types: string[];
    }

    enum StreetViewPreference {
      NEAREST = 'nearest',
      BEST = 'best'
    }

    // Added Places Namespace definitions to fix missing type errors
    namespace places {
        class PlacesService {
            constructor(attrContainer: HTMLDivElement | Element);
            textSearch(request: TextSearchRequest, callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void): void;
            getDetails(request: PlaceDetailsRequest, callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void): void;
        }

        interface TextSearchRequest {
            query: string;
            location?: any;
            radius?: number;
            bounds?: any;
            type?: string;
            fields?: string[];
        }

        interface PlaceDetailsRequest {
            placeId: string;
            fields?: string[];
        }

        enum PlacesServiceStatus {
            OK = 'OK',
            ZERO_RESULTS = 'ZERO_RESULTS',
            INVALID_REQUEST = 'INVALID_REQUEST',
            OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
            REQUEST_DENIED = 'REQUEST_DENIED',
            UNKNOWN_ERROR = 'UNKNOWN_ERROR'
        }

        interface PlaceResult {
            place_id?: string;
            name?: string;
            geometry?: {
                location: { lat: () => number; lng: () => number };
                viewport?: any;
            };
            rating?: number;
            user_ratings_total?: number;
            types?: string[];
            business_status?: string;
            formatted_address?: string;
        }
    }

    namespace marker {
      interface PinElementOptions {
          scale?: number;
          background?: string;
          borderColor?: string;
          glyph?: string | URL; // Deprecated
          glyphSrc?: string | URL; // New standard
          glyphText?: string; // New standard
          glyphColor?: string;
      }
      class PinElement {
          constructor(options?: PinElementOptions);
          element: HTMLElement;
      }
    }
  }

  namespace google.maps.maps3d {
    interface Map3DElement extends HTMLElement {
      mode: 'SATELLITE' | 'HYBRID' | 'TERRAIN'; // Simplified modes
      center: { lat: number; lng: number; altitude?: number };
      tilt: number;
      heading: number;
      range: number;
      roll: number;
      defaultUIHidden: boolean;
      flyCameraTo(options: FlyCameraOptions): void;
      flyCameraAround(options: FlyCameraAroundOptions): void;
      addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
      removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    }

    interface FlyCameraOptions {
      endCamera: CameraState;
      durationMillis?: number;
    }

    interface FlyCameraAroundOptions {
        camera: CameraState;
        durationMillis?: number;
        rounds?: number;
    }

    interface CameraState {
      center: { lat: number; lng: number; altitude?: number };
      tilt?: number;
      heading?: number;
      range?: number;
      roll?: number;
    }

    interface Marker3DElement extends HTMLElement {
      position: { lat: number; lng: number; altitude?: number } | null;
      altitudeMode: 'RELATIVE_TO_GROUND' | 'ABSOLUTE' | 'CLAMP_TO_GROUND' | 'RELATIVE_TO_MESH';
      collisionBehavior: 'REQUIRED' | 'OPTIONAL_AND_HIDES_LOWER_PRIORITY' | 'REQUIRED_AND_HIDES_OPTIONAL';
      drawsWhenOccluded: boolean;
      label: string;
    }

    interface Marker3DInteractiveElement extends Marker3DElement {
      gmpPopoverTargetElement: Element | null;
      addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
      removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    }

    interface PopoverElement extends HTMLElement {
      open: boolean;
    }
  }

  interface HTMLElementTagNameMap {
    'gmp-map-3d': google.maps.maps3d.Map3DElement;
    'gmp-marker-3d': google.maps.maps3d.Marker3DElement;
    'gmp-marker-3d-interactive': google.maps.maps3d.Marker3DInteractiveElement;
    'gmp-popover': google.maps.maps3d.PopoverElement;
  }
}

export {};