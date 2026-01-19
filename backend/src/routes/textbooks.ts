import { Router, Request, Response } from 'express';
import { textbookService } from '../services/textbookService';

const router = Router();

// Get all textbooks for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const textbooks = await textbookService.getTextbooks(userId);
    res.json({ textbooks });
  } catch (error) {
    console.error('Error fetching textbooks:', error);
    res.status(500).json({ error: 'Failed to fetch textbooks' });
  }
});

// Get textbook by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const textbook = await textbookService.getTextbookById(id, userId);

    if (!textbook) {
      return res.status(404).json({ error: 'Textbook not found' });
    }

    res.json({ textbook });
  } catch (error) {
    console.error('Error fetching textbook:', error);
    res.status(500).json({ error: 'Failed to fetch textbook' });
  }
});

// Create new textbook
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, author, description, chapters } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Textbook title is required' });
    }

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: 'At least one chapter is required' });
    }

    const textbook = await textbookService.createTextbook(
      title,
      userId,
      chapters,
      author,
      description
    );

    res.status(201).json({ textbook });
  } catch (error) {
    console.error('Error creating textbook:', error);
    res.status(500).json({ error: 'Failed to create textbook' });
  }
});

// Update textbook
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const textbook = await textbookService.updateTextbook(id, userId, updates);

    if (!textbook) {
      return res.status(404).json({ error: 'Textbook not found' });
    }

    res.json({ textbook });
  } catch (error) {
    console.error('Error updating textbook:', error);
    res.status(500).json({ error: 'Failed to update textbook' });
  }
});

// Delete textbook
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const success = await textbookService.deleteTextbook(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Textbook not found' });
    }

    res.json({ message: 'Textbook deleted successfully' });
  } catch (error) {
    console.error('Error deleting textbook:', error);
    res.status(500).json({ error: 'Failed to delete textbook' });
  }
});

// Generate study tasks from textbook chapters using AI
router.post('/:id/generate-tasks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const result = await textbookService.createTasksFromTextbook(id, userId);

    res.json({
      textbook: result.textbook,
      tasks: result.tasks,
      message: `Created ${result.tasks.length} study tasks`,
    });
  } catch (error: any) {
    console.error('Error generating tasks from textbook:', error);
    res.status(500).json({ error: error.message || 'Failed to generate tasks' });
  }
});

export default router;
