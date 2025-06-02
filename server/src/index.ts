import { Database } from './database.js';
import { GameEngine } from './gameEngine.js';
import { GameWebSocketServer } from './websocketServer.js';
import { CommandHandler } from './commandHandler.js';
import { LLMService } from './services/llmService.js';
import { MemoryService } from './services/memoryService.js';
import { config } from './config.js';

async function startServer() {
  try {
    console.log('Starting World Simulation Server...');

    // Initialize database
    const database = new Database();
    await database.initialize();

    // Initialize services
    const memoryService = new MemoryService(database);
    const llmService = new LLMService(memoryService);
    const commandHandler = new CommandHandler(database, llmService, memoryService);

    // Initialize game engine
    const gameEngine = new GameEngine(database);
    
    // Start WebSocket server with command handler
    const wsServer = new GameWebSocketServer(config.WS_PORT, gameEngine, commandHandler);
    
    // Initialize game engine with websocket server's event processor
    await gameEngine.initialize((event) => wsServer.processGameEngineEvent(event));

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      wsServer.close();
      await gameEngine.shutdown();
      await database.close();
      process.exit(0);
    });

    console.log(`Server running on WebSocket port ${config.WS_PORT}`);
    console.log('Press Ctrl+C to stop the server');
    console.log('Cronjob system running - characters will check tasks every 2 seconds');

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 