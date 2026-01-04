# Focus Mode Timer - Cross-Window/Device Visibility Implementation Plan

## Mission
Make the Focus Mode timer visible across windows, tabs, and devices with forced visibility and comprehensive completion alerts.

## User Requirements (ALL must be implemented)

### Desktop Features
1. Picture-in-Picture (PiP) floating window (primary)
2. Multi-tab sync with floating timer widget (fallback)
3. Optional Chrome extension (power users)

### Mobile Features
1. Persistent notification with live countdown
2. PWA app badge showing time remaining

### Cross-Device
Real-time WebSocket sync of timer state across all devices

### Timer Completion Actions
1. Play completion sound (beep/chime)
2. Force browser tab/window to focus
3. Vibrate on mobile
4. Show full-screen break screen

---

## Current State Analysis

### Timer Implementation
- **Location:** `/frontend/components/focus/OrbitTimer.tsx`
- **Method:** Client-side setInterval countdown
- **State:** Zustand store (`/frontend/store/useCoachStore.ts`)
- **Limitations:** No persistence, no cross-tab sync, no sound/notifications

### Existing Infrastructure
- **Service Worker:** `/frontend/public/sw.js` (push notifications only)
- **Push Service:** `/backend/src/services/webPushService.ts` (VAPID configured)
- **Vibration:** Pattern defined [200, 100, 200]
- **Backend:** Express REST API (no WebSocket)
- **Database:** Cosmos DB
- **Missing:** PWA manifest, WebSocket, timer persistence

---

## Key Technical Decisions

### 1. WebSocket Library: Socket.io
- Automatic reconnection
- Room-based architecture (per-user sync)
- TypeScript support
- Fallback to long-polling

### 2. Timer Authority: Server-Managed
- Server calculates endTime = now + duration
- Clients display: endTime - now
- Survives client sleep/reconnection
- Single source of truth

### 3. PiP: Document Picture-in-Picture API
- Chrome/Edge 116+: Full HTML rendering
- Older browsers: Video PiP fallback
- Firefox/Safari: Floating widget only

### 4. Notifications: Every 10 seconds + Milestones
- Battery efficient
- Milestones: 50%, 25%, 10%, 5min, 1min

### 5. State Persistence: Cosmos DB
- Container: `timers`
- Schema: userId, taskId, startTime, endTime, isPaused

---

## Phase-Based Implementation

### PHASE 1: Multi-Tab Sync + Floating Widget (2-3 days)
**Quick win - Works immediately without backend changes**

#### Files to Create
1. `/frontend/hooks/useTimerSync.ts` - BroadcastChannel + localStorage sync
2. `/frontend/components/focus/FloatingTimerWidget.tsx` - Draggable overlay

#### Files to Modify
1. `/frontend/store/useCoachStore.ts`
   - Add `endTime` field
   - Broadcast timer events via BroadcastChannel
   - Add localStorage persistence

2. `/frontend/app/layout.tsx`
   - Import and render FloatingTimerWidget

#### Implementation
```typescript
// BroadcastChannel for cross-tab sync
const channel = new BroadcastChannel('taskflow-timer');
channel.postMessage({ type: 'TIMER_START', endTime, timeLeft });

// localStorage for persistence
localStorage.setItem('timer-state', JSON.stringify({ endTime, isPaused }));
```

#### Testing
- Start timer Tab A, verify updates Tab B
- Pause Tab B, verify pauses Tab A
- Close Tab A, timer continues Tab B
- Drag widget, position persists

---

### PHASE 2: Picture-in-Picture Window (3-4 days)
**High-impact desktop feature**

#### Files to Create
1. `/frontend/hooks/usePictureInPicture.ts` - PiP API wrapper
2. `/frontend/components/focus/PiPTimer.tsx` - Minimal timer UI

#### Files to Modify
1. `/frontend/components/focus/GalaxyFocusView.tsx`
   - Add "Pop Out to Window" button (line ~176)
   - Integrate usePictureInPicture hook

2. `/frontend/store/useCoachStore.ts`
   - Add `isPiPActive: boolean`

#### Browser Support
```typescript
// @ts-ignore
const supported = 'documentPictureInPicture' in window;
```

#### PiP Lifecycle
1. Request: `documentPictureInPicture.requestWindow({ width: 300, height: 200 })`
2. Copy styles from main document
3. Render React into PiP using createRoot()
4. Sync via Zustand

#### Testing
- Chrome 116+: Document PiP opens
- Chrome <116: Fallback to widget
- Firefox: Widget only
- PiP survives tab switch

---

### PHASE 3: WebSocket + Server-Side Timer (5-6 days)
**Foundation for real-time cross-device sync**

#### Backend Files to Create
1. `/backend/src/services/websocketService.ts` - Socket.io server
2. `/backend/src/services/timerService.ts` - Server timer logic
3. `/backend/src/models/TimerState.ts` - TypeScript interfaces

#### Backend Files to Modify
1. `/backend/src/server.ts` (lines 69-86)
   - Replace `app.listen()` with `createServer(app)`
   - Initialize websocketService

2. `/backend/package.json`
   - Add: `socket.io@^4.7.0`

#### Frontend Files to Create
1. `/frontend/lib/socket.ts` - Socket.io client wrapper
2. `/frontend/hooks/useTimerWebSocket.ts` - React hook

#### Frontend Files to Modify
1. `/frontend/store/useCoachStore.ts`
   - Replace local tickTimer with WebSocket updates
   - Add setTimerState action

2. `/frontend/components/focus/GalaxyFocusView.tsx` (line 40, 47)
   - Replace startTimer() with socketClient.startTimer()

3. `/frontend/package.json`
   - Add: `socket.io-client@^4.7.0`

#### Database Schema
**Cosmos DB Container:** `timers`
**Partition Key:** `/id` (userId)

```typescript
interface TimerState {
  id: string;              // userId
  taskId: string;
  subtaskId: string;
  startTime: number;       // Unix ms
  endTime: number;         // Unix ms
  durationMs: number;
  isPaused: boolean;
  pausedAt?: number;
  totalPausedTime: number;
}
```

#### WebSocket Events
**Client → Server:**
- `timer:start` → `{ taskId, subtaskId, durationMinutes }`
- `timer:pause`, `timer:resume`, `timer:stop`

**Server → Client:**
- `timer:state` → `{ startTime, endTime, isPaused, currentTimeLeft }`
- `timer:completed` → `{ taskId, subtaskId }`

#### Server Logic
```typescript
async startTimer(userId, taskId, subtaskId, durationMinutes) {
  const now = Date.now();
  const endTime = now + (durationMinutes * 60 * 1000);

  const state = { id: userId, taskId, subtaskId, startTime: now, endTime, ... };
  await cosmos.upsert(state);

  return { ...state, currentTimeLeft: Math.floor((endTime - now) / 1000) };
}
```

#### Testing
- Start Desktop, verify syncs Mobile <1s
- Pause Mobile, verify Desktop pauses
- Disconnect, timer continues server-side
- Reconnect, state restores

---

### PHASE 4: Mobile Notifications + PWA (4-5 days)
**Critical mobile UX**

#### Files to Create
1. `/frontend/app/manifest.json` - PWA manifest
2. `/frontend/public/icons/icon-192.png` (192x192)
3. `/frontend/public/icons/icon-512.png` (512x512)

#### Files to Modify
1. `/frontend/app/layout.tsx`
   - Add `<link rel="manifest" href="/manifest.json" />`

2. `/frontend/public/sw.js` (after line 44)
   - Add timer notification logic
   - Message listener for TIMER_START/STOP

3. `/frontend/lib/notifications.ts`
   - Add `startTimerNotification(endTime)`
   - Add `stopTimerNotification()`

4. `/frontend/hooks/useTimerWebSocket.ts`
   - Call notification functions
   - Update app badge every 10s

#### PWA Manifest
```json
{
  "name": "TaskFlow AI",
  "short_name": "TaskFlow",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a0a28",
  "theme_color": "#c084fc",
  "icons": [...]
}
```

#### Service Worker Enhancement
```javascript
// Update notification every 10 seconds
function updateNotification() {
  const remaining = Math.max(0, timerEndTime - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  self.registration.showNotification('Focus Mode Active', {
    body: `Time remaining: ${minutes}:${String(seconds).padStart(2, '0')}`,
    tag: 'focus-timer',
    silent: true,
  });
}
```

#### App Badge
```typescript
// Update badge every 10 seconds
const minutes = Math.ceil(currentTimeLeft / 60);
await navigator.setAppBadge(minutes);
```

#### Testing
- Android: Persistent notification
- iOS: Notification appears
- Notification updates every 10s
- Completion vibrates
- Badge shows minutes

---

### PHASE 5: Completion Actions (2-3 days)
**Sound, focus, vibrate, break screen**

#### Files to Create
1. `/frontend/public/sounds/timer-complete.mp3` - Chime audio
2. `/frontend/lib/sounds.ts` - Audio utilities
3. `/frontend/components/focus/BreakScreen.tsx` - Full-screen UI

#### Files to Modify
1. `/frontend/hooks/useTimerWebSocket.ts`
   - Add completion handler
   - Implement all actions

2. `/frontend/components/focus/GalaxyFocusView.tsx`
   - Add `showBreakScreen` state
   - Render BreakScreen

#### Sound Implementation
```typescript
class SoundManager {
  async playTimerComplete() {
    const audio = new Audio('/sounds/timer-complete.mp3');
    audio.volume = 0.7;
    await audio.play();
  }
}
```

#### Completion Handler
```typescript
socketClient.onTimerCompleted(async () => {
  window.focus();                                    // Focus window
  await soundManager.playTimerComplete();            // Play sound
  navigator.vibrate([200, 100, 200, 100, 200]);     // Vibrate
  useCoachStore.setState({ showBreakScreen: true }); // Show screen
});
```

#### Break Screen
- Full-screen overlay (z-index: 10000)
- Confetti animation
- Options: Take 5min break / Continue
- XP reward display

---

### PHASE 6: Chrome Extension (6-8 days)
**Optional power-user feature**

#### Extension Structure
```
/extension/
├── manifest.json (Manifest V3)
├── background.js (Service Worker)
├── popup/ (Control UI)
├── content/ (Inject timer into any tab)
└── icons/
```

#### Key Features
- Background service worker maintains WebSocket
- Content script injects floating timer on ALL tabs
- Chrome badge shows minutes remaining
- Desktop notifications on completion
- Syncs with web app via Socket.io

#### Distribution
- Chrome Web Store
- Optional download from settings

---

## Critical Files Summary

### Top 5 Most Important Files

1. **`/backend/src/services/timerService.ts`** (NEW)
   - Server-side timer state management
   - endTime calculation, pause/resume logic
   - Single source of truth

2. **`/backend/src/services/websocketService.ts`** (NEW)
   - Socket.io server initialization
   - User room management
   - Event broadcasting

3. **`/frontend/lib/socket.ts`** (NEW)
   - Socket.io client wrapper
   - Authentication, reconnection
   - Event emitters/listeners

4. **`/frontend/hooks/useTimerWebSocket.ts`** (NEW)
   - React integration layer
   - Zustand store sync
   - Completion actions

5. **`/frontend/components/focus/FloatingTimerWidget.tsx`** (NEW)
   - Cross-tab UI component
   - Draggable overlay
   - BroadcastChannel fallback

---

## Rollback Strategies

### Global Kill Switch
```bash
TIMER_FEATURES_ENABLED=false
```

### Phase-Specific Rollbacks
| Phase | Rollback | Data Impact |
|-------|----------|-------------|
| 1 | Remove FloatingTimerWidget | None |
| 2 | Hide PiP button | None |
| 3 | Set ENABLE_WEBSOCKET_SYNC=false | Client-side only |
| 4 | Disable SW notifications | None |
| 5 | Remove completion handlers | UX degradation |
| 6 | Extension disabled | None |

---

## Security Considerations

### WebSocket
- Require userId in handshake auth
- Rate limit: 10 events/second per user
- HTTPS in production

### Service Worker
- Validate message origin
- Scope limited to `/`

### Extension
- Minimal permissions
- Sanitize user input

---

## Performance Optimizations

### Backend
- In-memory timer cache (90% fewer DB queries)
- Max 3 connections per user
- Auto-disconnect idle after 5min

### Frontend
- Debounce timer re-renders
- Lazy load PiP components
- Code-split Socket.io

---

## Implementation Order

**Recommended Sequence:**
1. **Phase 3** (WebSocket foundation) - Start first, longest
2. **Phase 1** (Multi-tab) - Quick win in parallel
3. **Phase 2** (PiP) - After Phase 1
4. **Phase 4** (Mobile) - After Phase 3
5. **Phase 5** (Completion) - After Phase 3
6. **Phase 6** (Extension) - Last, optional

**Parallel Development:**
- Phase 1 + Phase 2 (Frontend team)
- Phase 3 (Backend team)
- Phase 4 after Phase 3 done

---

## Success Criteria

- [ ] Timer visible in 2+ browser tabs simultaneously
- [ ] PiP window stays on top while working in other apps
- [ ] Mobile notification shows live countdown
- [ ] PWA badge displays minutes remaining
- [ ] Desktop timer syncs to mobile in <1 second
- [ ] Completion sound plays
- [ ] Window auto-focuses on completion
- [ ] Mobile vibrates on completion
- [ ] Break screen shows with confetti
- [ ] Chrome extension injects timer into any tab

---

**Estimated Total Time:** 20-28 days
**Team Size:** 2-3 developers
**Risk Level:** Medium (complex WebSocket + multi-platform)
**User Impact:** CRITICAL (core focus mode improvement)
