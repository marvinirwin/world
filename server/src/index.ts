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

    // Initialize game engine first
    const gameEngine = new GameEngine(database);
    
    // Initialize WebSocket server
    const wsServer = new GameWebSocketServer(config.WS_PORT, gameEngine);
    
    // Create error event handler that routes to websocket server
    const onErrorEvent = async (event: any) => {
      await wsServer.processGameEngineEvent(event);
    };

    // Initialize services with error handling
    const memoryService = new MemoryService(database);
    const llmService = new LLMService(memoryService);
    const commandHandler = new CommandHandler(database, llmService, memoryService, onErrorEvent);
    
    // Set the command handler on the websocket server
    wsServer.setCommandHandler(commandHandler);
    
    // Initialize game engine with websocket server's event processor and error handler
    await gameEngine.initialize(
      (event) => wsServer.processGameEngineEvent(event),
      onErrorEvent
    );

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
    console.log('Cronjob system running - characters will check tasks every 30 seconds');

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 