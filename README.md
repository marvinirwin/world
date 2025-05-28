# World Simulation Game

A browser-based 3D world simulation where autonomous agents interact with each other using AI. Built with Node.js, WebSockets, React, Three.js, and Google Gemini AI.

## Features

- **3D World**: Real-time 3D visualization using Three.js and React Three Fiber
- **Autonomous Agents**: AI-powered entities that move and communicate autonomously
- **Real-time Communication**: WebSocket-based real-time updates
- **Persistent State**: PostgreSQL database for storing entities, events, and assets
- **AI Integration**: Google Gemini AI for generating entity behaviors and interactions

## Architecture

- **Server**: Node.js with TypeScript, WebSockets, PostgreSQL
- **Client**: React with TypeScript, Vite, Three.js
- **AI**: Google Gemini for autonomous behavior generation
- **Database**: PostgreSQL for persistent storage

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies for both server and client:
```bash
npm run install:all
```

### Running the Application

1. Start both server and client in development mode:
```bash
npm run dev
```

This will start:
- Server on WebSocket port 3002
- Client on http://localhost:3000

### Usage

1. Open your browser to http://localhost:3000
2. Enter a unique entity ID (e.g., "alice", "bob", "charlie")
3. Click "Join World" to enter the simulation
4. Watch as your entity and others move around and interact autonomously

## Game Mechanics

### Entities
- Each entity has a unique ID, position (x, y, z), and can have body parts and items
- Entities are represented as colored 3D boxes in the world
- Your entity is green, others are blue

### AI Behavior
- Every 5 seconds, the AI selects a random entity to act
- The AI generates an intent (movement or speech) based on the current world state
- The AI then implements the intent, creating appropriate events

### Events
- **Movement**: Entities move to new positions in 3D space
- **Speech**: Entities can speak, creating sound events
- **Hearing**: Nearby entities automatically hear speech events
- **Spawn**: New entities joining the world

### Communication
- Entities can speak and nearby entities (within 10 units) will hear them
- All events are displayed in real-time in the UI
- No strict conversation structure - just natural speaking and hearing

## Technical Details

### Server Components
- `GameEngine`: Manages world state and AI behavior
- `Database`: PostgreSQL integration for persistence
- `GeminiAI`: Google Gemini integration for AI behavior
- `WebSocketServer`: Real-time communication with clients

### Client Components
- `World3D`: Three.js 3D world rendering
- `GameUI`: Real-time event display and status
- `LoginScreen`: Entity ID entry
- `useWebSocket`: WebSocket connection management

### Database Schema
- `entities`: Entity positions and properties
- `events`: All game events with timestamps
- `assets`: 3D models and skins (for future expansion)

## Configuration

The server uses these default settings:
- WebSocket Port: 3002
- Database: PostgreSQL (configured in server/src/config.ts)
- AI: Google Gemini Pro model

## Development

### Server Development
```bash
cd server
npm run dev
```

### Client Development
```bash
cd client
npm run dev
```

### Building for Production
```bash
# Server
cd server
npm run build

# Client
cd client
npm run build
```

## Future Enhancements

- Custom 3D models and animations
- More complex AI behaviors and personalities
- Item and body part systems
- Spatial audio for speech events
- Multiplayer interactions and relationships
- World persistence and history

## License

MIT License 