import { Router, Request, Response } from 'express';
import { cosmosService } from '../services/cosmosService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Note {
  id: string;
  userId: string;
  taskId?: string;
  subtaskId?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Get all notes for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const container = cosmosService.getNotesContainer();
    if (!container) {
      return res.status(500).json({ error: 'Notes service not available' });
    }

    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    res.json({ notes: resources });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Get notes for a specific task
router.get('/task/:taskId', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { taskId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const container = cosmosService.getNotesContainer();
    if (!container) {
      return res.status(500).json({ error: 'Notes service not available' });
    }

    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId AND c.taskId = @taskId ORDER BY c.updatedAt DESC',
        parameters: [
          { name: '@userId', value: userId },
          { name: '@taskId', value: taskId },
        ],
      })
      .fetchAll();

    res.json({ notes: resources });
  } catch (error) {
    console.error('Error fetching task notes:', error);
    res.status(500).json({ error: 'Failed to fetch task notes' });
  }
});

// Create or update a note
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const { id, taskId, subtaskId, content } = req.body;

    const container = cosmosService.getNotesContainer();
    if (!container) {
      return res.status(500).json({ error: 'Notes service not available' });
    }

    const now = new Date().toISOString();
    const note: Note = {
      id: id || uuidv4(),
      userId,
      taskId,
      subtaskId,
      content,
      createdAt: id ? req.body.createdAt : now,
      updatedAt: now,
    };

    const { resource } = await container.items.upsert(note);
    res.json({ note: resource });
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// Delete a note
router.delete('/:noteId', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { noteId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const container = cosmosService.getNotesContainer();
    if (!container) {
      return res.status(500).json({ error: 'Notes service not available' });
    }

    await container.item(noteId, userId).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
