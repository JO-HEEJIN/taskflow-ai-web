import { Router, Request, Response } from 'express';
import { cosmosService } from '../services/cosmosService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface CoachConversation {
  id: string;
  odataetag?: string;
  userId: string;
  taskId?: string;
  subtaskId?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// Get all conversations for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const container = cosmosService.getCoachConversationsContainer();
    if (!container) {
      return res.status(500).json({ error: 'Coach conversations service not available' });
    }

    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    res.json({ conversations: resources });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get conversation for a specific task/subtask
router.get('/task/:taskId', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { taskId } = req.params;
    const { subtaskId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const container = cosmosService.getCoachConversationsContainer();
    if (!container) {
      return res.status(500).json({ error: 'Coach conversations service not available' });
    }

    let query = 'SELECT * FROM c WHERE c.userId = @userId AND c.taskId = @taskId';
    const parameters: any[] = [
      { name: '@userId', value: userId },
      { name: '@taskId', value: taskId },
    ];

    if (subtaskId) {
      query += ' AND c.subtaskId = @subtaskId';
      parameters.push({ name: '@subtaskId', value: subtaskId });
    }

    const { resources } = await container.items
      .query({ query, parameters })
      .fetchAll();

    res.json({ conversation: resources[0] || null });
  } catch (error) {
    console.error('Error fetching task conversation:', error);
    res.status(500).json({ error: 'Failed to fetch task conversation' });
  }
});

// Create or update a conversation
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const { id, taskId, subtaskId, messages } = req.body;

    const container = cosmosService.getCoachConversationsContainer();
    if (!container) {
      return res.status(500).json({ error: 'Coach conversations service not available' });
    }

    const now = new Date().toISOString();
    const conversation: CoachConversation = {
      id: id || uuidv4(),
      userId,
      taskId,
      subtaskId,
      messages: messages || [],
      createdAt: id ? req.body.createdAt : now,
      updatedAt: now,
    };

    const { resource } = await container.items.upsert(conversation);
    res.json({ conversation: resource });
  } catch (error) {
    console.error('Error saving conversation:', error);
    res.status(500).json({ error: 'Failed to save conversation' });
  }
});

// Add a message to a conversation
router.post('/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { conversationId } = req.params;
    const { role, content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const container = cosmosService.getCoachConversationsContainer();
    if (!container) {
      return res.status(500).json({ error: 'Coach conversations service not available' });
    }

    // Get existing conversation
    const { resource: existing } = await container.item(conversationId, userId).read();
    if (!existing) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add new message
    const newMessage: Message = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    existing.messages.push(newMessage);
    existing.updatedAt = new Date().toISOString();

    const { resource } = await container.items.upsert(existing);
    res.json({ conversation: resource });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Delete a conversation
router.delete('/:conversationId', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const container = cosmosService.getCoachConversationsContainer();
    if (!container) {
      return res.status(500).json({ error: 'Coach conversations service not available' });
    }

    await container.item(conversationId, userId).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
