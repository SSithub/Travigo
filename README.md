# Travigo
Where live agents meet immersive storytelling and 3D navigation

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="" />
</div>

## Project Description

Travigo is a **next-generation AI Agent** that utilizes multimodal inputs and outputs, moving far beyond simple text-in/text-out interactions. The project leverages Google's Gen AI SDK, Gemini Live API, Gemini 3, Google Maps API cloud services with the creative power of generative AI and spatial context to solve complex problems and create entirely new, immersive user experiences in 3D navigation and storytelling.

### Features & Functionality
- **Multimodal Interactions:** Communicate via voice and text while the AI processes real-time visual context from the interactive Street View and 3D map spatial data.
- **Dynamic Personas:** Choose between Concierge Mode (realistic local guides) and Game Mode (mystical/run-time personas) adapting tone and narrative focus on the fly.
- **Real-time Context Processing:** Uses a Live Agent Orchestrator to stream dialogue & voice directly tied to user actions and spatial events.
- **Immersive Storytelling:** Generates contextual narratives overlaid seamlessly onto the UI and 3D environment.

### Technologies Used
- **Frontend / UI:** Next.js, React, 3D Map & Routing Integration
- **Backend / Logic:** Agentic System Core, Node.js
- **APIs:** Google's Live API, Google Maps API

### Models Used
The project utilizes a multi-model architecture, leveraging different Gemini models depending on the task:
- **gemini-2.5-flash-native-audio-preview**: Used by the Live Agent Orchestrator to power real-time, multimodal conversations via voice and audio streaming.
- **gemini-2.5-flash**: Used for rapid "Scout" queries, specifically grounding location searches using the Google Maps tool.
- **gemini-3.1-pro-preview**: Used for complex reasoning tasks via High Thinking levels, such as generating fictional personas based on spatial context and performing deep "Strategic Analysis" (e.g., visa planning, historic deep dives) grounded by Google Search.

## Test the project Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the API Keys `GEMINI_API_KEY=''` & `GOOGLE_MAPS_API_KEY=''` in [.env.local](.env.local) to your keys.
3. Run the app:
   `npm run dev`

## Architecture Diagram

```mermaid
graph TD
    %% Styling
    classDef userNode fill:#2d3748,stroke:#4fd1c5,stroke-width:2px,color:#fff;
    classDef agentNode fill:#3182ce,stroke:#90cdf4,stroke-width:2px,color:#fff;
    classDef personaNode fill:#805ad5,stroke:#d6bcfa,stroke-width:2px,color:#fff;
    classDef coreSystem fill:#2b6cb0,stroke:#63b3ed,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    classDef storyNode fill:#dd6b20,stroke:#fbd38d,stroke-width:2px,color:#fff;
    classDef navNode fill:#38a169,stroke:#9ae6b4,stroke-width:2px,color:#fff;
    classDef modeNode fill:#e53e3e,stroke:#fc8181,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;

    %% User Interaction Layer
    U(["👤 User"]):::userNode

    %% UI & Navigation Layer (Frontend)
    subgraph UI["🖥️ UI & Navigation Interface"]
        Nav["🗺️ 3D Map & Routing"]:::navNode
        Controls["🕹️ Control Tray"]:::navNode
        Intel["📊 Strategic Intel Card"]:::navNode
    end

    %% Agentic Core (Backend/Logic)
    subgraph Core["🧠 Agentic System Core"]
        direction TB
        LA["🤖 Live Agent Orchestrator\n(Context & State Management)"]:::agentNode
        
        subgraph AppModes["🔄 Application Modes"]
            Concierge["🤵 Concierge Mode\n(Realistic Locals)"]:::modeNode
            Game["🎲 Game Mode\n(Mystical/Object Personas)"]:::modeNode
        end
        
        subgraph Personas["🎭 Persona Engine (Casting Director / Dungeon Master)"]
            P1["🤠 E.g., The Adventurer (Concierge)"]:::personaNode
            P2["🧐 E.g., The Historian (Concierge)"]:::personaNode
            P3["� E.g., Spirit of the Landmark (Game)"]:::personaNode
        end
        
        subgraph GenAI["✨ Generative AI Models (Gemini API)"]
            direction TB
            FlashAudio["🎙️ gemini-2.5-flash-native-audio-preview\n(Real-time Voice & Audio Streaming)"]:::agentNode
            FlashScout["🔍 gemini-2.5-flash\n(Rapid Location Grounding)"]:::agentNode
            ProReason["🧠 gemini-3.1-pro-preview\n(Complex Persona & Strategic Analysis)"]:::agentNode
        end
    end

    %% Immersive Experience Layer
    subgraph Experience["🌍 Immersive Experience"]
        Story["📖 Immersive Contextual Story"]:::storyNode
        StreetView["🏙️ Interactive Street View"]:::storyNode
        VoiceText["💬 Dialogue & Voice Streaming"]:::storyNode
    end

    %% Connections
    U -->|"Sets Preferences\n& Interacts"| UI
    UI -->|"Location & Events"| LA
    UI -->|"Selects Mode"| AppModes
    
    AppModes -->|"Dictates Engine Logic"| Personas
    LA -->|"Selects/Applies via Mode"| Personas
    Personas -->|"Defines Tone & Focus"| ProReason
    LA -->|"Sends Real-time Context"| FlashAudio
    LA -->|"Requests Location Data"| FlashScout
    LA -->|"Requests Deep Analysis"| ProReason
    
    ProReason -->|"Generates Narrative"| Story
    FlashAudio -->|"Generates Real-time Responses"| VoiceText
    
    Story -->|"Overlays on"| UI
    VoiceText -->|"Streams to"| UI
    StreetView -->|"Provides Visual Context to"| LA
    Nav -->|"Provides Spatial Data to"| LA
    
    Story -.->|"Drives"| StreetView
```
