# Production Timer Completion Test

**Production URL:** https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io

## Quick 1-Minute Test

### Setup (30 seconds)
1. Open production URL in Chrome 116+ (for PiP support)
2. Create a new task or use existing task
3. Click on the task to open Focus Mode
4. Timer should start automatically

### Test Timer Completion (1 minute)
1. **Wait for timer to complete** (or modify code temporarily to use 10 seconds)
2. **Observe all completion actions:**

   **Expected Results:**
   - [ ] Sound plays (Apple-style chime)
   - [ ] Browser tab/window focuses (if you switched tabs)
   - [ ] Mobile vibrates (if on mobile device)
   - [ ] Break screen appears with:
     - [ ] Confetti animation (3 bursts)
     - [ ] "Timer Complete!" message
     - [ ] "+50 XP" display
     - [ ] "Take a 5-min Break" button
     - [ ] "Continue Working" button
   - [ ] Browser notification (if permission granted)

### Test Picture-in-Picture (Optional - 2 minutes)

1. **Start timer in Focus Mode**
2. **Click "Pop Out Timer" button** (if visible)
3. **Verify PiP window:**
   - [ ] Separate floating window opens
   - [ ] Timer counts down every second
   - [ ] Horizontal progress bar shrinks
   - [ ] Color changes: blue → purple → red
   - [ ] Glow effect pulses faster as time runs out
4. **Switch to another app** (VS Code, Terminal, etc.)
   - [ ] PiP window stays on top
   - [ ] Timer continues updating
5. **Click Pause in PiP window**
   - [ ] Timer pauses
   - [ ] Main Focus Mode also pauses
6. **Click Resume in main Focus Mode**
   - [ ] PiP also resumes
   - [ ] Time stays synchronized

### Test Multi-Tab Sync (Optional - 1 minute)

1. **Open production URL in Tab A**
2. **Start Focus Mode timer**
3. **Open production URL in Tab B (new tab)**
4. **Verify synchronization:**
   - [ ] Tab B immediately shows timer running
   - [ ] Time updates in sync across both tabs
5. **Pause timer in Tab A**
   - [ ] Tab B also pauses
6. **Resume in Tab B**
   - [ ] Tab A also resumes

## Common Issues & Solutions

### Sound Not Playing
- **Check:** Browser autoplay policy
- **Fix:** Interact with page first (click anywhere)
- **Verify:** Open DevTools Console, look for sound preload message

### PiP Not Available
- **Check:** Browser version (Chrome/Edge 116+ required)
- **Fix:** Update browser or use floating widget fallback
- **Note:** Firefox/Safari will show floating widget instead

### Break Screen Not Showing
- **Check:** DevTools Console for errors
- **Verify:** Look for "Break screen shown" message
- **Debug:** Check if `showBreakScreen` state is true

### Timer Not Synchronizing
- **Check:** WebSocket connection in Network tab
- **Verify:** Look for "Socket connected" in console
- **Note:** Guest mode uses BroadcastChannel only (no WebSocket)

## Quick DevTools Verification

Open DevTools Console (F12) and check for these messages:

```
✅ Sound preloaded: timer-complete
✅ Timer completed: {taskId, subtaskId}
🔊 Completion sound played
🎯 Window focused
📳 Vibration triggered
🎉 Break screen shown
```

## Production URLs

- Frontend: https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io
- Backend: https://taskflow-backend.bravesky-cb93d4eb.eastus.azurecontainerapps.io
- Sound File: https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io/sounds/timer-complete.mp3

---

**Test Date:** December 31, 2025
**Deployed Features:** Phase 5 Timer Completion Actions
