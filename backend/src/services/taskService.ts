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

  // Get all tasks for a sync code
  async getTasksBySyncCode(syncCode: string): Promise<Task[]> {
    const container = cosmosService.getTasksContainer();

    if (container) {
      // Use Cosmos DB
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.syncCode = @syncCode',
          parameters: [{ name: '@syncCode', value: syncCode }],
        })
        .fetchAll();

      return resources as Task[];
    } else {
      // Use mock storage
      return Array.from(this.mockTasks.values()).filter(
        (task) => task.syncCode === syncCode
      );
    }
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

  // Delete task
  async deleteTask(id: string, syncCode: string): Promise<boolean> {
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

  // Add subtasks to a task
  async addSubtasks(
    taskId: string,
    syncCode: string,
    subtaskTitles: string[]
  ): Promise<Task | null> {
    const task = await this.getTaskById(taskId, syncCode);
    if (!task) return null;

    const newSubtasks: Subtask[] = subtaskTitles.map((title, index) => ({
      id: uuidv4(),
      title,
      isCompleted: false,
      isArchived: false,
      parentTaskId: taskId,
      order: task.subtasks.length + index,
    }));

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
