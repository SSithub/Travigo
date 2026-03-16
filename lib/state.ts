import { create } from 'zustand';
import { Coordinates, MapMarker, CameraTarget, StreetViewConfig, AppStatus, MapCommand, StrategicIntel } from '../types';
import { MapController } from './map-controller';

interface SystemMessage {
  text: string;
  type: 'error' | 'success' | 'info';
}

export interface LogEntry {
  id: string;
  text: string;
  source: 'system' | 'user' | 'ai';
  timestamp: number;
}

export interface PersonaConfig {
  name: string;
  role: string;
  voice: string;
  systemInstruction: string;
  contextSummary?: string; // What happened in this session
  isDefault?: boolean;
}

interface MapState {
  markers: MapMarker[];
  cameraTarget: CameraTarget | null;
  selectedMarkerId: string | null;
  
  // The Reactive Bridge
  activeCommand: MapCommand | null;

  // Controller Reference
  mapController: MapController | null;

  // State Machine
  status: AppStatus;
  streetViewConfig: StreetViewConfig | null;
  streetViewLoaded: boolean;

  // Global System Messaging (Toast)
  systemMessage: SystemMessage | null;

  // UI Visibility State
  isControlTrayVisible: boolean;

  // Application Mode
  appMode: 'concierge' | 'game';
  
  // Dynamic Persona State
  activePersona: PersonaConfig | null;
  isPersonaChanging: boolean;

  // Strategic Intel Overlay
  strategicIntel: StrategicIntel | null;

  // Tour State
  activeTourIndex: number | null;
  startTour: () => void;
  nextTourStop: () => void;
  endTour: () => void;

  // System Logs
  logs: LogEntry[];
  
  // Actions
  setMarkers: (markers: MapMarker[]) => void;
  addMarker: (marker: MapMarker) => void;
  clearMarkers: () => void;
  setCameraTarget: (target: CameraTarget) => void;
  setSelectedMarkerId: (id: string | null) => void;
  
  // Command Actions
  setCommand: (command: MapCommand) => void;
  clearCommand: () => void;

  setMapController: (controller: MapController | null) => void;
  
  // Transition Actions
  setStreetViewConfig: (config: StreetViewConfig | null) => void;
  setStreetViewLoaded: (loaded: boolean) => void;
  setStatus: (status: AppStatus) => void;
  
  setSystemMessage: (message: SystemMessage | null) => void;
  
  toggleControlTray: () => void;
  setAppMode: (mode: 'concierge' | 'game') => void;

  setActivePersona: (persona: PersonaConfig | null) => void;
  setPersonaChanging: (isChanging: boolean) => void;

  setStrategicIntel: (intel: StrategicIntel | null) => void;

  addLog: (message: string, source?: 'system' | 'user' | 'ai') => void;
  streamLog: (message: string, source: 'user' | 'ai') => void;
  clearLogs: () => void;
  
  // Dive Action
  performOpticalDive: (coords: Coordinates) => Promise<boolean>;
}

export const useMapStore = create<MapState>((set, get) => ({
  markers: [],
  cameraTarget: null,
  selectedMarkerId: null,
  activeCommand: null,
  mapController: null,
  
  status: 'IDLE',
  streetViewConfig: null,
  streetViewLoaded: false,
  
  systemMessage: null,
  isControlTrayVisible: false,
  appMode: 'concierge', // Default mode
  activePersona: null,
  isPersonaChanging: false,
  strategicIntel: null,
  activeTourIndex: null,
  logs: [],

  setMarkers: (markers) => set({ markers, selectedMarkerId: null }),
  addMarker: (marker) => set((state) => ({ markers: [...state.markers, marker] })),
  clearMarkers: () => set({ markers: [], selectedMarkerId: null }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  setSelectedMarkerId: (id) => set({ selectedMarkerId: id }),
  
  setCommand: (command) => set({ activeCommand: command }),
  clearCommand: () => set({ activeCommand: null }),

  setMapController: (controller) => set({ mapController: controller }),
  
  setStreetViewConfig: (config) => set((state) => {
    if (config === null) {
      return { streetViewConfig: null, status: 'IDLE', streetViewLoaded: false };
    }
    return { streetViewConfig: config, status: 'FLYING', streetViewLoaded: false };
  }),

  setStreetViewLoaded: (loaded) => set({ streetViewLoaded: loaded }),
  
  setStatus: (status) => {
    set({ status });
  },
  
  setSystemMessage: (message) => set({ systemMessage: message }),

  toggleControlTray: () => set((state) => ({ isControlTrayVisible: !state.isControlTrayVisible })),
  
  setAppMode: (mode) => set({ appMode: mode }),

  setActivePersona: (persona) => set({ activePersona: persona }),
  setPersonaChanging: (isChanging) => set({ isPersonaChanging: isChanging }),

  setStrategicIntel: (intel) => set({ strategicIntel: intel, activeTourIndex: null }),

  startTour: () => set({ activeTourIndex: 0 }),
  nextTourStop: () => set((state) => ({ 
    activeTourIndex: state.activeTourIndex !== null ? state.activeTourIndex + 1 : null 
  })),
  endTour: () => set({ activeTourIndex: null }),

  addLog: (text: string, source: 'system' | 'user' | 'ai' = 'system') => set((state) => {
    const prefix = source === 'ai' ? '🤖 AI' : source === 'user' ? '👤 USER' : '⚙️ SYS';
    console.log(`${prefix}: ${text}`);

    const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(7),
        text,
        source,
        timestamp: Date.now()
    };
    const newLogs = [...state.logs, newEntry];
    if (newLogs.length > 50) newLogs.shift();
    return { logs: newLogs };
  }),

  streamLog: (text: string, source: 'user' | 'ai') => set((state) => {
    const logs = [...state.logs];
    const lastLog = logs[logs.length - 1];

    if (lastLog && lastLog.source === source) {
        lastLog.text += text;
        logs[logs.length - 1] = { ...lastLog };
        return { logs };
    } else {
        const newEntry: LogEntry = {
            id: Math.random().toString(36).substring(7),
            text,
            source,
            timestamp: Date.now()
        };
        const newLogs = [...logs, newEntry];
        if (newLogs.length > 50) newLogs.shift();
        return { logs: newLogs };
    }
  }),

  clearLogs: () => set({ logs: [] }),
  
  performOpticalDive: async (coords: Coordinates) => {
      set({ activeCommand: { type: 'DIVE', target: coords } });
      return true;
  }
}));