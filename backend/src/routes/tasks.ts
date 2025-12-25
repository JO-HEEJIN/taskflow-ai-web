import { Router, Request, Response } from 'express';
import { taskService } from '../services/taskService';

const router = Router();

// Get all tasks for a device
router.get('/', async (req: Request, res: Response) => {
  try {
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    const tasks = await taskService.getTasksBySyncCode(syncCode);
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    const task = await taskService.getTaskById(id, syncCode);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create new task
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const task = await taskService.createTask(title, description, syncCode);
    res.status(201).json({ task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    const task = await taskService.updateTask(id, syncCode, updates);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    const success = await taskService.deleteTask(id, syncCode);

    if (!success) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Add subtasks to task
router.post('/:id/subtasks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subtasks } = req.body;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    if (!Array.isArray(subtasks) || subtasks.length === 0) {
      return res.status(400).json({ error: 'Subtasks array is required' });
    }

    const task = await taskService.addSubtasks(id, syncCode, subtasks);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error adding subtasks:', error);
    res.status(500).json({ error: 'Failed to add subtasks' });
  }
});

// Toggle subtask completion
router.patch('/:taskId/subtasks/:subtaskId', async (req: Request, res: Response) => {
  try {
    const { taskId, subtaskId } = req.params;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    const task = await taskService.toggleSubtask(taskId, syncCode, subtaskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error toggling subtask:', error);
    res.status(500).json({ error: 'Failed to toggle subtask' });
  }
});

// Delete subtask
router.delete('/:taskId/subtasks/:subtaskId', async (req: Request, res: Response) => {
  try {
    const { taskId, subtaskId } = req.params;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    const task = await taskService.deleteSubtask(taskId, syncCode, subtaskId);

    if (!task) {
      return res.status(404).json({ error: 'Task or subtask not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
});

// Reorder subtasks
router.patch('/:taskId/subtasks/reorder', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { subtaskOrders } = req.body;
    const syncCode = req.headers['x-sync-code'] as string;

    console.log('🔄 Reorder request received:', { taskId, subtaskOrders });

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    if (!Array.isArray(subtaskOrders)) {
      return res.status(400).json({ error: 'subtaskOrders must be an array' });
    }

    const task = await taskService.reorderSubtasks(taskId, syncCode, subtaskOrders);

    if (!task) {
      console.error('❌ Task not found for reorder');
      return res.status(404).json({ error: 'Task not found' });
    }

    console.log('✅ Reorder successful, updated subtasks:', task.subtasks.map(st => ({ id: st.id, order: st.order })));
    res.json({ task });
  } catch (error) {
    console.error('Error reordering subtasks:', error);
    res.status(500).json({ error: 'Failed to reorder subtasks' });
  }
});

// Archive/unarchive subtask
router.patch('/:taskId/subtasks/:subtaskId/archive', async (req: Request, res: Response) => {
  try {
    const { taskId, subtaskId } = req.params;
    const { archived } = req.body;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    if (typeof archived !== 'boolean') {
      return res.status(400).json({ error: 'archived must be a boolean' });
    }

    const task = await taskService.archiveSubtask(taskId, syncCode, subtaskId, archived);

    if (!task) {
      return res.status(404).json({ error: 'Task or subtask not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error archiving subtask:', error);
    res.status(500).json({ error: 'Failed to archive subtask' });
  }
});

export default router;
