# Timer Reset Bug Fix

## Problem
When completing a subtask and moving to the next one, the visual timer does not update/restart with the new subtask's estimated duration. The encouragement message shows the correct duration but the timer remains at 0.

## Root Cause Analysis

### Current Flow
1. User clicks "I DID IT!" button
2. handleComplete() calls onComplete() which triggers completeCurrentSubtask()
3. completeCurrentSubtask() in useCoachStore sets currentTimeLeft to 0
4. GalaxyFocusView re-renders with new currentSubtask
5. useEffect tries to start timer but logic is flawed

### Issue in GalaxyFocusView.tsx (line 36-40)
```typescript
useEffect(() => {
  if (currentTimeLeft === 0) {
    startTimer(estimatedMinutes);
  }
}, [currentSubtask.id]);
```

Problems:
- Missing dependencies: currentTimeLeft, estimatedMinutes, startTimer
- The condition check happens before the effect runs
- Timer doesn't auto-start for new subtask

## Solution

### Task List
- [x] Update useEffect dependencies to include all used variables
- [x] Add logic to auto-start timer when subtask changes
- [x] Ensure timer resets properly when moving to next subtask
- [ ] Test the complete flow: complete subtask -> see encouragement -> timer starts for next subtask

## Implementation Details

### File: frontend/components/focus/GalaxyFocusView.tsx

**Change 1: Fix timer initialization useEffect**
```typescript
// Old (line 36-40)
useEffect(() => {
  if (currentTimeLeft === 0) {
    startTimer(estimatedMinutes);
  }
}, [currentSubtask.id]);

// New
useEffect(() => {
  // Reset and start timer when subtask changes
  startTimer(estimatedMinutes);
}, [currentSubtask.id, estimatedMinutes, startTimer]);
```

This ensures:
- Timer always restarts when moving to a new subtask
- Proper dependency array (no React warnings)
- Uses the correct estimatedMinutes from the new subtask

## Testing Steps
1. Create a task with AI breakdown
2. Enter Focus Mode
3. Click "I DID IT!" on first subtask
4. Verify encouragement message shows
5. After message closes, verify timer shows new duration and starts counting down
6. Repeat for multiple subtasks

## Files to Modify
- frontend/components/focus/GalaxyFocusView.tsx (1 change)

## Expected Result
After completing a subtask, the timer should automatically restart with the next subtask's estimated duration.

---

## Review

### Changes Made
Modified frontend/components/focus/GalaxyFocusView.tsx line 36-39:
- Removed conditional check (if currentTimeLeft === 0)
- Changed to always call startTimer when subtask changes
- Added proper dependency array: [currentSubtask.id, estimatedMinutes, startTimer]

### Why This Works
The previous code only started the timer if currentTimeLeft was 0, but the check happened at the wrong time. Now the timer unconditionally restarts whenever the subtask.id changes, ensuring the new subtask's duration is always applied.

### Impact
- Timer now properly resets when moving to next subtask
- No longer shows 0:00 after completing a subtask
- Visual timer matches the encouragement message duration
- Single line of logic change, minimal complexity

### Testing Status
- Code change: Complete
- Local compilation: Verified
- User testing: Pending
