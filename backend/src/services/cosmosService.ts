import { CosmosClient, Database, Container } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

class CosmosService {
  private client: CosmosClient;
  private database: Database | null = null;
  private tasksContainer: Container | null = null;
  private syncContainer: Container | null = null;

  constructor() {
    const endpoint = process.env.COSMOS_ENDPOINT || '';
    const key = process.env.COSMOS_KEY || '';

    if (!endpoint || !key) {
      console.warn('⚠️  Cosmos DB credentials not configured. Using mock data.');
      return;
    }

    this.client = new CosmosClient({ endpoint, key });
  }

  async initialize(): Promise<void> {
    if (!this.client) {
      console.log('📦 Running in mock mode (no Cosmos DB)');
      return;
    }

    try {
      const databaseName = process.env.COSMOS_DATABASE_NAME || 'taskflow-ai';

      // Create database if it doesn't exist
      const { database } = await this.client.databases.createIfNotExists({
        id: databaseName,
      });
      this.database = database;

      // Create tasks container
      const { container: tasksContainer } = await database.containers.createIfNotExists({
        id: 'tasks',
        partitionKey: { paths: ['/syncCode'] },
      });
      this.tasksContainer = tasksContainer;

      // Create sync sessions container
      const { container: syncContainer } = await database.containers.createIfNotExists({
        id: 'sync-sessions',
        partitionKey: { paths: ['/syncCode'] },
      });
      this.syncContainer = syncContainer;

      console.log('✅ Cosmos DB initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Cosmos DB:', error);
      throw error;
    }
  }

  getTasksContainer(): Container | null {
    return this.tasksContainer;
  }

  getSyncContainer(): Container | null {
    return this.syncContainer;
  }

  isConnected(): boolean {
    return this.tasksContainer !== null && this.syncContainer !== null;
  }
}

export const cosmosService = new CosmosService();
