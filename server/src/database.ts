import pg from 'pg';
import { config } from './config.js';
import { Entity, GameEvent, Position, CharacterMemory, CharacterCronjob, ItemInstance } from '../../shared/types.js';

const { Pool } = pg;

export class Database {
  private pool: pg.Pool;

  constructor() {
    // Try without SSL first, as some databases don't support it
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: false
    });
  }

  async initialize() {
    try {
      console.log('Initializing database connection...');
      
      // Test connection first
      await this.testConnection();
      
      // Create tables
      await this.createTables();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      
      // If SSL error, try with SSL enabled
      if (error instanceof Error && error.message.includes('SSL')) {
        console.log('Retrying with SSL enabled...');
        await this.pool.end();
        this.pool = new Pool({
          connectionString: config.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        
        await this.testConnection();
        await this.createTables();
        console.log('Database initialized successfully with SSL');
      } else {
        throw error;
      }
    }
  }

  private async testConnection() {
    console.log('Testing database connection...');
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log('Database connection successful:', result.rows[0].now);
    } finally {
      client.release();
    }
  }

  private async createTables() {
    console.log('Creating database tables...');

    const createEntitiesTable = `
      CREATE TABLE IF NOT EXISTS entities (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        world_id VARCHAR(255) NOT NULL,
        position_x FLOAT NOT NULL DEFAULT 0,
        position_y FLOAT NOT NULL DEFAULT 0,
        position_z FLOAT NOT NULL DEFAULT 0,
        body_parts TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createItemInstancesTable = `
      CREATE TABLE IF NOT EXISTS item_instances (
        id VARCHAR(255) PRIMARY KEY,
        entity_id VARCHAR(255) NOT NULL,
        asset_id VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        relative_position_x FLOAT NOT NULL DEFAULT 0,
        relative_position_y FLOAT NOT NULL DEFAULT 0,
        relative_position_z FLOAT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
      );
    `;

    const createEventsTable = `
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(255) PRIMARY KEY,
        function_call VARCHAR(50) NOT NULL,
        parameters JSONB NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createMemoriesTable = `
      CREATE TABLE IF NOT EXISTS character_memories (
        id VARCHAR(255) PRIMARY KEY,
        character_id VARCHAR(255) NOT NULL,
        world_id VARCHAR(255) NOT NULL,
        memory_text TEXT NOT NULL,
        importance_score FLOAT NOT NULL DEFAULT 1.0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        related_event_ids TEXT[] DEFAULT '{}'
      );
    `;

    const createCronjobsTable = `
      CREATE TABLE IF NOT EXISTS character_cronjobs (
        id VARCHAR(255) PRIMARY KEY,
        character_id VARCHAR(255) NOT NULL,
        world_id VARCHAR(255) NOT NULL,
        task_description TEXT NOT NULL,
        interval_seconds INTEGER NOT NULL,
        last_executed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_entities_world_id ON entities(world_id);
      CREATE INDEX IF NOT EXISTS idx_item_instances_entity_id ON item_instances(entity_id);
      CREATE INDEX IF NOT EXISTS idx_events_entity_world ON events((parameters->>'entityId'), (parameters->>'worldId'));
      CREATE INDEX IF NOT EXISTS idx_memories_character_world ON character_memories(character_id, world_id);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON character_memories(importance_score DESC);
      CREATE INDEX IF NOT EXISTS idx_cronjobs_character_world ON character_cronjobs(character_id, world_id);
      CREATE INDEX IF NOT EXISTS idx_cronjobs_active_interval ON character_cronjobs(is_active, last_executed) WHERE is_active = true;
    `;

    try {
      // Validate existing schema first
      await this.validateSchema();
      
      console.log('Creating entities table...');
      await this.pool.query(createEntitiesTable);
      
      console.log('Creating item_instances table...');
      await this.pool.query(createItemInstancesTable);
      
      console.log('Creating events table...');
      await this.pool.query(createEventsTable);
      
      console.log('Creating character_memories table...');
      await this.pool.query(createMemoriesTable);
      
      console.log('Creating character_cronjobs table...');
      await this.pool.query(createCronjobsTable);
      
      console.log('Creating indexes...');
      await this.pool.query(createIndexes);
      
      console.log('All tables and indexes created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  private async validateSchema() {
    console.log('Validating existing database schema...');
    
    // Check if entities table exists and has correct columns
    const entitiesCheck = await this.pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'entities' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    if (entitiesCheck.rows.length > 0) {
      console.log('Found existing entities table, checking schema...');
      
      const existingColumns = entitiesCheck.rows.map(row => row.column_name);
      const requiredColumns = ['id', 'name', 'world_id', 'position_x', 'position_y', 'position_z', 'body_parts'];
      
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        const errorMessage = `
Database schema mismatch detected!

The 'entities' table is missing required columns: ${missingColumns.join(', ')}

To fix this, please run the following SQL commands:

${missingColumns.includes('world_id') ? 'ALTER TABLE entities ADD COLUMN world_id VARCHAR(255) NOT NULL DEFAULT \'\';' : ''}
${missingColumns.includes('position_x') ? 'ALTER TABLE entities ADD COLUMN position_x FLOAT NOT NULL DEFAULT 0;' : ''}
${missingColumns.includes('position_y') ? 'ALTER TABLE entities ADD COLUMN position_y FLOAT NOT NULL DEFAULT 0;' : ''}
${missingColumns.includes('position_z') ? 'ALTER TABLE entities ADD COLUMN position_z FLOAT NOT NULL DEFAULT 0;' : ''}
${missingColumns.includes('body_parts') ? 'ALTER TABLE entities ADD COLUMN body_parts TEXT[] DEFAULT \'{}\';' : ''}

Then restart the server.
        `;
        
        throw new Error(errorMessage);
      }
      
      console.log('Entities table schema is valid');
    }
    
    // Check events table
    const eventsCheck = await this.pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' AND table_schema = 'public'
    `);
    
    if (eventsCheck.rows.length > 0) {
      const existingColumns = eventsCheck.rows.map(row => row.column_name);
      const requiredColumns = ['id', 'function_call', 'parameters', 'timestamp'];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Events table is missing columns: ${missingColumns.join(', ')}. Please update your schema manually.`);
      }
    }
    
    // Check character_memories table
    const memoriesCheck = await this.pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'character_memories' AND table_schema = 'public'
    `);
    
    if (memoriesCheck.rows.length > 0) {
      const existingColumns = memoriesCheck.rows.map(row => row.column_name);
      const requiredColumns = ['id', 'character_id', 'world_id', 'memory_text', 'importance_score', 'timestamp', 'related_event_ids'];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Character_memories table is missing columns: ${missingColumns.join(', ')}. Please update your schema manually.`);
      }
    }
    
    // Check character_cronjobs table
    const cronjobsCheck = await this.pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'character_cronjobs' AND table_schema = 'public'
    `);
    
    if (cronjobsCheck.rows.length > 0) {
      const existingColumns = cronjobsCheck.rows.map(row => row.column_name);
      const requiredColumns = ['id', 'character_id', 'world_id', 'task_description', 'interval_seconds', 'last_executed', 'is_active', 'created_at', 'updated_at'];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Character_cronjobs table is missing columns: ${missingColumns.join(', ')}. Please update your schema manually.`);
      }
    }
    
    console.log('Schema validation passed');
  }

  async getEntity(id: string): Promise<Entity | null> {
    const result = await this.pool.query(
      'SELECT * FROM entities WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    console.log(`DEBUG: Loading entity ${id} from database:`, {
      position_x: row.position_x,
      position_y: row.position_y,
      position_z: row.position_z,
      position_types: {
        x: typeof row.position_x,
        y: typeof row.position_y,
        z: typeof row.position_z
      }
    });
    
    const itemInstances = await this.getEntityItemInstances(id);
    
    const entity = {
      id: row.id,
      name: row.name,
      worldId: row.world_id,
      position: {
        x: row.position_x,
        y: row.position_y,
        z: row.position_z
      },
      bodyParts: row.body_parts || [],
      itemInstances: itemInstances
    };
    
    console.log(`DEBUG: Returning entity ${id} with position:`, entity.position);
    return entity;
  }

  async getEntitiesByWorld(worldId: string): Promise<Entity[]> {
    const result = await this.pool.query(
      'SELECT * FROM entities WHERE world_id = $1',
      [worldId]
    );
    
    console.log(`DEBUG: Loading ${result.rows.length} entities from database for world ${worldId}`);
    
    const entities = await Promise.all(result.rows.map(async row => {
      console.log(`DEBUG: Processing entity ${row.id} with positions:`, {
        position_x: row.position_x,
        position_y: row.position_y,
        position_z: row.position_z,
        types: {
          x: typeof row.position_x,
          y: typeof row.position_y,
          z: typeof row.position_z
        }
      });
      
      const itemInstances = await this.getEntityItemInstances(row.id);
      
      const entity = {
        id: row.id,
        name: row.name,
        worldId: row.world_id,
        position: {
          x: row.position_x,
          y: row.position_y,
          z: row.position_z
        },
        bodyParts: row.body_parts || [],
        itemInstances: itemInstances
      };
      
      console.log(`DEBUG: Entity ${row.id} final position:`, entity.position);
      return entity;
    }));
    
    console.log(`DEBUG: Returning ${entities.length} entities to game engine`);
    return entities;
  }

  async getEntityItemInstances(entityId: string): Promise<ItemInstance[]> {
    const result = await this.pool.query(
      'SELECT * FROM item_instances WHERE entity_id = $1',
      [entityId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      assetId: row.asset_id,
      description: row.description,
      relativePosition: {
        x: row.relative_position_x,
        y: row.relative_position_y,
        z: row.relative_position_z
      }
    }));
  }

  async addItemInstanceToEntity(entityId: string, itemInstance: ItemInstance): Promise<void> {
    await this.pool.query(
      `INSERT INTO item_instances (id, entity_id, asset_id, description, relative_position_x, relative_position_y, relative_position_z, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [
        itemInstance.id,
        entityId,
        itemInstance.assetId,
        itemInstance.description,
        itemInstance.relativePosition.x,
        itemInstance.relativePosition.y,
        itemInstance.relativePosition.z
      ]
    );
  }

  async removeItemInstanceFromEntity(itemInstanceId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM item_instances WHERE id = $1',
      [itemInstanceId]
    );
  }

  async getItemInstance(itemInstanceId: string): Promise<ItemInstance | null> {
    const result = await this.pool.query(
      'SELECT * FROM item_instances WHERE id = $1',
      [itemInstanceId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      assetId: row.asset_id,
      description: row.description,
      relativePosition: {
        x: row.relative_position_x,
        y: row.relative_position_y,
        z: row.relative_position_z
      }
    };
  }

  async createOrUpdateEntity(entity: Entity): Promise<void> {
    await this.pool.query(
      `INSERT INTO entities (id, name, world_id, position_x, position_y, position_z, body_parts, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         world_id = EXCLUDED.world_id,
         position_x = EXCLUDED.position_x,
         position_y = EXCLUDED.position_y,
         position_z = EXCLUDED.position_z,
         body_parts = EXCLUDED.body_parts,
         updated_at = CURRENT_TIMESTAMP`,
      [
        entity.id,
        entity.name,
        entity.worldId,
        entity.position.x,
        entity.position.y,
        entity.position.z,
        entity.bodyParts
      ]
    );
    
    // Remove existing item instances and add new ones
    await this.pool.query(
      'DELETE FROM item_instances WHERE entity_id = $1',
      [entity.id]
    );
    
    for (const itemInstance of entity.itemInstances) {
      await this.addItemInstanceToEntity(entity.id, itemInstance);
    }
  }

  async updateEntityPosition(entityId: string, position: Position): Promise<void> {
    await this.pool.query(
      `UPDATE entities SET 
         position_x = $2, 
         position_y = $3, 
         position_z = $4, 
         updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [entityId, position.x, position.y, position.z]
    );
  }

  async saveEvent(event: GameEvent): Promise<void> {
    console.log(`DEBUG: *** saveEvent CALLED *** for event: ${event.functionCall}(${event.id})`);
    console.log(`DEBUG: *** saveEvent EVENT DATA ***:`);
    console.log(`  - id: ${event.id}`);
    console.log(`  - functionCall: ${event.functionCall}`);
    console.log(`  - parameters:`, JSON.stringify(event.parameters, null, 2));
    console.log(`  - timestamp: ${event.timestamp}`);
    
    if (event.functionCall === 'move') {
      console.log(`DEBUG: *** saveEvent MOVE EVENT ANALYSIS ***:`);
      console.log(`  - entityId: ${event.parameters.entityId}`);
      console.log(`  - worldId: ${event.parameters.worldId}`);
      console.log(`  - from: ${JSON.stringify(event.parameters.from)}`);
      console.log(`  - to: ${JSON.stringify(event.parameters.to)}`);
      console.log(`  - duration: ${event.parameters.duration}`);
      console.log(`  - targetPosition: ${JSON.stringify(event.parameters.targetPosition)}`);
      console.log(`  - parameters keys: [${Object.keys(event.parameters).join(', ')}]`);
    }
    
    const jsonStringifiedParameters = JSON.stringify(event.parameters);
    console.log(`DEBUG: *** saveEvent JSON.stringify(parameters) ***:`, jsonStringifiedParameters);
    
    await this.pool.query(
      'INSERT INTO events (id, function_call, parameters, timestamp) VALUES ($1, $2, $3, $4)',
      [event.id, event.functionCall, jsonStringifiedParameters, event.timestamp]
    );
    
    console.log(`DEBUG: *** saveEvent COMPLETED *** Event ${event.id} saved to database`);
  }

  async getRecentEvents(worldId: string, limit: number = 10): Promise<GameEvent[]> {
    console.log(`DEBUG: *** getRecentEvents CALLED *** for worldId: ${worldId}, limit: ${limit}`);
    
    const result = await this.pool.query(
      `SELECT * FROM events 
       WHERE parameters->>'worldId' = $1 
       ORDER BY timestamp DESC LIMIT $2`,
      [worldId, limit]
    );
    
    console.log(`DEBUG: *** getRecentEvents QUERY RESULT *** Found ${result.rows.length} events`);
    
    const events = result.rows.map((row, index) => {
      console.log(`DEBUG: *** RAW DATABASE ROW ${index + 1} ***:`);
      console.log(`  - id: ${row.id}`);
      console.log(`  - function_call: ${row.function_call}`);
      console.log(`  - parameters (raw):`, row.parameters);
      console.log(`  - parameters type:`, typeof row.parameters);
      console.log(`  - timestamp: ${row.timestamp}`);
      
      const event = {
        id: row.id,
        functionCall: row.function_call,
        parameters: row.parameters,
        timestamp: row.timestamp
      };
      
      console.log(`DEBUG: *** PROCESSED EVENT ${index + 1} ***:`);
      console.log(`  - functionCall: ${event.functionCall}`);
      console.log(`  - parameters:`, JSON.stringify(event.parameters, null, 2));
      
      if (event.functionCall === 'move') {
        console.log(`DEBUG: *** MOVE EVENT ANALYSIS ${index + 1} ***:`);
        console.log(`  - entityId: ${event.parameters.entityId}`);
        console.log(`  - worldId: ${event.parameters.worldId}`);
        console.log(`  - from: ${JSON.stringify(event.parameters.from)}`);
        console.log(`  - to: ${JSON.stringify(event.parameters.to)}`);
        console.log(`  - duration: ${event.parameters.duration}`);
        console.log(`  - targetPosition: ${JSON.stringify(event.parameters.targetPosition)}`);
        console.log(`  - parameters keys: [${Object.keys(event.parameters).join(', ')}]`);
      }
      
      return event;
    });
    
    console.log(`DEBUG: *** getRecentEvents RETURNING *** ${events.length} processed events`);
    return events;
  }

  async saveMemory(memory: CharacterMemory): Promise<void> {
    await this.pool.query(
      `INSERT INTO character_memories (id, character_id, world_id, memory_text, importance_score, timestamp, related_event_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        memory.id,
        memory.characterId,
        memory.worldId,
        memory.memoryText,
        memory.importanceScore,
        memory.timestamp,
        memory.relatedEventIds
      ]
    );
  }

  async getCharacterMemories(characterId: string, worldId: string, limit: number = 20): Promise<CharacterMemory[]> {
    const result = await this.pool.query(
      `SELECT * FROM character_memories 
       WHERE character_id = $1 AND world_id = $2
       ORDER BY importance_score DESC, timestamp DESC 
       LIMIT $3`,
      [characterId, worldId, limit]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      characterId: row.character_id,
      worldId: row.world_id,
      memoryText: row.memory_text,
      importanceScore: row.importance_score,
      timestamp: row.timestamp,
      relatedEventIds: row.related_event_ids || []
    }));
  }

  async saveCronjob(cronjob: CharacterCronjob): Promise<void> {
    await this.pool.query(
      `INSERT INTO character_cronjobs (id, character_id, world_id, task_description, interval_seconds, last_executed, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         task_description = EXCLUDED.task_description,
         interval_seconds = EXCLUDED.interval_seconds,
         last_executed = EXCLUDED.last_executed,
         is_active = EXCLUDED.is_active,
         updated_at = CURRENT_TIMESTAMP`,
      [
        cronjob.id,
        cronjob.characterId,
        cronjob.worldId,
        cronjob.taskDescription,
        cronjob.intervalSeconds,
        cronjob.lastExecuted,
        cronjob.isActive,
        cronjob.createdAt,
        cronjob.updatedAt
      ]
    );
  }

  async getCharacterCronjobs(characterId: string, worldId: string): Promise<CharacterCronjob[]> {
    const result = await this.pool.query(
      `SELECT * FROM character_cronjobs 
       WHERE character_id = $1 AND world_id = $2 AND is_active = true
       ORDER BY created_at ASC`,
      [characterId, worldId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      characterId: row.character_id,
      worldId: row.world_id,
      taskDescription: row.task_description,
      intervalSeconds: row.interval_seconds,
      lastExecuted: row.last_executed,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async getCronjobsDueForExecution(worldId: string): Promise<CharacterCronjob[]> {
    const result = await this.pool.query(
      `SELECT * FROM character_cronjobs 
       WHERE world_id = $1 AND is_active = true 
       AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_executed)) >= interval_seconds
       ORDER BY last_executed ASC`,
      [worldId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      characterId: row.character_id,
      worldId: row.world_id,
      taskDescription: row.task_description,
      intervalSeconds: row.interval_seconds,
      lastExecuted: row.last_executed,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async updateCronjobLastExecuted(cronjobId: string): Promise<void> {
    await this.pool.query(
      `UPDATE character_cronjobs SET 
         last_executed = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [cronjobId]
    );
  }

  async getCronjobById(cronjobId: string): Promise<CharacterCronjob | null> {
    const result = await this.pool.query(
      'SELECT * FROM character_cronjobs WHERE id = $1',
      [cronjobId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      characterId: row.character_id,
      worldId: row.world_id,
      taskDescription: row.task_description,
      intervalSeconds: row.interval_seconds,
      lastExecuted: row.last_executed,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async deleteCharacter(characterId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete character memories
      await client.query(
        'DELETE FROM character_memories WHERE character_id = $1',
        [characterId]
      );
      
      // Delete character cronjobs
      await client.query(
        'DELETE FROM character_cronjobs WHERE character_id = $1',
        [characterId]
      );
      
      // Delete item instances (will be cascaded when entity is deleted due to foreign key)
      // But we'll be explicit for clarity
      await client.query(
        'DELETE FROM item_instances WHERE entity_id = $1',
        [characterId]
      );
      
      // Delete the entity itself
      await client.query(
        'DELETE FROM entities WHERE id = $1',
        [characterId]
      );
      
      await client.query('COMMIT');
      console.log(`Character ${characterId} and all related data deleted successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting character:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
} 