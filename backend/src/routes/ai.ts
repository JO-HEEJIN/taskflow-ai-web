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
    const { title, description, existingSubtasks } = req.body; // For guest users who send task data in body

    // Guest mode: task data provided in request body
    if (!userId && title) {
      console.log('🔓 Guest user requesting AI breakdown');
      console.log(`📋 Existing subtasks count: ${existingSubtasks?.length || 0}`);

      const breakdown = await azureOpenAIService.breakdownTask(
        title,
        description,
        undefined, // userId
        existingSubtasks
      );

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
    // If task already has subtasks, pass them to avoid duplicates
    const taskExistingSubtasks = task.subtasks && task.subtasks.length > 0
      ? task.subtasks.map(st => ({ title: st.title, estimatedMinutes: st.estimatedMinutes }))
      : undefined;

    const breakdown = await azureOpenAIService.breakdownTask(
      task.title,
      task.description,
      userId,
      taskExistingSubtasks
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

// Streaming AI breakdown endpoint (SSE)
router.get('/breakdown-stream', async (req: Request, res: Response) => {
  try {
    const { taskTitle, taskDescription } = req.query;
    const userId = req.headers['x-user-id'] as string;

    if (!taskTitle || typeof taskTitle !== 'string') {
      return res.status(400).json({ error: 'taskTitle is required' });
    }

    console.log(`🔄 [SSE] Starting streaming breakdown for: "${taskTitle}"`);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Get streaming generator
    const stream = azureOpenAIService.breakdownTaskStreaming(
      taskTitle,
      taskDescription as string | undefined,
      userId
    );

    let buffer = '';
    let subtaskCount = 0;

    try {
      for await (const chunk of stream) {
        buffer += chunk;

        // Try to parse and extract complete subtasks
        // o3-mini returns JSON array, try to detect complete objects
        const subtaskMatch = buffer.match(/\{\s*"title"\s*:\s*"[^"]*"[^}]*\}/g);

        if (subtaskMatch && subtaskMatch.length > subtaskCount) {
          // New subtask completed
          const newSubtask = subtaskMatch[subtaskCount];
          try {
            const parsed = JSON.parse(newSubtask);
            // Send individual subtask event
            res.write(`data: ${JSON.stringify({ type: 'subtask', subtask: parsed })}\n\n`);
            subtaskCount++;
          } catch (e) {
            // Not yet valid JSON, continue buffering
          }
        }

        // Also send raw chunk for debugging
        res.write(`data: ${JSON.stringify({ type: 'chunk', chunk })}\n\n`);
      }

      // Parse final complete JSON
      try {
        const cleanedBuffer = buffer.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanedBuffer);
        const rawSubtasks = Array.isArray(parsed) ? parsed : parsed.subtasks || [];

        console.log(`🔄 [SSE] Performing recursive breakdown for ${rawSubtasks.length} initial subtasks...`);

        // Perform automatic recursive breakdown for subtasks >10 min (like non-streaming version)
        const recursivelyBrokenDown = await Promise.all(
          rawSubtasks.map(async (st: any, index: number) => {
            const estimatedMinutes = st.estimatedMinutes || 5;

            return {
              title: st.title || String(st),
              order: st.order ?? index,
              estimatedMinutes,
              stepType: st.stepType || 'mental',
              status: 'draft',
              isComposite: estimatedMinutes > 10,
              depth: 0,
              // Automatic recursive breakdown for >10 min subtasks
              children: estimatedMinutes > 10
                ? await azureOpenAIService.recursiveBreakdownUntilAtomic(
                    st.title,
                    estimatedMinutes,
                    taskTitle,
                    1
                  )
                : [],
            };
          })
        );

        console.log(`✅ [SSE] Recursive breakdown complete. Total subtasks with children generated.`);

        // Send completion event with fully broken-down subtasks
        res.write(`data: ${JSON.stringify({ type: 'complete', subtasks: recursivelyBrokenDown })}\n\n`);
      } catch (e) {
        console.error('Failed to parse final JSON:', e);
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to parse JSON' })}\n\n`);
      }

      res.end();
    } catch (streamError) {
      console.error('Stream error:', streamError);
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Streaming failed' })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error('Error in streaming breakdown:', error);
    res.status(500).json({ error: error.message || 'Failed to stream breakdown' });
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

// AI coach chat endpoint
router.post('/coach', async (req: Request, res: Response) => {
  try {
    const { message, taskTitle, subtaskTitle, conversationHistory } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'message is required' });
    }

    const response = await azureOpenAIService.chatWithCoach(
      message,
      taskTitle,
      subtaskTitle,
      conversationHistory || []
    );

    res.json({ message: response });
  } catch (error) {
    console.error('Error generating coach response:', error);
    res.status(500).json({ error: 'Failed to generate coach response' });
  }
});

export default router;
