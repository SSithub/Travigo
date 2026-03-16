import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { MapMarker, Coordinates, StrategicIntel } from '../types';
import { useMapStore, PersonaConfig } from "./state";
import { GEMINI_API_KEY } from "./config";

// Restrict voices to those supported by Gemini Live API
export const AVAILABLE_VOICES_FULL = [
  { name: 'Aoede', description: 'Breezy, Middle pitch' },
  { name: 'Charon', description: 'Informative, Lower pitch' },
  { name: 'Fenrir', description: 'Excitable, Lower middle pitch' },
  { name: 'Kore', description: 'Firm, Middle pitch' },
  { name: 'Puck', description: 'Upbeat, Middle pitch' },
  { name: 'Zephyr', description: 'Bright, Higher pitch' },
];

/**
 * MapsProxy Service
 * Acts as the bridge between Gemini Live (Conversational) and Gemini Pro (Reasoning/Grounding).
 * It also handles raw Maps API calls like Geocoding to keep the client logic pure.
 */
export class MapsProxyService {
  private genAI: GoogleGenAI;
  private geocoder: google.maps.Geocoder | null = null;
  private directionsService: google.maps.DirectionsService | null = null;

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  /**
   * Initializes Google Maps Services if available in the window.
   */
  private initMapsServices() {
    if (typeof google !== 'undefined' && google.maps) {
      if (!this.geocoder) {
        this.geocoder = new google.maps.Geocoder();
      }
      if (!this.directionsService) {
        this.directionsService = new google.maps.DirectionsService();
      }
    }
  }

  /**
   * Geocodes a text address to coordinates.
   */
  public async geocode(address: string): Promise<Coordinates | null> {
    this.initMapsServices();
    if (!this.geocoder) {
      console.error("MapsProxy: Geocoder not initialized.");
      return null;
    }

    try {
      const response = await this.geocoder.geocode({ address });
      if (response.results && response.results.length > 0) {
        const loc = response.results[0].geometry.location;
        return { lat: loc.lat(), lng: loc.lng() };
      }
    } catch (e: any) {
      // Handle the specific ZERO_RESULTS case gracefully
      if (e.code === 'ZERO_RESULTS' || (e.message && e.message.includes('ZERO_RESULTS'))) {
        console.warn(`MapsProxy: Geocoding found no results for "${address}"`);
        return null;
      }
      console.error("MapsProxy: Geocode failed", e);
    }
    return null;
  }

  /**
   * Reverse Geocoding Helper
   */
  public async reverseGeocode(coords: Coordinates): Promise<string> {
    this.initMapsServices();
    if (!this.geocoder) return `${coords.lat}, ${coords.lng}`;
    try {
      const res = await this.geocoder.geocode({ location: { lat: coords.lat, lng: coords.lng } });
      if (res.results && res.results.length > 0) return res.results[0].formatted_address;
    } catch (e) {
      console.warn("MapsProxy: Reverse geocode failed", e);
    }
    return `${coords.lat}, ${coords.lng}`;
  }

  /**
   * THE CASTING DIRECTOR: Generates a local persona for Street View
   */
  public async generateLocalPersona(location: Coordinates, context: string, mode: 'concierge' | 'game'): Promise<PersonaConfig | null> {
    const logPrefix = mode === 'game' ? 'Dungeon Master' : 'Casting Director';
    useMapStore.getState().addLog(`${logPrefix}: Scanning signal at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}...`, 'system');

    try {
      const address = await this.reverseGeocode(location);
      const voicesList = AVAILABLE_VOICES_FULL.map(v => `${v.name} (${v.description})`).join(', ');

      let prompt = "";

      if (mode === 'concierge') {
        // REALISTIC LOCAL
        prompt = `
                You are a Casting Director for an interactive travel simulation.
                The user is "diving" into Street View at this location: ${address}.
                Current Context: "${context}"
    
                Task: Create a fictional "Local Persona" that the user might encounter here.
                
                Rules:
                1. The persona must fit the location (e.g., a Baker in Paris, a Tech Bro in SF, a Grandmother in Rome).
                2. Assign a specific Voice from the list below that matches their age/gender/vibe.
                3. They MUST speak English, but should use local greetings/idioms.
                4. The 'systemInstruction' should fully embody this character.
    
                Available Voices: 
                ${voicesList}
    
                Return ONLY valid JSON:
                {
                    "name": "string (Name of character)",
                    "role": "string (Job/Role)",
                    "voiceName": "string (Must be one of the names from list)",
                    "greeting": "string (A short, natural spoken greeting)",
                    "systemInstruction": "string (Full persona instructions for the AI)",
                    "contextSummary": "string (Brief summary of who they are)"
                }
              `;
      } else {
        // GAME MODE: ENTITY / OBJECT
        prompt = `
                You are the Dungeon Master for a mystical location-based game.
                The user has successfully found this location: ${address}.
                
                Task: Personify the LANDMARK itself, or a key OBJECT/SPIRIT associated with it.
                
                Rules:
                1. DO NOT create a human. Create the "Spirit of the Eiffel Tower", "The Mona Lisa", "A New York Pizza Slice", "The Lincoln Memorial Statue".
                2. The persona should speak in the first person ("I have stood here for centuries...", "I am made of cheesy goodness...").
                3. Choose a voice that fits the object (Deep/Gravelly for stone/buildings, Soft for art, High for small objects).
                4. They are congratulating the user on finding them.
                5. CRITICAL: Include in their instructions that they can use the 'exit_street_view' tool if the user asks to go back or if the conversation ends.
                
                Available Voices: 
                ${voicesList}
    
                Return ONLY valid JSON:
                {
                    "name": "string (e.g. 'The Iron Lady', 'Slice of Pepperoni')",
                    "role": "string (e.g. 'Historical Monument', 'Fast Food Icon')",
                    "voiceName": "string (Must be one of the names from list)",
                    "greeting": "string (A short, thematic greeting in character)",
                    "systemInstruction": "string (You are this object. Speak as it. Be creative and immersive.)",
                    "contextSummary": "string (Brief summary of who/what they are)"
                }
              `;
      }

      const response = await this.genAI.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      const jsonText = response.text || "{}";
      const data = JSON.parse(jsonText);

      if (!data.name || !data.voiceName) throw new Error("Invalid Persona Data");

      return {
        name: data.name,
        role: data.role,
        voice: data.voiceName,
        systemInstruction: `
                ${data.systemInstruction}
                
                CRITICAL INSTRUCTION:
                You are currently talking to the user via a live audio link. 
                They have just arrived at your location in Street View.
                Your first sentence MUST be: "${data.greeting}"
                
                Additional Tool Use:
                If the user says they are done, wants to go back, or if your interaction feels complete, you may call the \`exit_street_view\` tool to send them back to the host.
              `,
        contextSummary: data.contextSummary,
        isDefault: false
      };

    } catch (e) {
      console.error(`${logPrefix} Failed:`, e);
      return null;
    }
  }

  /**
   * THE SCOUT: Standard Maps Grounding (Gemini 2.5 Flash)
   */
  public async performGroundedSearch(query: string, locationBias?: string): Promise<{ summary: string, markers: MapMarker[] }> {
    this.initMapsServices();
    useMapStore.getState().addLog(`Scout: Scanning for "${query}"...`, 'system');

    try {
      const model = 'gemini-2.5-flash';
      const prompt = `Find places matching this request: "${query}". ${locationBias ? `Focus on area: ${locationBias}.` : ''} Return a summary.`;

      const response = await this.genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }]
        }
      });

      const summary = response.text || "I found some places.";

      const candidate = response.candidates?.[0];
      const chunks = candidate?.groundingMetadata?.groundingChunks || [];

      const markers: MapMarker[] = [];

      if (chunks.length > 0 && this.geocoder) {
        const resolutionPromises = chunks.map(async (chunk) => {
          if (chunk.maps?.placeId) {
            const rawId = chunk.maps.placeId;
            const placeId = rawId.startsWith('places/') ? rawId.replace('places/', '') : rawId;
            const title = chunk.maps.title || "Unknown Place";

            try {
              const geoResponse = await this.geocoder!.geocode({ placeId });

              if (geoResponse.results && geoResponse.results.length > 0) {
                const res = geoResponse.results[0];
                const loc = res.geometry.location;

                return {
                  id: placeId,
                  placeId: placeId,
                  title: title,
                  position: {
                    lat: loc.lat(),
                    lng: loc.lng()
                  },
                  groundingMetadata: {
                    summary: title,
                    types: res.types
                  }
                } as MapMarker;
              }
            } catch (err) {
              console.warn(`[MapsProxy] Failed to resolve place ${title}`, err);
            }
          }
          return null;
        });

        const results = await Promise.all(resolutionPromises);
        results.forEach(m => {
          if (m) markers.push(m);
        });
      }

      return { summary, markers };

    } catch (e) {
      console.error("MapsProxy Error:", e);
      return { summary: "The Scout database is currently offline.", markers: [] };
    }
  }

  /**
   * THE STRATEGIST: Deep Analysis (Gemini 3 Pro)
   */
  public async performStrategicAnalysis(query: string, mode: 'TRAVISA' | 'TRAVISTORY' = 'TRAVISA'): Promise<{ summary: string, markers: MapMarker[], rawIntel: StrategicIntel }> {
    this.initMapsServices();
    useMapStore.getState().addLog(`Strategist: Analyzing "${query}"...`, 'system');
    useMapStore.getState().setSystemMessage({ text: 'TRAVERSE CORE: REASONING...', type: 'info' });

    try {
      const persona = mode === 'TRAVISA'
        ? "You are an expert global mobility consultant and security analyst. Focus on visa rules, digital nomad logistics, and safety."
        : "You are an expert historian and cultural anthropologist. Focus on historical accuracy, timelines, and cultural significance.";

      const prompt = `
            ${persona}
            Analyze this request: "${query}". 
            Use Google Search to verify facts. 
            Think step-by-step about the logical order and feasibility.
            
            Produce a JSON object with this EXACT structure:
            {
                "mission_name": "string (Short code name for mission)",
                "strategic_summary": "string (Detailed actionable summary)",
                "risk_factors": "string (Risk assessment: Low, Moderate, High, Critical)",
                "isTour": "boolean (true if the user is asking for a sequence, route, or tour)",
                "tourThemeColor": "string (Hex color code for the 3D route line, e.g., '#FF00FF')",
                "waypoints": [
                    { 
                        "name": "string", 
                        "address": "string", 
                        "significance": "string", 
                        "type": "string",
                        "narration": "string (What the persona should say when arriving at this stop)"
                    }
                ]
            }
            
            IMPORTANT: Return ONLY valid JSON. Do not include markdown formatting, backticks, or introductory text.
        `;

      const response = await this.genAI.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } // Enable Reasoning
        }
      });

      let jsonText = response.text || "{}";

      // Robust JSON Extraction
      // Sometimes Gemini 3 Pro adds conversational intro text despite instructions.
      // We find the first '{' and the last '}' to isolate the JSON object.
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      } else {
        // Fallback cleanup if braces aren't found in a complex way
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      let plan: StrategicIntel;
      try {
        plan = JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse JSON from Strategist:", jsonText);
        // Provide a soft landing so the UI doesn't crash
        plan = {
          mission_name: "RAW_INTEL_FAILURE",
          strategic_summary: response.text || "Analysis complete but unformatted.",
          risk_factors: "UNKNOWN",
          isTour: false,
          tourThemeColor: "#FF0000",
          waypoints: []
        };
      }

      const summary = `${plan.mission_name || 'Mission'}: ${plan.strategic_summary} (Risk: ${plan.risk_factors})`;
      const markers: MapMarker[] = [];

      // Enrich Waypoints with Geocoding
      if (plan.waypoints && Array.isArray(plan.waypoints) && this.geocoder) {
        const geoPromises = plan.waypoints.map(async (wp, index) => {
          try {
            const geoRes = await this.geocoder!.geocode({ address: wp.address });
            if (geoRes.results && geoRes.results.length > 0) {
              const loc = geoRes.results[0].geometry.location;
              const coords = { lat: loc.lat(), lng: loc.lng() };

              // Enrich raw intel with coords for UI click-to-fly
              plan.waypoints[index].position = coords;

              return {
                id: `strategic-${Math.random().toString(36).substr(2, 9)}`,
                title: wp.name,
                description: wp.significance,
                position: coords,
                groundingMetadata: {
                  summary: wp.significance,
                  types: [wp.type]
                }
              } as MapMarker;
            }
          } catch (e) {
            console.warn(`Failed to geocode waypoint: ${wp.name}`);
          }
          return null;
        });

        const results = await Promise.all(geoPromises);
        results.forEach(m => { if (m) markers.push(m); });
      }

      return { summary, markers, rawIntel: plan };

    } catch (e: any) {
      console.error("TRAVERSE Core Error:", e);
      useMapStore.getState().setSystemMessage({ text: 'TRAVERSE CORE FAILURE', type: 'error' });
      return {
        summary: "Strategic Analysis failed. The Core is unresponsive.",
        markers: [],
        rawIntel: { mission_name: "ERROR", strategic_summary: "System Failure", risk_factors: "CRITICAL", isTour: false, tourThemeColor: "#FF0000", waypoints: [] }
      };
    }
  }
}

export const mapsProxy = new MapsProxyService();