import { CosmosClient, Database, Container } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

class CosmosService {
  private client: CosmosClient | null = null;
  private database: Database | null = null;
  private tasksContainer: Container | null = null;
  private syncContainer: Container | null = null;
  private usersContainer: Container | null = null;
  private pushSubscriptionsContainer: Container | null = null;

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

      // Create users container
      const { container: usersContainer } = await database.containers.createIfNotExists({
        id: 'users',
        partitionKey: { paths: ['/email'] },
      });
      this.usersContainer = usersContainer;

      // Create push subscriptions container
      const { container: pushSubscriptionsContainer } = await database.containers.createIfNotExists({
        id: 'pushSubscriptions',
        partitionKey: { paths: ['/deviceId'] },
      });
      this.pushSubscriptionsContainer = pushSubscriptionsContainer;

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

  getUsersContainer(): Container | null {
    return this.usersContainer;
  }

  getPushSubscriptionsContainer(): Container | null {
    return this.pushSubscriptionsContainer;
  }

  // Generic method to get any container by name
  getContainer(containerName: string): Container {
    switch (containerName) {
      case 'tasks':
        if (!this.tasksContainer) throw new Error('Tasks container not initialized');
        return this.tasksContainer;
      case 'sync-sessions':
        if (!this.syncContainer) throw new Error('Sync container not initialized');
        return this.syncContainer;
      case 'users':
        if (!this.usersContainer) throw new Error('Users container not initialized');
        return this.usersContainer;
      case 'pushSubscriptions':
        if (!this.pushSubscriptionsContainer) throw new Error('Push subscriptions container not initialized');
        return this.pushSubscriptionsContainer;
      default:
        throw new Error(`Unknown container: ${containerName}`);
    }
  }

  isConnected(): boolean {
    return this.tasksContainer !== null && this.syncContainer !== null && this.usersContainer !== null;
  }
}

export const cosmosService = new CosmosService();
