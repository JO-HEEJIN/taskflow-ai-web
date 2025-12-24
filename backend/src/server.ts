import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { cosmosService } from './services/cosmosService';
import tasksRouter from './routes/tasks';
import aiRouter from './routes/ai';
import syncRouter from './routes/sync';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cosmosConnected: cosmosService.isConnected(),
  });
});

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'TaskFlow AI API',
    version: '1.0.0',
    endpoints: {
      tasks: '/api/tasks',
      ai: '/api/ai',
      sync: '/api/sync',
    },
  });
});

// Mount routers
app.use('/api/tasks', tasksRouter);
app.use('/api/ai', aiRouter);
app.use('/api/sync', syncRouter);

// Initialize services and start server
async function startServer() {
  try {
    // Initialize Cosmos DB
    await cosmosService.initialize();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 TaskFlow AI Backend running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Cosmos DB: ${cosmosService.isConnected() ? 'Connected' : 'Mock mode'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
