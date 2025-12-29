# Focus Mode - Skip Completed Subtasks

## Problem
Focus Mode always starts from index 0 (first subtask) and progresses linearly, even if some subtasks are already completed. This forces users to manually skip completed subtasks.

## User Requirements

### Example Scenario
Task has 5 subtasks:
1. Subtask 1: Completed (checked)
2. Subtask 2: Not completed (unchecked) <- Should start here
3. Subtask 3: Completed (checked) <- Should skip
4. Subtask 4: Not completed (unchecked) <- Show after subtask 2
5. Subtask 5: Not completed (unchecked) <- Show after subtask 4

### Expected Behavior
1. When entering Focus Mode: Start at first uncompleted subtask (index 1 in example)
2. When completing a subtask: Jump to next uncompleted subtask (skip index 2, go to index 3)
3. When all uncompleted subtasks are done: Exit Focus Mode

## Current Implementation Issues

### useCoachStore.ts - enterFocusMode (line 38-47)
```typescript
enterFocusMode: (taskId: string) => {
  set({
    isFocusMode: true,
    activeTaskId: taskId,
    activeSubtaskIndex: 0, // Always starts at 0
    isTimerRunning: false,
    currentTimeLeft: 0,
    messages: [],
  });
},
```

Problem: Always sets activeSubtaskIndex to 0

### useCoachStore.ts - completeCurrentSubtask (line 91-98)
```typescript
completeCurrentSubtask: () => {
  const { activeSubtaskIndex } = get();
  set({
    activeSubtaskIndex: activeSubtaskIndex + 1, // Simply increments by 1
    isTimerRunning: false,
    currentTimeLeft: 0,
  });
},
```

Problem: Always increments by 1, doesn't skip completed subtasks

## Solution

### Task List
- [x] Modify enterFocusMode to accept task subtasks and find first incomplete subtask
- [x] Modify completeCurrentSubtask to find next incomplete subtask
- [x] Update all callers of enterFocusMode to pass task data
- [x] Handle edge case: all subtasks already completed
- [ ] Test with various completion patterns

## Implementation Plan

### Step 1: Update useCoachStore interface

Add helper function to find next incomplete subtask:
```typescript
interface CoachState {
  // ... existing fields

  // Updated actions
  enterFocusMode: (taskId: string, subtasks: Subtask[]) => void;
  completeCurrentSubtask: (subtasks: Subtask[]) => void;
  skipCurrentSubtask: (subtasks: Subtask[]) => void;
}

// Helper function (outside store)
const findNextIncompleteIndex = (subtasks: Subtask[], startFrom: number = 0): number => {
  for (let i = startFrom; i < subtasks.length; i++) {
    if (!subtasks[i].isCompleted) {
      return i;
    }
  }
  return -1; // No incomplete subtasks found
};
```

### Step 2: Update enterFocusMode
```typescript
enterFocusMode: (taskId: string, subtasks: Subtask[]) => {
  const firstIncompleteIndex = findNextIncompleteIndex(subtasks, 0);

  if (firstIncompleteIndex === -1) {
    // All subtasks completed, don't enter focus mode
    console.log('All subtasks already completed');
    return;
  }

  set({
    isFocusMode: true,
    activeTaskId: taskId,
    activeSubtaskIndex: firstIncompleteIndex,
    isTimerRunning: false,
    currentTimeLeft: 0,
    messages: [],
  });
},
```

### Step 3: Update completeCurrentSubtask
```typescript
completeCurrentSubtask: (subtasks: Subtask[]) => {
  const { activeSubtaskIndex } = get();

  // Find next incomplete subtask after current one
  const nextIncompleteIndex = findNextIncompleteIndex(subtasks, activeSubtaskIndex + 1);

  if (nextIncompleteIndex === -1) {
    // No more incomplete subtasks, exit focus mode
    get().exitFocusMode();
    return;
  }

  set({
    activeSubtaskIndex: nextIncompleteIndex,
    isTimerRunning: false,
    currentTimeLeft: 0,
  });
},
```

### Step 4: Update skipCurrentSubtask
```typescript
skipCurrentSubtask: (subtasks: Subtask[]) => {
  const { activeSubtaskIndex } = get();

  // Find next incomplete subtask (same logic as complete)
  const nextIncompleteIndex = findNextIncompleteIndex(subtasks, activeSubtaskIndex + 1);

  if (nextIncompleteIndex === -1) {
    // No more incomplete subtasks, exit focus mode
    get().exitFocusMode();
    return;
  }

  set({
    activeSubtaskIndex: nextIncompleteIndex,
    isTimerRunning: false,
    currentTimeLeft: 0,
  });
},
```

### Step 5: Update all callers

#### TaskDetail.tsx
```typescript
const handleEnterFocusMode = () => {
  const { enterFocusMode } = useCoachStore.getState();
  enterFocusMode(task.id, task.subtasks); // Pass subtasks
  onClose();
};
```

#### AIBreakdownModal.tsx
```typescript
const handleAccept = async () => {
  setIsAccepting(true);
  try {
    await addSubtasks(taskId, suggestions);

    const { enterFocusMode } = useCoachStore.getState();
    // Need to get task with new subtasks
    const updatedTask = useTaskStore.getState().tasks.find(t => t.id === taskId);
    if (updatedTask) {
      enterFocusMode(taskId, updatedTask.subtasks);
    }

    onClose();
  } catch (error) {
    alert('Failed to add subtasks');
  } finally {
    setIsAccepting(false);
  }
};
```

#### page.tsx (handleCompleteSubtask)
```typescript
const handleCompleteSubtask = async () => {
  if (!activeTask || !currentSubtask) return;

  // Mark subtask as completed
  await toggleSubtask(activeTask.id, currentSubtask.id);

  // Get updated task with new completion status
  const updatedTask = tasks.find(t => t.id === activeTask.id);
  if (!updatedTask) return;

  // Move to next incomplete subtask (or exit if all done)
  completeCurrentSubtask(updatedTask.subtasks);
};
```

#### page.tsx (handleSkipSubtask)
```typescript
const handleSkipSubtask = () => {
  if (!activeTask) return;

  skipCurrentSubtask(activeTask.subtasks);
};
```

## Files to Modify
1. frontend/store/useCoachStore.ts - Update store logic
2. frontend/components/TaskDetail.tsx - Pass subtasks to enterFocusMode
3. frontend/components/AIBreakdownModal.tsx - Pass subtasks to enterFocusMode
4. frontend/app/page.tsx - Pass subtasks to complete/skip functions

## Edge Cases to Handle
1. All subtasks already completed: Don't enter Focus Mode, show message
2. Last incomplete subtask completed: Auto-exit Focus Mode
3. User skips last incomplete subtask: Auto-exit Focus Mode
4. Subtask completion status changes while in Focus Mode: Use fresh data

## Testing Scenarios
1. Task with all uncompleted: Should start at index 0
2. Task with first completed, rest uncompleted: Should start at index 1
3. Task with mixed completion: Should skip completed ones
4. Complete subtask in middle: Should jump to next uncompleted
5. Complete last uncompleted: Should exit Focus Mode
6. All completed before entering: Should not enter Focus Mode

## Expected Result
Focus Mode intelligently skips completed subtasks and only shows incomplete work, making the flow more efficient and less frustrating for users who partially complete tasks.

---

## Review

### Changes Made

**1. frontend/store/useCoachStore.ts**
- Added import for Subtask type
- Added helper function findNextIncompleteIndex to locate next uncompleted subtask
- Updated enterFocusMode signature to accept subtasks parameter
- Updated completeCurrentSubtask signature to accept subtasks parameter
- Updated skipCurrentSubtask signature to accept subtasks parameter
- All three functions now use findNextIncompleteIndex to skip completed subtasks
- Auto-exit Focus Mode when no incomplete subtasks remain

**2. frontend/components/TaskDetail.tsx**
- Updated handleEnterFocusMode to pass task.subtasks to enterFocusMode

**3. frontend/components/AIBreakdownModal.tsx**
- Added tasks from useTaskStore
- Updated handleAccept to get updated task after adding subtasks
- Pass updatedTask.subtasks to enterFocusMode

**4. frontend/app/page.tsx**
- Updated handleCompleteSubtask to get fresh task data after toggleSubtask
- Pass updated subtasks to completeCurrentSubtask
- Updated handleSkipSubtask to pass activeTask.subtasks to skipCurrentSubtask

### How It Works

**Enter Focus Mode:**
1. User clicks Focus Mode button
2. findNextIncompleteIndex scans from index 0
3. Returns first uncompleted subtask index
4. Focus Mode starts at that index
5. If all completed, Focus Mode doesn't open

**Complete Subtask:**
1. User completes current subtask
2. toggleSubtask marks it complete
3. Get fresh task data with updated completion status
4. findNextIncompleteIndex scans from current+1
5. Jump to next incomplete subtask
6. If none found, auto-exit Focus Mode

**Skip Subtask:**
1. User skips current subtask
2. findNextIncompleteIndex scans from current+1
3. Jump to next incomplete subtask
4. If none found, auto-exit Focus Mode

### Edge Cases Handled
- All subtasks completed before entering: Focus Mode won't open
- Last incomplete subtask completed: Auto-exit
- Mixed completion pattern: Correctly jumps over completed ones
- Consecutive completed subtasks: Skips all, finds next incomplete

### Impact
- More intelligent Focus Mode flow
- No manual skipping of completed subtasks
- Auto-exit when work is done
- Better UX for partially completed tasks
- 4 files modified, minimal code complexity

### Testing Status
- Code changes: Complete
- Type checking: Pass
- Local compilation: Verified
- User testing: Pending
