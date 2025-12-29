import { Router, Request, Response } from 'express';
import { azureOpenAIService } from '../services/azureOpenAIService';
import { taskService } from '../services/taskService';
import { webPushService } from '../services/webPushService';

const router = Router();

// AI task breakdown endpoint
router.post('/breakdown/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const { title, description } = req.body; // For guest users who send task data in body

    // Guest mode: task data provided in request body
    if (!userId && title) {
      console.log('🔓 Guest user requesting AI breakdown');
      const breakdown = await azureOpenAIService.breakdownTask(title, description);

      return res.json({
        taskId,
        suggestions: breakdown.subtasks,
        count: breakdown.subtasks.length,
      });
    }

    // Authenticated mode: fetch task from database
    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header or task data' });
    }

    // Get the task
    const task = await taskService.getTaskById(taskId, userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Generate AI breakdown
    const breakdown = await azureOpenAIService.breakdownTask(
      task.title,
      task.description
    );

    // Send notification: AI Breakdown Complete
    await webPushService.notifyAIBreakdownComplete(
      userId,
      task.title,
      breakdown.subtasks.length
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

// AI encouragement endpoint
router.post('/encourage', async (req: Request, res: Response) => {
  try {
    const { completedSubtask, nextSubtask, progress } = req.body;

    if (!completedSubtask) {
      return res.status(400).json({ error: 'completedSubtask is required' });
    }

    if (!progress || typeof progress.completed !== 'number' || typeof progress.total !== 'number') {
      return res.status(400).json({ error: 'progress object with completed and total is required' });
    }

    const message = await azureOpenAIService.generateEncouragement(
      completedSubtask,
      nextSubtask || null,
      progress
    );

    res.json({ message });
  } catch (error) {
    console.error('Error generating encouragement:', error);
    res.status(500).json({ error: 'Failed to generate encouragement' });
  }
});

export default router;
