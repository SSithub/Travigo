import { GoogleGenAI, Modality, Tool, FunctionDeclaration, Type } from "@google/genai";
import { AudioRecorder } from "./audio/audio-recorder";
import { AudioStreamer } from "./audio/audio-streamer";
import { useMapStore, PersonaConfig } from "./state";
import { mapsProxy } from "./maps-proxy";
import { Coordinates } from "../types";
import { GEMINI_API_KEY } from "./config";

// --- Tool Definitions ---

const navigateToLocation: FunctionDeclaration = {
  name: "navigate_to_location",
  description: "Moves the 3D map camera to a specific city, landmark, or address. Use this when the user asks to go somewhere or fly to a location.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      destination: {
        type: Type.STRING,
        description: "The name of the location (e.g., 'Paris', 'Eiffel Tower', '123 Main St')."
      }
    },
    required: ["destination"]
  }
};

const consultMapsKnowledge: FunctionDeclaration = {
  name: "consult_maps_knowledge",
  description: "Use this for simple, quick lookups like 'Find restaurants nearby' or 'Where is the nearest ATM?'. Do NOT use this for complex planning or historical questions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The search query."
      },
      location_bias: {
        type: Type.STRING,
        description: "Optional. A city or area to focus the search on."
      }
    },
    required: ["query"]
  }
};

const consultStrategicIntel: FunctionDeclaration = {
  name: "consult_strategic_intel",
  description: "Use this TRAVERSE tool for COMPLEX tasks. Examples: Visa planning, historical deep dives, 'digital nomad' logistics, safety assessments, detailed itineraries, or 3D TOURS. This tool uses advanced reasoning.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: {
        type: Type.STRING,
        description: "The full user request/topic."
      },
      mode: {
        type: Type.STRING,
        description: "Set to 'TRAVISA' for logistics/visa/safety. Set to 'TRAVISTORY' for history/culture/tours.",
        enum: ["TRAVISA", "TRAVISTORY"]
      }
    },
    required: ["topic"]
  }
};

const engageStreetView: FunctionDeclaration = {
  name: "engage_street_view",
  description: "Switches the view to Street View (Optical Dive). Use this when the user asks to 'go down to street level', 'see it up close', or 'dive in'.",
  parameters: {
    type: Type.OBJECT,
    properties: {}, // No params, uses current center
  }
};

const exitStreetView: FunctionDeclaration = {
  name: "exit_street_view",
  description: "Exits Street View and returns to the aerial 3D map. Use this when the user asks to 'go back up', 'exit', or 'leave street view'.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  }
};

const triggerVictoryLap: FunctionDeclaration = {
  name: "trigger_victory_lap",
  description: "Call this IMMEDIATELY when the user guesses the riddle correctly. It handles the celebration sequence: flying to the location, diving into street view, and handing off to the landmark spirit.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      destination: {
        type: Type.STRING,
        description: "The name of the location the user guessed correctly (e.g., 'Eiffel Tower')."
      }
    },
    required: ["destination"]
  }
};

const visitLandmarkImmersive: FunctionDeclaration = {
  name: "visit_landmark_immersive",
  description: "Use this when the user wants to 'visit', 'go inside', 'walk around', or 'experience' a specific landmark or location. This performs a cinematic flight followed by an automatic street view dive and connection to a local guide.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      destination: {
        type: Type.STRING,
        description: "The name of the location (e.g., 'The Louvre', 'Central Park')."
      }
    },
    required: ["destination"]
  }
};

const tools: Tool[] = [
  {
    functionDeclarations: [
      navigateToLocation,
      consultMapsKnowledge,
      consultStrategicIntel,
      engageStreetView,
      exitStreetView,
      triggerVictoryLap,
      visitLandmarkImmersive
    ]
  }
];

// --- Persona Configurations ---

const PERSONAS: Record<string, PersonaConfig> = {
  concierge: {
    name: 'Zephyr',
    role: 'Concierge',
    voice: 'Zephyr',
    isDefault: true,
    systemInstruction: `
      You are **Zephyr**, a sophisticated and proactive Travel Concierge. Your goal is to provide a seamless, high-end 3D travel experience.
      
      **Your Toolkit:**
      1.  **Exploration:** If the user wants to just see a place from the air, use \`navigate_to_location\`.
      2.  **Immersive Visit:** If the user wants to "visit", "go inside", "walk around", or "stand at" a specific landmark, use \`visit_landmark_immersive\`. This is the BEST way to show them a place up close.
      3.  **Street Level:** If you are already at a location and they want to dive, use \`engage_street_view\`.
      4.  **Local Knowledge:** For quick questions like 'restaurants nearby' or 'weather', use \`consult_maps_knowledge\`.
      5.  **Strategic Planning & Tours (CRITICAL):** If the user asks for **complex itineraries, visa rules, history deep dives, safety analysis, or 3D TOURS**, you MUST hand off the task to your Strategist Core. Do this by calling the tool \`consult_strategic_intel\`. If they ask for a tour, use mode 'TRAVISTORY'.
      
      **Personality:**
      *   Warm, professional, and proactive (like a 5-star hotel concierge).
      *   Brief and conversational in your voice responses. Let the 3D Map and the Strategic Intel cards do the visual heavy lifting.
      *   Never read out long lists. Summarize the 'vibe' and let the map show the pins.
    `
  },
  game: {
    name: 'Puck',
    role: 'Game Host',
    voice: 'Puck',
    isDefault: true,
    systemInstruction: `
      You are **Puck**, a mischievous and energetic game show host running a global scavenger hunt on a 3D Map.
      
      **The Game Loop:**
      1.  **Start:** Ask the user for a city to start the game. Use \`navigate_to_location\` to fly there.
      2.  **The Riddle:** Generate a fun, tricky riddle about a famous landmark in that city. 
          *   **CRITICAL:** Do NOT reveal the name of the landmark. 
          *   **CRITICAL:** Do NOT fly to the specific landmark yet (stay above the city using \`navigate_to_location\` only for the general city center).
      3.  **The Guess:** Wait for the user to answer.
          *   *If Wrong:* Give a cheeky hint.
          *   *If Right:* Shout 'BINGO!' or 'CORRECT!', then **IMMEDIATELY** call \`trigger_victory_lap\`.
          *   **DO NOT** use \`navigate_to_location\` or \`engage_street_view\` manually for the win state. The victory tool handles everything.
      4.  **Next Round:** When the user returns (the tool will handle the visit), ask if they are ready for the next clue in this city or want to move to a new city.
      
      **Rules:**
      *   Keep energy high! Use phrases like 'Super Sleuth' and 'Big Time'.
      *   You can use \`consult_maps_knowledge\` to find obscure facts for your riddles if needed.
      *   Strictly adhere to the game loop.
    `
  }
};

// --- Client ---

export class GenAILiveClient {
  private ai: GoogleGenAI;
  private session: any = null; // LiveSession
  private recorder: AudioRecorder | null = null;
  private streamer: AudioStreamer | null = null;
  public isConnected: boolean = false;
  private isMicActive: boolean = false;

  // Track transcription context to pass between personas
  private lastSessionTranscript: string = "";

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  /**
   * Main Connection Logic
   * @param overridePersona Optional: If provided, connects as this specific character (for Street View).
   */
  public async connect(overridePersona?: PersonaConfig) {
    if (this.isConnected) return;

    const { addLog, clearLogs, appMode, setActivePersona, setPersonaChanging } = useMapStore.getState();

    // 1. Determine Identity
    const persona = overridePersona || PERSONAS[appMode];
    setActivePersona(persona);
    setPersonaChanging(false);

    // Clear logs if starting a fresh session (default persona)
    if (persona.isDefault) {
      clearLogs();
      addLog(`Initializing System: ${appMode.toUpperCase()} MODE...`);
    } else {
      addLog(`Intercepting Local Signal: ${persona.name} (${persona.role})...`);
    }

    addLog(`Loading Voice: ${persona.voice}...`, 'system');

    this.isMicActive = false;
    this.streamer = new AudioStreamer();
    await this.streamer.resume();

    try {
      addLog(persona.isDefault ? "Connecting to TRAVERSE Core..." : `Patching into ${persona.name}'s comms...`);

      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: tools,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voice } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: {
            parts: [{ text: persona.systemInstruction }]
          },
        },
        callbacks: {
          onopen: () => {
            addLog(persona.isDefault ? "TRAVERSE Link Established." : `Connected to ${persona.name}.`);
            this.isConnected = true;
          },
          onmessage: async (message: any) => {
            const { streamLog, setCommand, setMarkers, setStreetViewConfig, activeCommand, setSystemMessage, setStrategicIntel } = useMapStore.getState();

            // Handle Tool Calls
            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls;
              const responses = [];

              for (const call of functionCalls) {
                addLog(`Tool Exec: ${call.name}`, 'system');
                let result: any = { status: 'ok' };

                try {
                  // 1. Navigate
                  if (call.name === 'navigate_to_location') {
                    const { destination } = call.args;
                    const coords = await mapsProxy.geocode(destination);
                    if (coords) {
                      setCommand({
                        type: 'FLY_TO',
                        target: { center: coords, tilt: 45, heading: 0, range: 2000 }
                      });
                      result = { status: 'moved', location: coords };
                    } else {
                      result = { status: 'error', message: 'Location not found' };
                    }
                  }

                  // 2. Scout
                  else if (call.name === 'consult_maps_knowledge') {
                    const { query, location_bias } = call.args;
                    const { summary, markers } = await mapsProxy.performGroundedSearch(query, location_bias);

                    if (markers.length > 0) {
                      setMarkers(markers);
                      setCommand({
                        type: 'FIT_BOUNDS',
                        targets: markers.map(m => m.position)
                      });
                      result = { found: markers.length, summary };
                    } else {
                      result = { found: 0, message: "No locations found." };
                    }
                  }

                  // 3. Strategist
                  else if (call.name === 'consult_strategic_intel') {
                    const { topic, mode } = call.args;
                    const { summary, markers, rawIntel } = await mapsProxy.performStrategicAnalysis(topic, mode as any);

                    // DISPATCH TO STORE
                    setStrategicIntel(rawIntel);

                    if (markers.length > 0) {
                      setMarkers(markers);
                      setCommand({
                        type: 'FLY_TO',
                        target: { center: markers[0].position, tilt: 60, heading: 0, range: 3000 }
                      });
                      result = {
                        status: "Mission Plan Generated and Displayed on HUD.",
                        summary,
                        waypoints_found: markers.length
                      };
                    } else {
                      result = { status: "Analysis Complete", summary: summary || "No physical assets identified." };
                    }
                  }

                  // 4. Street View with Dynamic Persona Handshake
                  else if (call.name === 'engage_street_view') {
                    let target = useMapStore.getState().cameraTarget?.center;
                    if (useMapStore.getState().markers.length > 0) {
                      target = useMapStore.getState().markers[0].position;
                    }
                    if (target) {
                      setCommand({ type: 'DIVE', target });
                      result = { status: 'diving', message: 'Transferring to local comms...' };

                      // Trigger Handshake Sequence
                      // We wait a moment for the AI to speak the "Diving" message, then switch.
                      setTimeout(() => {
                        this.transitionToLocalPersona(target!);
                      }, 3000);
                    } else {
                      result = { status: 'error', message: "No target focused." };
                    }
                  }

                  // 5. Exit Street View
                  else if (call.name === 'exit_street_view') {
                    setStreetViewConfig(null);
                    result = { status: 'exited' };

                    // Trigger Return Sequence
                    setTimeout(() => {
                      this.transitionToDefaultPersona();
                    }, 1000);
                  }

                  // 6. Victory Lap (The "Win Button" for Puck)
                  else if (call.name === 'trigger_victory_lap') {
                    const { destination } = call.args;
                    const coords = await mapsProxy.geocode(destination);

                    if (coords) {
                      // 1. Fly to the location
                      setCommand({
                        type: 'FLY_TO',
                        target: { center: coords, tilt: 45, heading: 0, range: 1000 }
                      });

                      result = { status: 'celebrating', message: 'Victory sequence initiated. Flying to target...' };

                      // 2. Sequence the Dive & Handoff
                      // We delay to let the camera fly there first (4 seconds)
                      setTimeout(() => {
                        // Trigger Dive
                        setCommand({ type: 'DIVE', target: coords });

                        // Trigger Handoff (allow time for dive animation to start/complete)
                        setTimeout(() => {
                          this.transitionToLocalPersona(coords);
                        }, 4000);

                      }, 4000);

                    } else {
                      result = { status: 'error', message: 'Location not found' };
                    }
                  }

                  // 7. Immersive Visit (The "Cinematic Button" for Zephyr)
                  else if (call.name === 'visit_landmark_immersive') {
                    const { destination } = call.args;
                    const coords = await mapsProxy.geocode(destination);

                    if (coords) {
                      // 1. Fly
                      setCommand({
                        type: 'FLY_TO',
                        target: { center: coords, tilt: 45, heading: 0, range: 1000 }
                      });

                      result = { status: 'visiting', message: `Initiating immersive visit to ${destination}...` };

                      // 2. Sequence
                      setTimeout(() => {
                        setCommand({ type: 'DIVE', target: coords });
                        setTimeout(() => {
                          this.transitionToLocalPersona(coords);
                        }, 4000);
                      }, 4000);

                    } else {
                      result = { status: 'error', message: 'Location not found' };
                    }
                  }

                } catch (e: any) {
                  console.error(e);
                  result = { error: e.message };
                }

                responses.push({
                  id: call.id,
                  name: call.name,
                  response: { result }
                });
              }

              // Send response back to model
              this.session.sendToolResponse({ functionResponses: responses });
            }

            // Handle Server Content (Audio/Text)
            if (message.serverContent) {
              const { serverContent } = message;

              if (serverContent.modelTurn) {
                const parts = serverContent.modelTurn.parts || [];
                for (const part of parts) {
                  if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                    const base64Audio = part.inlineData.data;
                    if (base64Audio && this.streamer) {
                      this.streamer.addPCM16(base64Audio);
                    }
                  }
                }
              }

              if (serverContent.outputTranscription?.text) {
                const text = serverContent.outputTranscription.text;
                streamLog(text, 'ai');
                // Accumulate transcript to pass to next persona
                this.lastSessionTranscript += `AI: ${text}\n`;
              } else if (serverContent.inputTranscription?.text) {
                const text = serverContent.inputTranscription.text;
                streamLog(text, 'user');
                this.lastSessionTranscript += `User: ${text}\n`;
              }
            }
          },
          onclose: () => {
            // Only fully log "Terminated" if we aren't mid-switch
            if (!useMapStore.getState().isPersonaChanging) {
              addLog("Uplink Terminated.");
              this.disconnect();
            }
          },
          onerror: (err) => {
            addLog(`ERROR: ${err.message}`, 'system');
            console.error(err);
          }
        }
      });

      this.session = await sessionPromise;

      // Initial Greeting Trigger
      try {
        let initialPrompt = "";

        if (!persona.isDefault) {
          // Local Persona: They should just start speaking based on System Instruction (which says "Your first sentence is...")
          // We send an empty tick or context to wake them up.
          initialPrompt = `Action: Connection_Established. User is here.`;
        } else {
          // Default Personas (Zephyr or Puck)
          if (this.lastSessionTranscript) {
            // Returning from Local
            if (appMode === 'game') {
              // Game Mode Return Logic
              initialPrompt = `
                          System: GAME STATE UPDATE.
                          The user found the location and has just returned from meeting the entity there.
                          The round is complete.
                          
                          Transcript of their visit:
                          ${this.lastSessionTranscript.substring(0, 500)}...
                          
                          YOUR TASK:
                          1. Acknowledge their success/meeting with the entity.
                          2. Proceed to "Step 4" of your instructions: Ask if they want a new city or another riddle here.
                        `;
            } else {
              // Concierge Mode Return Logic
              initialPrompt = `
                          System: The user has returned from Street View. 
                          Here is a summary of their conversation with the local: 
                          ${this.lastSessionTranscript.substring(0, 500)}...
                          Welcome them back.
                        `;
            }
            this.lastSessionTranscript = ""; // Reset after consumption
          } else {
            // Fresh Start
            initialPrompt = appMode === 'game'
              ? "Action: Start_Game_Intro"
              : "Action: Concierge_Greeting";
          }
        }

        await this.session.sendRealtimeInput({ text: initialPrompt });
      } catch (e) {
        console.error("Auto-trigger failed", e);
      }

      this.recorder = new AudioRecorder((base64Data) => {
        if (this.session) {
          this.session.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }
          });
        }
      });

    } catch (error: any) {
      addLog(`CONNECTION FAILED: ${error.message}`, 'system');
      this.disconnect();
      throw error;
    }
  }

  // --- Dynamic Persona Handlers ---

  public async transitionToLocalPersona(target: Coordinates, customContext?: string) {
    const { setPersonaChanging, addLog, setSystemMessage, appMode } = useMapStore.getState();

    const isGame = appMode === 'game';

    // 1. Set Loading State
    setPersonaChanging(true);
    setSystemMessage({
      text: isGame ? 'SUMMONING ENTITY...' : 'SCANNING LOCAL FREQUENCIES...',
      type: 'info'
    });

    // 2. Disconnect Current Session
    this.disconnect(true); // silent disconnect

    // 3. Generate Persona
    const context = customContext || "User wants to explore this area.";
    const localPersona = await mapsProxy.generateLocalPersona(target, context, appMode);

    if (localPersona) {
      // 4. Connect as Local
      await this.connect(localPersona);
      setSystemMessage({ text: `LINKED: ${localPersona.name.toUpperCase()}`, type: 'success' });
      setTimeout(() => setSystemMessage(null), 3000);
    } else {
      // Fallback to default if generation fails
      addLog(isGame ? "Summoning Failed. Reconnecting Puck..." : "Failed to intercept signal. Reconnecting Zephyr...", 'system');
      setPersonaChanging(false);
      await this.connect();
    }
  }

  public async transitionToDefaultPersona() {
    const { setPersonaChanging, addLog, setSystemMessage } = useMapStore.getState();

    setPersonaChanging(true);
    setSystemMessage({ text: 'RE-ESTABLISHING UPLINK...', type: 'info' });

    this.disconnect(true);

    await this.connect(); // Connects to default appMode persona

    setSystemMessage({ text: 'UPLINK RESTORED', type: 'success' });
    setTimeout(() => setSystemMessage(null), 2000);
  }

  // --- Lifecycle ---

  public disconnect(silent: boolean = false) {
    const { addLog, setActivePersona } = useMapStore.getState();

    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    if (this.streamer) {
      this.streamer.stop();
      this.streamer = null;
    }

    if (this.session) {
      try {
        if (typeof this.session.close === 'function') {
          this.session.close();
        }
      } catch (e) {
        console.error("Error closing session:", e);
      }
    }

    this.isConnected = false;
    this.isMicActive = false;
    this.session = null;

    if (!silent) {
      setActivePersona(null);
      addLog("Session Ended.");
    }
  }

  public async setMicMuted(muted: boolean): Promise<boolean> {
    if (!this.recorder) return false;
    if (muted) {
      this.recorder.setMute(true);
      return false;
    } else {
      if (!this.isMicActive) {
        try {
          await this.recorder.start();
          this.isMicActive = true;
        } catch (error) {
          return false;
        }
      }
      this.recorder.setMute(false);
      return true;
    }
  }

  public setAudioMuted(muted: boolean) {
    if (this.streamer) {
      this.streamer.setVolume(muted ? 0 : 1);
    }
  }

  public async sendText(text: string) {
    if (this.session) {
      useMapStore.getState().streamLog(text, 'user');
      try {
        await this.session.sendRealtimeInput({ text: text });
      } catch (e) {
        console.error("Failed to send text:", e);
      }
    }
  }
}

export const genAIClient = new GenAILiveClient();