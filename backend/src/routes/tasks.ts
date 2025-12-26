import { Router, Request, Response } from 'express';
import { taskService } from '../services/taskService';
import { notificationService } from '../services/notificationService';

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

// Create linked task from subtask
router.post('/linked', async (req: Request, res: Response) => {
  try {
    const { title, description, sourceSubtaskId } = req.body;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    if (!sourceSubtaskId) {
      return res.status(400).json({ error: 'sourceSubtaskId is required' });
    }

    const { task, parentTask } = await taskService.createLinkedTask(
      title,
      description,
      syncCode,
      sourceSubtaskId
    );

    // Send notification: Linked Task Created
    const sourceSubtask = parentTask?.subtasks?.find(s => s.id === sourceSubtaskId);
    await notificationService.notifyLinkedTaskCreated(
      syncCode,
      task.title,
      sourceSubtask?.title || 'a subtask'
    );

    res.status(201).json({ task, parentTask });
  } catch (error: any) {
    console.error('Error creating linked task:', error);
    res.status(500).json({ error: error.message || 'Failed to create linked task' });
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

// Reorder subtasks (MUST be before /:subtaskId routes!)
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

// Archive/unarchive subtask (MUST be before /:subtaskId routes!)
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

    // Send notification: Task Completed (if progress reaches 100%)
    if (task.progress === 100 && task.status !== 'completed') {
      await notificationService.notifyTaskCompleted(syncCode, task.title);
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

// Get orphaned linked tasks
router.get('/orphaned/detect', async (req: Request, res: Response) => {
  try {
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    const orphanedTasks = await taskService.findOrphanedLinkedTasks(syncCode);

    // Send notification: Orphaned Tasks Found (if any exist)
    if (orphanedTasks.length > 0) {
      await notificationService.notifyOrphanedTasksFound(syncCode, orphanedTasks.length);
    }

    res.json({ orphanedTasks });
  } catch (error) {
    console.error('Error finding orphaned tasks:', error);
    res.status(500).json({ error: 'Failed to find orphaned tasks' });
  }
});

// Delete multiple tasks
router.post('/batch/delete', async (req: Request, res: Response) => {
  try {
    const { taskIds } = req.body;
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'taskIds must be a non-empty array' });
    }

    await taskService.deleteMultipleTasks(taskIds, syncCode);
    res.json({ success: true, deletedCount: taskIds.length });
  } catch (error) {
    console.error('Error deleting tasks:', error);
    res.status(500).json({ error: 'Failed to delete tasks' });
  }
});

export default router;
