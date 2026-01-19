import { v4 as uuidv4 } from 'uuid';
import { cosmosService } from './cosmosService';
import { taskService } from './taskService';
import { azureOpenAIService } from './azureOpenAIService';
import { Textbook, Chapter, Task, TaskStatus } from '../types';

class TextbookService {
  private mockTextbooks: Map<string, Textbook> = new Map();

  // Create a new textbook
  async createTextbook(
    title: string,
    syncCode: string,
    chapters: { title: string; description?: string }[],
    author?: string,
    description?: string
  ): Promise<Textbook> {
    const textbook: Textbook = {
      id: uuidv4(),
      title,
      author,
      description,
      chapters: chapters.map((ch, index) => ({
        id: uuidv4(),
        title: ch.title,
        description: ch.description,
        order: index,
        isCompleted: false,
      })),
      syncCode,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const container = cosmosService.getTextbooksContainer();

    if (container) {
      await container.items.create(textbook);
    } else {
      this.mockTextbooks.set(textbook.id, textbook);
    }

    return textbook;
  }

  // Get all textbooks for a user
  async getTextbooks(syncCode: string): Promise<Textbook[]> {
    const container = cosmosService.getTextbooksContainer();

    if (container) {
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.syncCode = @syncCode',
          parameters: [{ name: '@syncCode', value: syncCode }],
        })
        .fetchAll();
      return resources as Textbook[];
    } else {
      return Array.from(this.mockTextbooks.values()).filter(
        (textbook) => textbook.syncCode === syncCode
      );
    }
  }

  // Get textbook by ID
  async getTextbookById(id: string, syncCode: string): Promise<Textbook | null> {
    const container = cosmosService.getTextbooksContainer();

    if (container) {
      try {
        const { resource } = await container.item(id, syncCode).read<Textbook>();
        return resource || null;
      } catch (error) {
        return null;
      }
    } else {
      return this.mockTextbooks.get(id) || null;
    }
  }

  // Update textbook
  async updateTextbook(
    id: string,
    syncCode: string,
    updates: Partial<Textbook>
  ): Promise<Textbook | null> {
    const container = cosmosService.getTextbooksContainer();

    if (container) {
      try {
        const { resource: existingTextbook } = await container.item(id, syncCode).read<Textbook>();
        if (!existingTextbook) return null;

        const updatedTextbook = {
          ...existingTextbook,
          ...updates,
          id,
          syncCode,
          updatedAt: new Date(),
        };

        // Recalculate progress
        if (updatedTextbook.chapters && updatedTextbook.chapters.length > 0) {
          const completedChapters = updatedTextbook.chapters.filter((ch) => ch.isCompleted).length;
          updatedTextbook.progress = Math.round((completedChapters / updatedTextbook.chapters.length) * 100);
        }

        const { resource } = await container.item(id, syncCode).replace(updatedTextbook);
        return resource || null;
      } catch (error) {
        return null;
      }
    } else {
      const textbook = this.mockTextbooks.get(id);
      if (!textbook || textbook.syncCode !== syncCode) return null;

      const updatedTextbook = {
        ...textbook,
        ...updates,
        updatedAt: new Date(),
      };

      // Recalculate progress
      if (updatedTextbook.chapters && updatedTextbook.chapters.length > 0) {
        const completedChapters = updatedTextbook.chapters.filter((ch) => ch.isCompleted).length;
        updatedTextbook.progress = Math.round((completedChapters / updatedTextbook.chapters.length) * 100);
      }

      this.mockTextbooks.set(id, updatedTextbook);
      return updatedTextbook;
    }
  }

  // Delete textbook
  async deleteTextbook(id: string, syncCode: string): Promise<boolean> {
    const container = cosmosService.getTextbooksContainer();

    if (container) {
      try {
        await container.item(id, syncCode).delete();
        return true;
      } catch (error) {
        return false;
      }
    } else {
      const textbook = this.mockTextbooks.get(id);
      if (!textbook || textbook.syncCode !== syncCode) return false;
      return this.mockTextbooks.delete(id);
    }
  }

  // Update chapter with linked task ID
  async linkChapterToTask(
    textbookId: string,
    chapterId: string,
    taskId: string,
    syncCode: string
  ): Promise<Textbook | null> {
    const textbook = await this.getTextbookById(textbookId, syncCode);
    if (!textbook) return null;

    const updatedChapters = textbook.chapters.map((ch) =>
      ch.id === chapterId ? { ...ch, linkedTaskId: taskId } : ch
    );

    return this.updateTextbook(textbookId, syncCode, { chapters: updatedChapters });
  }

  // Mark chapter as completed (called when linked task is completed)
  async markChapterCompleted(
    textbookId: string,
    chapterId: string,
    syncCode: string
  ): Promise<Textbook | null> {
    const textbook = await this.getTextbookById(textbookId, syncCode);
    if (!textbook) return null;

    const updatedChapters = textbook.chapters.map((ch) =>
      ch.id === chapterId ? { ...ch, isCompleted: true } : ch
    );

    return this.updateTextbook(textbookId, syncCode, { chapters: updatedChapters });
  }

  // Generate study tasks from textbook chapters using AI
  async createTasksFromTextbook(
    textbookId: string,
    syncCode: string
  ): Promise<{ textbook: Textbook; tasks: Task[] }> {
    const textbook = await this.getTextbookById(textbookId, syncCode);
    if (!textbook) {
      throw new Error('Textbook not found');
    }

    const createdTasks: Task[] = [];
    const updatedChapters: Chapter[] = [];

    for (const chapter of textbook.chapters) {
      // Skip if chapter already has a linked task
      if (chapter.linkedTaskId) {
        updatedChapters.push(chapter);
        continue;
      }

      // Generate study plan using AI
      const studyPlan = await azureOpenAIService.generateStudyPlan(
        chapter.title,
        textbook.title,
        chapter.description
      );

      // Create task for this chapter
      const task = await taskService.createTask(
        `Study: ${chapter.title}`,
        `Chapter from "${textbook.title}"`,
        syncCode
      );

      // Add textbook/chapter reference to task
      await taskService.updateTask(task.id, syncCode, {
        textbookId: textbookId,
        chapterId: chapter.id,
      });

      // Add AI-generated subtasks
      if (studyPlan.subtasks && studyPlan.subtasks.length > 0) {
        await taskService.addSubtasks(task.id, syncCode, studyPlan.subtasks);
      }

      // Fetch updated task with subtasks
      const updatedTask = await taskService.getTaskById(task.id, syncCode);
      if (updatedTask) {
        createdTasks.push(updatedTask);
      }

      // Update chapter with linked task ID
      updatedChapters.push({
        ...chapter,
        linkedTaskId: task.id,
      });
    }

    // Update textbook with linked task IDs
    const updatedTextbook = await this.updateTextbook(textbookId, syncCode, {
      chapters: updatedChapters,
    });

    return {
      textbook: updatedTextbook!,
      tasks: createdTasks,
    };
  }
}

export const textbookService = new TextbookService();
