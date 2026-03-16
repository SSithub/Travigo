# Travigo
Where live agents meet immersive storytelling and 3D navigation

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="" />
</div>

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
        
        GenAI["✨ Generative AI Model\n(Gemini API)"]:::agentNode
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
    Personas -->|"Defines Tone & Focus"| GenAI
    LA -->|"Sends Real-time Context"| GenAI
    
    GenAI -->|"Generates Narrative"| Story
    GenAI -->|"Generates Real-time Responses"| VoiceText
    
    Story -->|"Overlays on"| UI
    VoiceText -->|"Streams to"| UI
    StreetView -->|"Provides Visual Context to"| LA
    Nav -->|"Provides Spatial Data to"| LA
    
    Story -.->|"Drives"| StreetView
```
