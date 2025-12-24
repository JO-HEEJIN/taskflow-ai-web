import { Router, Request, Response } from 'express';
import { azureOpenAIService } from '../services/azureOpenAIService';
import { taskService } from '../services/taskService';

const router = Router();

// AI task breakdown endpoint
router.post('/breakdown/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    // Get the task
    const task = await taskService.getTaskById(taskId, syncCode);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Generate AI breakdown
    const breakdown = await azureOpenAIService.breakdownTask(
      task.title,
      task.description
    );

    res.json({
      taskId: task.id,
      suggestions: breakdown.subtasks,
      count: breakdown.subtasks.length,
    });
  } catch (error) {
    console.error('Error generating AI breakdown:', error);
    res.status(500).json({ error: 'Failed to generate task breakdown' });
  }
});

// Direct AI breakdown (without saving to task)
router.post('/breakdown', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const breakdown = await azureOpenAIService.breakdownTask(title, description);

    res.json({
      suggestions: breakdown.subtasks,
      count: breakdown.subtasks.length,
    });
  } catch (error) {
    console.error('Error generating AI breakdown:', error);
    res.status(500).json({ error: 'Failed to generate task breakdown' });
  }
});

export default router;
