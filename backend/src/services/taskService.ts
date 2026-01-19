import { v4 as uuidv4 } from 'uuid';
import { cosmosService } from './cosmosService';
import { Task, Subtask, TaskStatus } from '../types';

class TaskService {
  private mockTasks: Map<string, Task> = new Map();

  // Create a new task
  async createTask(
    title: string,
    description: string | undefined,
    syncCode: string
  ): Promise<Task> {
    const task: Task = {
      id: uuidv4(),
      title,
      description,
      status: TaskStatus.PENDING,
      progress: 0,
      subtasks: [],
      syncCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const container = cosmosService.getTasksContainer();

    if (container) {
      // Use Cosmos DB
      await container.items.create(task);
    } else {
      // Use mock storage
      this.mockTasks.set(task.id, task);
    }

    return task;
  }

  // Create a linked task from a subtask
  async createLinkedTask(
    title: string,
    description: string | undefined,
    syncCode: string,
    sourceSubtaskId: string
  ): Promise<{ task: Task; parentTask: Task }> {
    // Create the new task with sourceSubtaskId reference
    const newTask: Task = {
      id: uuidv4(),
      title,
      description,
      status: TaskStatus.PENDING,
      progress: 0,
      subtasks: [],
      syncCode,
      sourceSubtaskId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const container = cosmosService.getTasksContainer();

    if (container) {
      // Use Cosmos DB
      await container.items.create(newTask);
    } else {
      // Use mock storage
      this.mockTasks.set(newTask.id, newTask);
    }

    // Find parent task containing this subtask
    const allTasks = await this.getTasksBySyncCode(syncCode);
    const parentTask = allTasks.find((t) =>
      t.subtasks.some((st) => st.id === sourceSubtaskId)
    );

    if (!parentTask) {
      throw new Error('Parent task not found for the specified subtask');
    }

    // Update subtask with linkedTaskId
    const updatedSubtasks = parentTask.subtasks.map((st) =>
      st.id === sourceSubtaskId ? { ...st, linkedTaskId: newTask.id } : st
    );

    const updatedParentTask = await this.updateTask(parentTask.id, syncCode, {
      subtasks: updatedSubtasks,
    });

    if (!updatedParentTask) {
      throw new Error('Failed to update parent task');
    }

    return { task: newTask, parentTask: updatedParentTask };
  }

  // Find orphaned linked tasks (tasks whose parent task/subtask no longer exists)
  async findOrphanedLinkedTasks(syncCode: string): Promise<Task[]> {
    const allTasks = await this.getAllTasksRaw(syncCode);

    // Find tasks that have sourceSubtaskId (linked tasks)
    const linkedTasks = allTasks.filter((t) => t.sourceSubtaskId);

    const orphanedTasks: Task[] = [];
    for (const linkedTask of linkedTasks) {
      // Check if the parent task and subtask still exist
      const parentTask = allTasks.find((t) =>
        t.subtasks.some((st) => st.id === linkedTask.sourceSubtaskId)
      );

      // If parent task or subtask doesn't exist, this is an orphaned task
      if (!parentTask) {
        orphanedTasks.push(linkedTask);
      }
    }

    return orphanedTasks;
  }

  // Delete multiple tasks by IDs
  async deleteMultipleTasks(taskIds: string[], syncCode: string): Promise<boolean> {
    for (const taskId of taskIds) {
      await this.deleteTask(taskId, syncCode);
    }
    return true;
  }

  // Get all tasks without cleanup (internal use)
  private async getAllTasksRaw(syncCode: string): Promise<Task[]> {
    const container = cosmosService.getTasksContainer();

    if (container) {
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.syncCode = @syncCode',
          parameters: [{ name: '@syncCode', value: syncCode }],
        })
        .fetchAll();
      return resources as Task[];
    } else {
      return Array.from(this.mockTasks.values()).filter(
        (task) => task.syncCode === syncCode
      );
    }
  }

  // Get all tasks for a sync code (excludes soft-deleted tasks)
  async getTasksBySyncCode(syncCode: string): Promise<Task[]> {
    const allTasks = await this.getAllTasksRaw(syncCode);
    // Filter out soft-deleted tasks
    return allTasks.filter((task) => !task.isDeleted);
  }

  // Get task by ID
  async getTaskById(id: string, syncCode: string): Promise<Task | null> {
    const container = cosmosService.getTasksContainer();

    if (container) {
      try {
        const { resource } = await container.item(id, syncCode).read<Task>();
        return resource || null;
      } catch (error) {
        return null;
      }
    } else {
      return this.mockTasks.get(id) || null;
    }
  }

  // Update task
  async updateTask(
    id: string,
    syncCode: string,
    updates: Partial<Task>
  ): Promise<Task | null> {
    const container = cosmosService.getTasksContainer();

    if (container) {
      try {
        const { resource: existingTask } = await container.item(id, syncCode).read<Task>();
        if (!existingTask) return null;

        const updatedTask = {
          ...existingTask,
          ...updates,
          id,
          syncCode,
          updatedAt: new Date(),
        };

        const { resource } = await container.item(id, syncCode).replace(updatedTask);
        return resource || null;
      } catch (error) {
        return null;
      }
    } else {
      const task = this.mockTasks.get(id);
      if (!task || task.syncCode !== syncCode) return null;

      const updatedTask = {
        ...task,
        ...updates,
        updatedAt: new Date(),
      };
      this.mockTasks.set(id, updatedTask);
      return updatedTask;
    }
  }

  // Delete task (soft delete)
  async deleteTask(id: string, syncCode: string): Promise<boolean> {
    // First, get the task to find linked tasks
    const task = await this.getTaskById(id, syncCode);
    if (!task) return false;

    // Find and soft-delete all linked tasks (tasks created from this task's subtasks)
    const linkedTaskIds = task.subtasks
      .filter((st) => st.linkedTaskId)
      .map((st) => st.linkedTaskId!);

    // Soft-delete all linked tasks first
    for (const linkedTaskId of linkedTaskIds) {
      await this.deleteTask(linkedTaskId, syncCode);
    }

    // Soft delete: set isDeleted flag and deletedAt timestamp
    const result = await this.updateTask(id, syncCode, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    });

    return result !== null;
  }

  // Delete all tasks for a user (soft delete)
  async deleteAllTasks(syncCode: string): Promise<{ deletedCount: number }> {
    const tasks = await this.getTasksBySyncCode(syncCode);
    let deletedCount = 0;

    for (const task of tasks) {
      const success = await this.deleteTask(task.id, syncCode);
      if (success) deletedCount++;
    }

    return { deletedCount };
  }

  // Get deleted tasks (for history/trash view)
  async getDeletedTasks(syncCode: string): Promise<Task[]> {
    const allTasks = await this.getAllTasksRaw(syncCode);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Filter to only deleted tasks that are within 30 days
    const deletedTasks = allTasks.filter((task) => {
      if (!task.isDeleted || !task.deletedAt) return false;
      const deletedAt = new Date(task.deletedAt);
      return deletedAt > thirtyDaysAgo;
    });

    // Auto-cleanup: permanently delete tasks older than 30 days
    const expiredTasks = allTasks.filter((task) => {
      if (!task.isDeleted || !task.deletedAt) return false;
      const deletedAt = new Date(task.deletedAt);
      return deletedAt <= thirtyDaysAgo;
    });

    // Permanently delete expired tasks in background
    for (const expiredTask of expiredTasks) {
      await this.permanentDeleteTask(expiredTask.id, syncCode);
    }

    // Sort by deletedAt descending (most recent first)
    return deletedTasks.sort((a, b) => {
      const dateA = new Date(a.deletedAt!).getTime();
      const dateB = new Date(b.deletedAt!).getTime();
      return dateB - dateA;
    });
  }

  // Restore a deleted task
  async restoreTask(id: string, syncCode: string): Promise<Task | null> {
    const task = await this.getTaskById(id, syncCode);
    if (!task || !task.isDeleted) return null;

    return this.updateTask(id, syncCode, {
      isDeleted: false,
      deletedAt: undefined,
    });
  }

  // Permanently delete a task (hard delete)
  async permanentDeleteTask(id: string, syncCode: string): Promise<boolean> {
    const container = cosmosService.getTasksContainer();

    if (container) {
      try {
        await container.item(id, syncCode).delete();
        return true;
      } catch (error) {
        return false;
      }
    } else {
      const task = this.mockTasks.get(id);
      if (!task || task.syncCode !== syncCode) return false;
      return this.mockTasks.delete(id);
    }
  }

  // Empty trash: permanently delete all deleted tasks
  async emptyTrash(syncCode: string): Promise<{ deletedCount: number }> {
    const deletedTasks = await this.getDeletedTasks(syncCode);
    let deletedCount = 0;

    for (const task of deletedTasks) {
      const success = await this.permanentDeleteTask(task.id, syncCode);
      if (success) deletedCount++;
    }

    return { deletedCount };
  }

  // Add subtasks to a task
  async addSubtasks(
    taskId: string,
    syncCode: string,
    subtaskData: (string | { title: string; estimatedMinutes?: number; stepType?: 'physical' | 'mental' | 'creative'; order?: number })[]
  ): Promise<Task | null> {
    const task = await this.getTaskById(taskId, syncCode);
    if (!task) return null;

    const newSubtasks: Subtask[] = subtaskData.map((data, index) => {
      const isString = typeof data === 'string';

      // Preserve all fields from AI response (isComposite, status, depth, children, learning engine fields)
      if (!isString && typeof data === 'object') {
        return {
          id: uuidv4(),
          title: data.title,
          isCompleted: false,
          isArchived: false,
          parentTaskId: taskId,
          order: task.subtasks.length + (data.order ?? index),
          estimatedMinutes: data.estimatedMinutes || 5,
          stepType: data.stepType || 'mental',
          // ✅ Preserve ReCAP-ADHD fields
          isComposite: (data as any).isComposite || false,
          status: (data as any).status || 'active',
          depth: (data as any).depth || 0,
          children: (data as any).children || [],
          // ✅ Learning Engine fields (for study mode)
          strategyTag: (data as any).strategyTag,
          interactionType: (data as any).interactionType || 'checkbox',
        };
      }

      // Fallback for string input
      return {
        id: uuidv4(),
        title: data as string,
        isCompleted: false,
        isArchived: false,
        parentTaskId: taskId,
        order: task.subtasks.length + index,
        estimatedMinutes: 5,
        stepType: 'mental' as const,
        isComposite: false,
        status: 'active',
        depth: 0,
        children: [],
      };
    });

    const updatedSubtasks = [...task.subtasks, ...newSubtasks];
    const progress = this.calculateProgress(updatedSubtasks);

    return this.updateTask(taskId, syncCode, {
      subtasks: updatedSubtasks,
      progress,
      status: progress === 100 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
    });
  }

  // Toggle subtask completion
  async toggleSubtask(
    taskId: string,
    syncCode: string,
    subtaskId: string
  ): Promise<Task | null> {
    const task = await this.getTaskById(taskId, syncCode);
    if (!task) return null;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );

    const progress = this.calculateProgress(updatedSubtasks);

    return this.updateTask(taskId, syncCode, {
      subtasks: updatedSubtasks,
      progress,
      status: progress === 100 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
    });
  }

  // Complete subtask with confidence rating (SRS - Spaced Repetition for learning tasks)
  async completeWithConfidence(
    taskId: string,
    syncCode: string,
    subtaskId: string,
    confidenceData: { confidenceLevel: string; nextReviewAt: string }
  ): Promise<Task | null> {
    const task = await this.getTaskById(taskId, syncCode);
    if (!task) return null;

    // Helper to update a subtask with confidence data
    const updateSubtaskWithConfidence = (st: Subtask): Subtask => {
      if (st.id === subtaskId) {
        return {
          ...st,
          isCompleted: true,
          confidenceLevel: confidenceData.confidenceLevel as any,
          nextReviewAt: confidenceData.nextReviewAt,
        };
      }
      // Also check children recursively
      if (st.children && st.children.length > 0) {
        return {
          ...st,
          children: st.children.map(child => updateSubtaskWithConfidence(child)),
        };
      }
      return st;
    };

    const updatedSubtasks = task.subtasks.map(st => updateSubtaskWithConfidence(st));
    const progress = this.calculateProgress(updatedSubtasks);

    return this.updateTask(taskId, syncCode, {
      subtasks: updatedSubtasks,
      progress,
      status: progress === 100 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
    });
  }

  // Delete a subtask
  async deleteSubtask(
    taskId: string,
    syncCode: string,
    subtaskId: string
  ): Promise<Task | null> {
    const task = await this.getTaskById(taskId, syncCode);
    if (!task) return null;

    const updatedSubtasks = task.subtasks.filter((st) => st.id !== subtaskId);
    const progress = this.calculateProgress(updatedSubtasks);

    return this.updateTask(taskId, syncCode, {
      subtasks: updatedSubtasks,
      progress,
      status: progress === 100 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
    });
  }

  // Reorder subtasks
  async reorderSubtasks(
    taskId: string,
    syncCode: string,
    subtaskOrders: { id: string; order: number }[]
  ): Promise<Task | null> {
    const task = await this.getTaskById(taskId, syncCode);
    if (!task) return null;

    const updatedSubtasks = task.subtasks.map((subtask) => {
      const newOrder = subtaskOrders.find((so) => so.id === subtask.id);
      return newOrder ? { ...subtask, order: newOrder.order } : subtask;
    });

    return this.updateTask(taskId, syncCode, {
      subtasks: updatedSubtasks,
    });
  }

  // Archive/unarchive a subtask
  async archiveSubtask(
    taskId: string,
    syncCode: string,
    subtaskId: string,
    archived: boolean
  ): Promise<Task | null> {
    const task = await this.getTaskById(taskId, syncCode);
    if (!task) return null;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, isArchived: archived } : st
    );

    return this.updateTask(taskId, syncCode, {
      subtasks: updatedSubtasks,
    });
  }

  // Calculate task progress based on subtasks
  private calculateProgress(subtasks: Subtask[]): number {
    if (subtasks.length === 0) return 0;
    const completed = subtasks.filter((st) => st.isCompleted).length;
    return Math.round((completed / subtasks.length) * 100);
  }
}

export const taskService = new TaskService();
