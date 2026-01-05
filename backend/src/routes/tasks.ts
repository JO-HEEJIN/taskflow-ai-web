import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { taskService } from '../services/taskService';
import { webPushService } from '../services/webPushService';
import { azureOpenAIService } from '../services/azureOpenAIService';
import { TaskStatus } from '../types';

const router = Router();

// Get all tasks for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const tasks = await taskService.getTasksBySyncCode(userId); // syncCode field stores userId
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
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const task = await taskService.getTaskById(id, userId);

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
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const task = await taskService.createTask(title, description, userId);
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
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
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
      userId,
      sourceSubtaskId
    );

    // Send notification: Linked Task Created
    const sourceSubtask = parentTask?.subtasks?.find(s => s.id === sourceSubtaskId);
    await webPushService.notifyLinkedTaskCreated(
      userId,
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
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const task = await taskService.updateTask(id, userId, updates);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Approve AI-generated breakdown (transition subtasks draft → active)
router.post('/:id/approve-breakdown', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const task = await taskService.getTaskById(id, userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if there are any draft subtasks to approve
    const hasDraftSubtasks = task.subtasks.some(st => st.status === 'draft');

    if (!hasDraftSubtasks) {
      return res.status(400).json({
        error: 'No draft subtasks to approve',
        currentStatus: task.status
      });
    }

    // Update all subtasks from draft to active
    // If task is DRAFT, also transition it to PENDING
    const updatedTask = await taskService.updateTask(id, userId, {
      status: task.status === TaskStatus.DRAFT ? TaskStatus.PENDING : task.status,
      subtasks: task.subtasks.map(st => ({
        ...st,
        status: st.status === 'draft' ? 'active' : st.status
      }))
    });

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('Error approving breakdown:', error);
    res.status(500).json({ error: 'Failed to approve breakdown' });
  }
});

// Delete task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    // Check task status before deletion (guard rail for data protection)
    const task = await taskService.getTaskById(id, userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only DRAFT tasks can be deleted via API
    // ACTIVE tasks (PENDING, IN_PROGRESS, COMPLETED) require user confirmation via UI
    if (task.status !== TaskStatus.DRAFT) {
      return res.status(403).json({
        error: 'Cannot delete ACTIVE task via API. User must confirm via UI.',
        currentStatus: task.status,
        taskTitle: task.title
      });
    }

    const success = await taskService.deleteTask(id, userId);

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
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    if (!Array.isArray(subtasks) || subtasks.length === 0) {
      return res.status(400).json({ error: 'Subtasks array is required' });
    }

    const task = await taskService.addSubtasks(id, userId, subtasks);

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
    const userId = req.headers['x-user-id'] as string;

    console.log('🔄 Reorder request received:', { taskId, subtaskOrders });

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    if (!Array.isArray(subtaskOrders)) {
      return res.status(400).json({ error: 'subtaskOrders must be an array' });
    }

    const task = await taskService.reorderSubtasks(taskId, userId, subtaskOrders);

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
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    if (typeof archived !== 'boolean') {
      return res.status(400).json({ error: 'archived must be a boolean' });
    }

    const task = await taskService.archiveSubtask(taskId, userId, subtaskId, archived);

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
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const task = await taskService.toggleSubtask(taskId, userId, subtaskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Send notification: Task Completed (if progress reaches 100%)
    if (task.progress === 100 && task.status !== 'completed') {
      await webPushService.notifyTaskCompleted(userId, task.title);
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
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const task = await taskService.deleteSubtask(taskId, userId, subtaskId);

    if (!task) {
      return res.status(404).json({ error: 'Task or subtask not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
});

// Deep Dive: Recursively break down composite subtask (>10 min)
router.post('/:taskId/subtasks/:subtaskId/deep-dive', async (req: Request, res: Response) => {
  try {
    const { taskId, subtaskId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    // Fetch task and find subtask
    const task = await taskService.getTaskById(taskId, userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const subtask = task.subtasks.find(st => st.id === subtaskId);

    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    // Verify subtask is composite (>10 min or already marked)
    if (!subtask.isComposite && (subtask.estimatedMinutes || 0) <= 10) {
      return res.status(400).json({
        error: 'Subtask is not composite (≤10 min)',
        estimatedMinutes: subtask.estimatedMinutes
      });
    }

    // Check if already has children
    if (subtask.children && subtask.children.length > 0) {
      return res.status(400).json({
        error: 'Subtask already has children',
        childrenCount: subtask.children.length
      });
    }

    console.log(`🔍 Deep Dive request for subtask: "${subtask.title}" (${subtask.estimatedMinutes} min)`);

    // Call Deep Dive AI to generate children
    const children = await azureOpenAIService.deepDiveBreakdown(
      subtask.title,
      subtask.estimatedMinutes || 10,
      task.title,
      subtask.depth || 0,
      userId
    );

    // Assign IDs and parent references to children
    const childrenWithIds = children.map(child => ({
      ...child,
      id: uuidv4(),
      parentTaskId: taskId,
      parentSubtaskId: subtaskId,
    }));

    // Update subtask with children
    const updatedSubtasks = task.subtasks.map(st =>
      st.id === subtaskId
        ? { ...st, children: childrenWithIds }
        : st
    );

    // Save updated task
    const updatedTask = await taskService.updateTask(taskId, userId, {
      subtasks: updatedSubtasks
    });

    console.log(`✅ Deep Dive complete: Generated ${childrenWithIds.length} children for "${subtask.title}"`);

    res.json({
      task: updatedTask,
      childrenCount: childrenWithIds.length
    });
  } catch (error: any) {
    console.error('Error in deep-dive:', error);
    res.status(500).json({ error: error.message || 'Failed to perform deep dive' });
  }
});

// Get orphaned linked tasks
router.get('/orphaned/detect', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const orphanedTasks = await taskService.findOrphanedLinkedTasks(userId);

    // Send notification: Orphaned Tasks Found (if any exist)
    if (orphanedTasks.length > 0) {
      await webPushService.notifyOrphanedTasksFound(userId, orphanedTasks.length);
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
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'taskIds must be a non-empty array' });
    }

    await taskService.deleteMultipleTasks(taskIds, userId);
    res.json({ success: true, deletedCount: taskIds.length });
  } catch (error) {
    console.error('Error deleting tasks:', error);
    res.status(500).json({ error: 'Failed to delete tasks' });
  }
});

export default router;
