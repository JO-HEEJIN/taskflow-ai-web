# Fix Encouragement Message Timer Mismatch

## Problem
The AI encouragement message mentions one duration (e.g., "25 minutes") but the actual timer shows a different duration (e.g., "5 minutes"). The message and visual timer are out of sync.

## Root Cause
The API call to generate encouragement only sends subtask titles (strings), not the full subtask objects with estimatedMinutes. The AI doesn't know the actual duration and makes up a time or uses generic language.

### Current Flow
1. Frontend sends: `{ completedSubtask: "title", nextSubtask: "title", progress: {...} }`
2. Backend receives only titles (no estimatedMinutes)
3. AI generates message without knowing actual duration
4. Timer uses actual subtask.estimatedMinutes from data
5. Mismatch occurs

## Solution

Send full subtask objects (or at least estimatedMinutes) to the backend so AI can mention the correct duration.

### Task List
- [x] Update frontend API to send subtask objects with estimatedMinutes
- [x] Update backend to accept subtask objects
- [x] Update AI prompt to include actual estimated minutes
- [ ] Test that message and timer match

## Implementation

### Step 1: Update Frontend API (frontend/lib/api.ts)

**Current (line 212):**
```typescript
async generateEncouragement(completedSubtask: string, nextSubtask: string | null, progress: { completed: number; total: number })
```

**New:**
```typescript
async generateEncouragement(
  completedSubtask: { title: string; estimatedMinutes?: number },
  nextSubtask: { title: string; estimatedMinutes?: number } | null,
  progress: { completed: number; total: number }
)
```

**Change body (line 216):**
```typescript
body: JSON.stringify({ completedSubtask, nextSubtask, progress })
```

### Step 2: Update Frontend Caller (GalaxyFocusView.tsx)

**Current (line 74-78):**
```typescript
const result = await api.generateEncouragement(
  currentSubtask.title,
  nextSubtask?.title || null,
  { completed: completedSubtasks, total: totalSubtasks }
);
```

**New:**
```typescript
const result = await api.generateEncouragement(
  { title: currentSubtask.title, estimatedMinutes: currentSubtask.estimatedMinutes },
  nextSubtask ? { title: nextSubtask.title, estimatedMinutes: nextSubtask.estimatedMinutes } : null,
  { completed: completedSubtasks, total: totalSubtasks }
);
```

### Step 3: Update Backend Route (backend/src/routes/ai.ts)

**Current (line 97-100):**
```typescript
const message = await azureOpenAIService.generateEncouragement(
  completedSubtask,
  nextSubtask || null,
  progress
);
```

No change needed here, just pass through the objects.

### Step 4: Update Backend Service (backend/src/services/azureOpenAIService.ts)

**Current (line 132-136):**
```typescript
async generateEncouragement(
  completedSubtask: string,
  nextSubtask: string | null,
  progress: { completed: number; total: number }
): Promise<string>
```

**New:**
```typescript
async generateEncouragement(
  completedSubtask: { title: string; estimatedMinutes?: number },
  nextSubtask: { title: string; estimatedMinutes?: number } | null,
  progress: { completed: number; total: number }
): Promise<string>
```

**Update prompt (line 142-154):**
```typescript
const prompt = nextSubtask
  ? `The user just completed: "${completedSubtask.title}" (estimated ${completedSubtask.estimatedMinutes || 5} min)

Next up: "${nextSubtask.title}" (estimated ${nextSubtask.estimatedMinutes || 5} min)

Progress: ${progress.completed}/${progress.total} subtasks done.

Provide a SHORT (1-2 sentences) encouraging message that:
1. Celebrates the completion with genuine excitement
2. Mentions the EXACT estimated time for the next task (${nextSubtask.estimatedMinutes || 5} minutes)
3. Creates urgency to start immediately
4. Uses ADHD-friendly language (concrete, action-oriented, no fluff)

IMPORTANT: You MUST mention "${nextSubtask.estimatedMinutes || 5} minutes" for the next task.

Return ONLY the message text, no JSON, no formatting.`
  : // ... final subtask completion message
```

## Files to Modify
1. frontend/lib/api.ts - Update function signature and call
2. frontend/components/focus/GalaxyFocusView.tsx - Send full objects
3. backend/src/services/azureOpenAIService.ts - Update signature and prompt

## Expected Result
AI encouragement message will say "Now focus for 25 minutes!" and the timer will show 25:00, matching perfectly.
