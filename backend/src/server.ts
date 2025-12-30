import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { cosmosService } from './services/cosmosService';
import tasksRouter from './routes/tasks';
import aiRouter from './routes/ai';
import syncRouter from './routes/sync';
import notificationsRouter from './routes/notifications';
import authRouter from './routes/auth';
import imagesRouter from './routes/images';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or is Azure Container App
    if (allowedOrigins.includes(origin) || origin.includes('azurecontainerapps.io')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
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
app.use('/api/notifications', notificationsRouter);
app.use('/api/auth', authRouter);
app.use('/api/images', imagesRouter);

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
