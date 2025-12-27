import { guestStorage } from './guestStorage';
import { Task } from '../types';

// Migration UI state
let migrationInProgress = false;
let migrationCallback: ((message: string, type: 'progress' | 'success' | 'error') => void) | null = null;

/**
 * Set migration UI callback
 */
export function setMigrationCallback(
  callback: (message: string, type: 'progress' | 'success' | 'error') => void
): void {
  migrationCallback = callback;
}

/**
 * Show migration progress
 */
function showMigrationProgress(message: string = 'Importing your tasks...') {
  if (migrationCallback) {
    migrationCallback(message, 'progress');
  } else {
    console.log(`[Migration] ${message}`);
  }
}

/**
 * Show migration success
 */
function showMigrationSuccess(count: number) {
  const message = `Successfully imported ${count} task${count !== 1 ? 's' : ''}!`;
  if (migrationCallback) {
    migrationCallback(message, 'success');
  } else {
    console.log(`[Migration] ${message}`);
  }
}

/**
 * Show migration error
 */
function showMigrationError(error?: string) {
  const message = error || 'Migration failed. Your local tasks are safe.';
  if (migrationCallback) {
    migrationCallback(message, 'error');
  } else {
    console.error(`[Migration] ${message}`);
  }
}

/**
 * Migrate guest tasks to authenticated backend
 * This is called when a user signs in
 */
export async function migrateGuestDataIfNeeded(userId: string): Promise<void> {
  // Avoid duplicate migrations
  if (migrationInProgress) {
    console.log('[Migration] Migration already in progress, skipping...');
    return;
  }

  // Check if we already migrated
  if (typeof window !== 'undefined') {
    const migrated = localStorage.getItem(`migration_complete_${userId}`);
    if (migrated) {
      console.log('[Migration] Already migrated for this user, skipping...');
      return;
    }
  }

  const guestTasks = guestStorage.getAllTasks();

  if (guestTasks.length === 0) {
    console.log('[Migration] No guest tasks to migrate');
    return;
  }

  migrationInProgress = true;
  console.log(`[Migration] Starting migration of ${guestTasks.length} tasks...`);
  showMigrationProgress(`Importing ${guestTasks.length} task${guestTasks.length !== 1 ? 's' : ''}...`);

  try {
    // We need to import the API client dynamically to avoid circular dependencies
    const { api } = await import('./api');

    let migratedCount = 0;

    // Migrate each task
    for (const task of guestTasks) {
      try {
        // Create the task on backend
        const response = await api.createTask(task.title, task.description);
        const newTask = response.task;

        if (!newTask) {
          console.error('[Migration] Failed to create task:', task.title);
          continue;
        }

        // Recreate subtasks if any
        if (task.subtasks && task.subtasks.length > 0) {
          const subtaskTitles = task.subtasks
            .sort((a, b) => a.order - b.order)
            .map((st) => st.title);

          await api.addSubtasks(newTask.id, subtaskTitles);

          // Restore completion and archive states
          const subtasksResponse = await api.getTasks();
          const createdTask = subtasksResponse.tasks.find((t: Task) => t.id === newTask.id);

          if (createdTask && createdTask.subtasks) {
            for (let i = 0; i < task.subtasks.length; i++) {
              const originalSubtask = task.subtasks[i];
              const createdSubtask = createdTask.subtasks[i];

              if (createdSubtask) {
                // Toggle completion if needed
                if (originalSubtask.isCompleted) {
                  await api.toggleSubtask(newTask.id, createdSubtask.id);
                }

                // Archive if needed
                if (originalSubtask.isArchived) {
                  await api.archiveSubtask(newTask.id, createdSubtask.id, true);
                }
              }
            }
          }
        }

        // Update task status if it was in progress or completed
        if (task.status !== 'pending') {
          await api.updateTask(newTask.id, { status: task.status });
        }

        migratedCount++;
        showMigrationProgress(`Imported ${migratedCount} of ${guestTasks.length} tasks...`);

      } catch (error) {
        console.error('[Migration] Error migrating task:', task.title, error);
        // Continue with other tasks even if one fails
      }
    }

    // Clear guest data after successful migration
    guestStorage.clearGuestData();

    // Mark migration as complete for this user
    if (typeof window !== 'undefined') {
      localStorage.setItem(`migration_complete_${userId}`, 'true');
    }

    console.log(`[Migration] Successfully migrated ${migratedCount} tasks`);
    showMigrationSuccess(migratedCount);

    migrationInProgress = false;

  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    showMigrationError(error instanceof Error ? error.message : 'Unknown error');
    migrationInProgress = false;

    // Don't clear guest data on failure - keep it safe
    throw error;
  }
}

/**
 * Initialize guest mode
 * Called when user is unauthenticated
 */
export function initializeGuestMode(): void {
  guestStorage.initialize();
  console.log('[Guest Mode] Initialized');
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  return guestStorage.isGuestMode() && guestStorage.getTaskCount() > 0;
}

/**
 * Reset migration state (for testing or troubleshooting)
 */
export function resetMigrationState(userId?: string): void {
  if (typeof window === 'undefined') return;

  if (userId) {
    localStorage.removeItem(`migration_complete_${userId}`);
  } else {
    // Clear all migration flags
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('migration_complete_')) {
        localStorage.removeItem(key);
      }
    });
  }

  console.log('[Migration] Migration state reset');
}
