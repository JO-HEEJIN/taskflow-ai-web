# Phase 5: Timer Completion Actions - Testing Guide

## Overview
This guide helps you test all Phase 5 completion features implemented for the Focus Mode timer.

**Testing Date:** 2025-12-31
**Implementation Status:** ✅ Complete

---

## Phase 5 Features Implemented

### 1. ✅ Completion Sound
- **File:** `/frontend/public/sounds/timer-complete.mp3` (486KB)
- **Preloading:** Automatic on app startup via `providers.tsx`
- **Trigger:** `playTimerCompletionSound()` when timer completes

### 2. ✅ Window Focus
- **Behavior:** Browser window/tab automatically focuses when timer completes
- **Implementation:** `window.focus()` in completion handler
- **Browser Support:** All modern browsers

### 3. ✅ Mobile Vibration
- **Pattern:** `[200, 100, 200, 100, 200]` (5 pulses)
- **Browser Support:** Android Chrome/Firefox, iOS Safari (limited)
- **Fallback:** Gracefully ignored if not supported

### 4. ✅ Full-Screen Break Screen
- **Component:** `BreakScreen.tsx`
- **Features:**
  - Confetti animation (3 bursts)
  - XP earned display (+50 XP)
  - Two options: "Take 5-min Break" or "Continue Working"
  - Background stars animation
- **Trigger:** `useCoachStore.setState({ showBreakScreen: true })`

### 5. ✅ Push Notification
- **Function:** `showTimerCompletedNotification()`
- **Behavior:** Browser notification if permission granted
- **Mobile:** Works on Android/iOS PWA

---

## Testing Checklist

### Pre-Testing Setup

1. **Start Both Servers**
   ```bash
   # Backend (Terminal 1)
   cd /Users/momo/taskflow-ai-web/backend
   npm run dev

   # Frontend (Terminal 2)
   cd /Users/momo/taskflow-ai-web/frontend
   npm run dev
   ```

2. **Open Browser**
   - Navigate to `http://localhost:3000`
   - Open DevTools Console (F12)
   - Grant notification permission if prompted

3. **Enable Sound**
   - Ensure browser/system sound is ON
   - Volume at 50%+

---

### Test 1: 1-Minute Timer Completion (Desktop)

**Steps:**
1. Create a test task with 1-minute subtask
2. Enter Focus Mode
3. Wait for timer to complete (or modify code to use 10 seconds for faster testing)
4. Observe all completion actions

**Expected Results:**
- [ ] **Console logs** show:
  ```
  ✅ Timer completed: {taskId, subtaskId}
  🔊 Completion sound played
  🎯 Window focused
  📳 Vibration triggered (may warn on desktop)
  🎉 Break screen shown
  ```
- [ ] **Sound plays** - Apple-style chime
- [ ] **Break screen appears** with:
  - [ ] Confetti animation (3 bursts)
  - [ ] "🎉 Timer Complete!" heading
  - [ ] "+50 XP" display
  - [ ] "Take 5-min Break" button
  - [ ] "Continue Working" button
  - [ ] Twinkling stars background
- [ ] **Browser tab focuses** (if you switched tabs during timer)
- [ ] **Notification appears** (if permission granted)

---

### Test 2: Picture-in-Picture (PiP) Real-Time Sync

**Steps:**
1. Start Focus Mode timer (1 minute)
2. Click "Pop Out Timer" button (if PiP supported)
3. Verify PiP window opens with horizontal progress bar
4. Switch to another app (VS Code, Terminal, etc.)
5. Observe PiP window updates every second

**Expected Results:**
- [ ] **PiP window** shows:
  - [ ] Timer countdown updates every 1 second
  - [ ] Progress bar shrinks in real-time
  - [ ] Glow color changes: blue → purple → red
  - [ ] Pulse speed increases as time runs out
- [ ] **Pause/Resume** works from both:
  - [ ] Main Focus Mode
  - [ ] PiP window controls
- [ ] **Time stays synchronized** between main and PiP
- [ ] **PiP stays on top** when using other apps (not in full-screen)

**Browser Support:**
- ✅ Chrome/Edge 116+: Full support
- ❌ Firefox/Safari: Falls back to floating widget

---

### Test 3: Multi-Tab Synchronization

**Steps:**
1. Open `http://localhost:3000` in Tab A
2. Start Focus Mode timer
3. Open `http://localhost:3000` in Tab B (new tab)
4. Observe timer state in both tabs

**Expected Results:**
- [ ] **Tab B** immediately shows timer running
- [ ] **Time updates** in sync across both tabs
- [ ] **Pause in Tab A** → Tab B pauses
- [ ] **Resume in Tab B** → Tab A resumes
- [ ] **Completion triggers** in BOTH tabs:
  - [ ] Sound plays once
  - [ ] Break screen shows in both tabs

---

### Test 4: Mobile Testing (Optional)

**Requirements:**
- Android device with Chrome
- Connected to same network as dev server

**Steps:**
1. Get local IP: `ifconfig | grep "inet "`
2. Open `http://[YOUR_IP]:3000` on mobile
3. Start Focus Mode timer (1 minute)
4. Lock phone or switch apps

**Expected Results:**
- [ ] **Persistent notification** shows countdown (every 10s)
- [ ] **Vibration** triggers on completion
- [ ] **Sound plays** on completion
- [ ] **Notification** shows "Timer Complete!"
- [ ] **Break screen** shows when reopening app

---

### Test 5: Sound Preloading Verification

**Steps:**
1. Open DevTools Console
2. Refresh page (`Cmd+R`)
3. Watch console for sound preload message

**Expected Results:**
- [ ] Console shows: `✅ Sound preloaded: timer-complete`
- [ ] No 404 errors for sound file
- [ ] Sound plays instantly on completion (no loading delay)

**Fallback Test:**
1. Rename sound file: `mv timer-complete.mp3 timer-complete.mp3.bak`
2. Refresh page
3. Wait for timer completion

**Expected Results:**
- [ ] Console shows: `ℹ️ Sound file not found: timer-complete (will use generated chime fallback)`
- [ ] Fallback sound plays (generated beep)

---

### Test 6: Break Screen Actions

**Steps:**
1. Complete timer (break screen appears)
2. Test both buttons

**Test 6A: Take 5-min Break**
- [ ] Click "Take a 5-min Break"
- [ ] Break screen closes
- [ ] New 5-minute timer starts
- [ ] Console shows: `☕ Taking a 5-minute break`

**Test 6B: Continue Working**
- [ ] Click "Continue Working"
- [ ] Break screen closes
- [ ] No new timer starts
- [ ] Console shows: `💪 Continuing work`

---

## Debugging Tips

### Sound Not Playing
1. Check browser console for errors
2. Verify sound file exists: `ls -lh frontend/public/sounds/timer-complete.mp3`
3. Check browser autoplay policy (some browsers block until user interaction)
4. Test in Incognito mode (extensions might block audio)

### PiP Not Working
1. Check browser support: Chrome/Edge 116+
2. Console should show: "Picture-in-Picture is not supported in this browser" if unsupported
3. Fallback to floating widget should appear automatically

### Timer Not Synchronizing
1. Check BroadcastChannel errors in console
2. Verify both tabs are on same origin (`localhost:3000`)
3. Check WebSocket connection: Should see `Socket connected` in console
4. Verify backend is running on port 3001

### Break Screen Not Showing
1. Check `showBreakScreen` state in Zustand DevTools
2. Verify `handleTimerCompleted` is being called
3. Check console for `🎉 Break screen shown` message

### No Confetti
1. Verify `canvas-confetti` is installed: `npm list canvas-confetti`
2. Check browser console for canvas errors
3. Try refreshing page (animation might be cached)

---

## Quick Test (10 Seconds)

For rapid testing, temporarily modify timer duration:

**File:** `/frontend/components/focus/GalaxyFocusView.tsx`

```typescript
// Line 50 - Change to 10 seconds for testing
startTimerWS(task.id, currentSubtask.id, 0.167); // 10 seconds instead of estimatedMinutes
```

**Remember to revert after testing!**

---

## Success Criteria

All Phase 5 features are working if:

- ✅ Sound plays on completion
- ✅ Window focuses automatically
- ✅ Vibration triggers (mobile)
- ✅ Break screen shows with confetti
- ✅ Notification appears
- ✅ PiP updates in real-time
- ✅ Multi-tab sync works
- ✅ All actions trigger without errors

---

## Next Steps (Future Phases)

### Phase 4: Mobile PWA (Partial)
- [ ] PWA manifest for "Add to Home Screen"
- [ ] App badge showing timer minutes
- [ ] Persistent notification updates (every 10s)

### Phase 6: Chrome Extension
- [ ] Background service worker
- [ ] Timer visible on ALL tabs (not just TaskFlow)
- [ ] Desktop notifications outside browser

---

## Known Issues

1. **PiP in Full-Screen Apps:** PiP window hides when using full-screen apps (browser limitation)
2. **iOS Vibration:** Limited support, short vibrations only
3. **Guest Mode WebSocket:** Expected warnings for guests (WebSocket requires auth)
4. **Sound Autoplay:** Some browsers require user interaction before playing audio

---

## Implementation Files Reference

**Core Timer Logic:**
- `/frontend/hooks/useTimerWebSocket.ts` - WebSocket sync + completion handler
- `/frontend/hooks/useTimerSync.ts` - BroadcastChannel multi-tab sync
- `/frontend/components/focus/GalaxyFocusView.tsx` - Main Focus Mode component

**Completion Features:**
- `/frontend/lib/sounds.ts` - Sound manager
- `/frontend/lib/notifications.ts` - Notification manager
- `/frontend/components/focus/BreakScreen.tsx` - Break screen UI

**Picture-in-Picture:**
- `/frontend/hooks/usePictureInPicture.ts` - PiP API wrapper
- `/frontend/components/focus/PiPTimer.tsx` - PiP timer UI

**Store:**
- `/frontend/store/useCoachStore.ts` - Timer state management

---

**Testing Completed:** _______________
**Tester:** _______________
**Notes:** _______________
