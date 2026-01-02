# TaskFlow AI - Additional Learning Log

**Date**: January 2, 2026
**Context**: iOS Audio, PiP Timer, Background Tab Timer, Mobile Performance

---

## Learning 11: iOS Audio Unlock - The Journey to Silent Unlocking

**Date**: January 1-2, 2026
**Challenge**: Getting timer completion sound to play on iOS while keeping unlock silent

### The Problem

iOS has strict autoplay policies that prevent audio from playing unless it's triggered during a user gesture. We needed to:
1. Unlock audio when user clicks "Start Timer"
2. Keep the unlock completely silent (no sound)
3. Play sound when timer actually completes

### Trial and Error Timeline

**Attempt 1: Volume 0 Only** ❌
```typescript
const timerSound = new Audio('/sounds/timer-complete.mp3');
timerSound.volume = 0;
timerSound.play().then(() => {
  timerSound.pause();
  timerSound.currentTime = 0;
  timerSound.volume = 0.7;
});
```
- **Result**: Sound played audibly during unlock on iOS
- **Problem**: iOS might ignore volume: 0 in some cases
- **User Feedback**: "focus mode 진입했을 때 바로 내가 만든 알림 소리가 들려"

**Attempt 2: Adding muted: true** ✅ (Partial)
```typescript
const timerSound = new Audio('/sounds/timer-complete.mp3');
timerSound.volume = 0;
timerSound.muted = true;  // Extra safety!
timerSound.play().then(() => {
  timerSound.pause();
  timerSound.currentTime = 0;
  timerSound.muted = false;
  timerSound.volume = 0.7;
});
```
- **Result**: Unlock became silent
- **Problem**: Timer completion sound still didn't play
- **Lesson**: Need BOTH volume: 0 AND muted: true for guaranteed silence

**Attempt 3: Fresh Audio Object on Play** ❌
```typescript
export async function playTimerCompletionSound() {
  const timerSound = new Audio('/sounds/timer-complete.mp3');
  timerSound.volume = 0.7;
  await timerSound.play();
}
```
- **Result**: Sound didn't play on iOS
- **Problem**: New Audio object hasn't been unlocked
- **Lesson**: Each Audio instance needs individual unlock on iOS

**Attempt 4: Global Audio Instance** ✅ (Better)
```typescript
// sounds.ts
let timerCompletionAudio: HTMLAudioElement | null = null;

export function unlockTimerCompletionAudio() {
  if (!timerCompletionAudio) {
    timerCompletionAudio = new Audio('/sounds/timer-complete.mp3');
  }
  timerCompletionAudio.volume = 0;
  timerCompletionAudio.muted = true;
  timerCompletionAudio.play().then(() => {
    timerCompletionAudio!.pause();
    timerCompletionAudio!.currentTime = 0;
    timerCompletionAudio!.muted = false;
    timerCompletionAudio!.volume = 0.7;
  });
}

export async function playTimerCompletionSound() {
  if (!timerCompletionAudio) {
    timerCompletionAudio = new Audio('/sounds/timer-complete.mp3');
  }
  timerCompletionAudio.currentTime = 0;
  await timerCompletionAudio.play();
}
```
- **Result**: Still not working reliably
- **Problem**: Forgot to explicitly unmute before playback

**Attempt 5: Explicit Unmute Before Play** ✅ (Final Solution)
```typescript
export async function playTimerCompletionSound() {
  if (!timerCompletionAudio) {
    console.warn('⚠️ Timer completion audio not unlocked!');
    timerCompletionAudio = new Audio('/sounds/timer-complete.mp3');
  }

  // Ensure volume is set correctly (might have been muted during unlock)
  timerCompletionAudio.muted = false;  // ← Explicitly unmute!
  timerCompletionAudio.volume = 0.7;
  timerCompletionAudio.currentTime = 0;

  await timerCompletionAudio.play();
}
```
- **Result**: Works reliably on iOS
- **Lesson**: Must explicitly set muted = false before each playback

### Core Lessons

1. **iOS Audio Unlock Pattern:**
   ```typescript
   // During user gesture:
   audio.volume = 0;
   audio.muted = true;  // Both needed!
   await audio.play();
   audio.pause();
   audio.currentTime = 0;

   // Before playback:
   audio.muted = false;  // Explicit unmute!
   audio.volume = 0.7;
   await audio.play();
   ```

2. **Global Audio Instance Pattern:**
   - Create ONE Audio object
   - Unlock it during user gesture
   - Reuse the SAME instance for playback
   - Don't create new Audio objects for playback on iOS

3. **Background Tab Playback:**
   - Fresh Audio objects work better in background tabs
   - But on iOS, reuse unlocked instance
   - Trade-off between iOS unlock and background playback

4. **Testing Requirements:**
   - Test on ACTUAL iPhone, not simulator
   - Test timer completion sound
   - Test silent unlock (no sound during focus mode entry)
   - Test background tab playback

### Files Modified

- `/frontend/lib/sounds.ts` - Global audio instance + unlock function
- `/frontend/components/mobile/TomorrowTab.tsx` - Call unlock on button click
- `/frontend/components/TaskDetail.tsx` - Call unlock on button click
- `/frontend/components/TaskList.tsx` - Call unlock on sample task creation

### Related Commits

- `0ce9a58` - Initial iOS audio unlock attempt
- `d85ead7` - Add muted: true for silent unlock
- `aabb0c2` - Global audio instance pattern
- `272931d` - Explicit unmute before playback

---

## Learning 12: PiP Timer Sync - From Independent Countdown to Props

**Date**: January 1-2, 2026
**Challenge**: PiP timer and main screen timer showing different times

### The Problem

User reported:
> "pip 창과 메인 화면의 시간이 안 맞아"
> "껐다가 다시 버튼 눌러서 키면 시간이 안 맞아"

PiP showed different time than main Focus Mode, and reopening PiP showed initial time instead of current time.

### Root Cause

**PiPTimer had independent countdown:**
```typescript
// PiPTimer.tsx - BEFORE
const [timeLeft, setTimeLeft] = useState(initialTimeLeft);

useEffect(() => {
  setTimeLeft(initialTimeLeft);  // Only syncs on prop change
}, [initialTimeLeft]);

useEffect(() => {
  if (isRunning && timeLeft > 0) {
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);  // Independent countdown!
    }, 1000);
    return () => clearInterval(interval);
  }
}, [isRunning, timeLeft]);
```

**Problems:**
1. Runs its own independent countdown
2. Drifts from main timer over time
3. Doesn't sync with pause/resume
4. Shows stale time when reopened

### Solution: Props-Only Display

**PiPTimer.tsx - AFTER:**
```typescript
// Use props directly - no local state needed
const timeLeft = currentTimeLeft;
const isRunning = isTimerRunning;

// Only trigger onComplete when timer reaches 0
useEffect(() => {
  if (isPlaying && timeLeft === 0) {
    onComplete();
  }
}, [isPlaying, timeLeft, onComplete]);
```

**GalaxyFocusView - Update PiP every second:**
```typescript
useEffect(() => {
  if (!isPiPOpen) return;

  updatePiP(
    <PiPTimer
      currentTimeLeft={currentTimeLeft}  // Updated every second
      isTimerRunning={isTimerRunning}
      {...otherProps}
    />
  );
}, [currentTimeLeft, isTimerRunning, isPiPOpen, updatePiP]);
```

### Results

- ✅ PiP and main screen perfectly synced
- ✅ Pause/resume works correctly
- ✅ Reopening PiP shows current time
- ✅ No drift or timing issues

### Core Lessons

1. **Don't Run Independent Countdowns:**
   - Multiple timers = multiple sources of truth = drift
   - Use single source of truth (store)
   - Display components should just render, not manage state

2. **Props Pattern for External Windows:**
   - External windows (PiP) need explicit re-rendering
   - Pass updated props every time state changes
   - Don't rely on normal React re-render behavior

3. **Update Pattern:**
   ```typescript
   // Update external window whenever state changes
   useEffect(() => {
     if (externalWindowOpen) {
       updateExternalWindow(<Component {...latestState} />);
     }
   }, [state1, state2, externalWindowOpen]);
   ```

### Files Modified

- `/frontend/components/focus/PiPTimer.tsx` - Removed independent countdown
- `/frontend/components/focus/GalaxyFocusView.tsx` - Added update useEffect

### Related Commits

- `5ebd8cd` - Fix PiP auto-open, reduce empty space, ensure timer sync on reopen
- `cef4a09` - Fix PiP timer sync by removing independent countdown

---

## Learning 13: Background Tab Timer Freeze - setInterval Throttling

**Date**: January 2, 2026
**Challenge**: Timer froze when user switched to different browser tab

### The Problem

User reported:
> "데스크탑에서 다른 탭으로 이동하면 타이머가 멈춰. 16초 남았는데 다시 돌아가면 아직도 16초가 남아있어"

Timer countdown stopped completely when tab was in background.

### Root Cause

**setInterval gets throttled in background tabs:**

```typescript
// OrbitTimer.tsx - BEFORE
useEffect(() => {
  if (isPlaying && timeLeft > 0) {
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }
}, [isPlaying, timeLeft]);
```

**Why it fails:**
- Browsers throttle setInterval in inactive tabs to save resources
- Can be slowed to 1000ms minimum, or even paused completely
- Timer appears frozen when user returns to tab

### Solution: Timestamp-Based Countdown

**Store endTime instead of counting down:**
```typescript
// useCoachStore.ts
const startTimer = (durationMinutes) => {
  const seconds = Math.floor(durationMinutes * 60);
  const endTime = Date.now() + (seconds * 1000);  // Store end time!
  set({
    isTimerRunning: true,
    currentTimeLeft: seconds,
    endTime,  // Store when timer should end
  });
};
```

**Calculate remaining time from endTime:**
```typescript
// GalaxyFocusView.tsx
useEffect(() => {
  if (!isTimerRunning || !endTime) return;

  const interval = setInterval(() => {
    const now = Date.now();
    const remainingMs = Math.max(0, endTime - now);
    const remainingSec = Math.floor(remainingMs / 1000);

    // Update store with calculated time
    useCoachStore.setState({ currentTimeLeft: remainingSec });
  }, 100);  // Update every 100ms for smooth countdown

  return () => clearInterval(interval);
}, [isTimerRunning, endTime]);
```

**OrbitTimer displays store value:**
```typescript
// OrbitTimer.tsx - AFTER
const { currentTimeLeft } = useCoachStore();
const timeLeft = currentTimeLeft || duration * 60;

// No independent countdown!
```

### Results

- ✅ Timer continues running in background tabs
- ✅ Accurate time when returning to tab
- ✅ Works across all devices and browsers
- ✅ Based on wall clock time, not counters

### Core Lessons

1. **Don't Trust setInterval in Background:**
   - Browsers throttle/pause inactive tabs
   - Use timestamps, not counters
   - Calculate time based on wall clock

2. **Timestamp-Based Timer Pattern:**
   ```typescript
   // Store end time, not duration
   const endTime = Date.now() + durationMs;

   // Calculate remaining time
   const remaining = Math.max(0, endTime - Date.now());

   // Update frequently (100ms) for smooth display
   setInterval(() => {
     const now = Date.now();
     updateTime(Math.max(0, endTime - now));
   }, 100);
   ```

3. **Single Source of Truth:**
   - Store the endTime in global store
   - All components calculate from same endTime
   - Perfect sync across all views

4. **Fast Update Interval:**
   - Update every 100ms instead of 1000ms
   - Smoother countdown animation
   - Still works in background (calculates from endTime)

### Files Modified

- `/frontend/store/useCoachStore.ts` - Already had endTime field
- `/frontend/components/focus/GalaxyFocusView.tsx` - Added timestamp calculation
- `/frontend/components/focus/OrbitTimer.tsx` - Removed independent countdown

### Related Commits

- `4a8e9e9` - Fix background tab timer freeze with timestamp-based countdown

---

## Learning 14: Mobile Performance - Blocking vs Non-Blocking Audio Unlock

**Date**: January 2, 2026
**Challenge**: CLICK ME button had long delay before showing onboarding view

### The Problem

User reported:
> "모바일에서 CLICK ME 탭했을 때 온보딩 뷰가 뜨는 데 까지 시간이 너무 오래 걸려서 유저가 그냥 안 되는 앱인 줄 알고 이탈해버리더라"

Long delay between clicking CLICK ME and seeing the onboarding screen - users thought the app was broken and left.

### Root Cause

**Blocking await on audio unlock:**
```typescript
// AudioPermissionScreen.tsx - BEFORE
const handleInteraction = async () => {
  try {
    await soundManager.unlockAudio();  // BLOCKING!
  } catch (err) {
    console.error("Audio unlock failed", err);
  }

  onAllow();  // Only called after unlock completes
};
```

**Why it's slow:**
- `unlockAudio()` plays silent audio and waits
- iOS audio initialization can take 1-2 seconds
- UI doesn't transition until unlock completes
- User sees no feedback, thinks app is frozen

### Solution: Non-Blocking Audio Unlock

```typescript
// AudioPermissionScreen.tsx - AFTER
const handleInteraction = () => {
  console.log('Audio permission interaction');

  // Audio unlock in background (non-blocking)
  soundManager.unlockAudio().catch(err => {
    console.error("Audio unlock failed", err);
  });

  // Immediately transition UI (don't wait for audio)
  onAllow();
};
```

### Results

- ✅ Instant UI transition on click
- ✅ Audio unlocks in background
- ✅ No perceived lag
- ✅ Users don't bounce

### Core Lessons

1. **Never Block UI on Background Tasks:**
   - Audio unlock can happen async
   - User doesn't need to wait for it
   - Show next screen immediately

2. **Perceived Performance > Actual Performance:**
   - Instant feedback feels faster
   - Even if total time is same
   - Don't make users wait for things they don't see

3. **Fire-and-Forget Pattern:**
   ```typescript
   // ❌ Blocking
   await backgroundTask();
   showUI();

   // ✅ Non-blocking
   backgroundTask().catch(handleError);
   showUI();
   ```

4. **Mobile User Patience:**
   - Mobile users have ZERO patience for delays
   - Any delay > 500ms feels broken
   - Instant response or lose the user

### Files Modified

- `/frontend/components/onboarding/AudioPermissionScreen.tsx` - Remove await

### Related Commits

- `272931d` - Fix PiP auto-open, speed up CLICK ME, ensure iOS timer sound unmuted

---

## Learning 15: UI Artifacts - Arrow Buttons That Shouldn't Exist

**Date**: January 2, 2026
**Challenge**: Arrow buttons appeared on carousel that user had requested removed

### The Problem

User reported:
> "왜 갑자기 화살표가 생겼지...? AI breakdown으로 들어가는 페이지 말야. 우리 없앴었잖아"

Left/right arrow buttons appeared on the task carousel, even though they had been removed before.

### Root Cause

**Desktop-only arrows weren't completely removed:**
```typescript
// TaskCarousel.tsx - BEFORE
<button
  onClick={prevTask}
  className="hidden md:flex ..."  // Hidden on mobile, visible on desktop
>
  <ChevronLeft />
</button>
```

**Problem:**
- Arrows were hidden on mobile (`hidden md:flex`)
- But still showed on desktop
- User wanted them COMPLETELY removed, not just hidden

### Solution: Complete Removal

```typescript
// TaskCarousel.tsx - AFTER
// Arrows completely deleted
// Only dot indicators and swipe gestures remain
```

**Also updated helper text:**
```typescript
// BEFORE
<span className="hidden md:inline">Use arrows or tap dots to browse</span>

// AFTER
<span className="hidden md:inline">Tap dots to browse examples</span>
```

### Results

- ✅ No arrows on any device
- ✅ Cleaner UI
- ✅ Consistent with user's vision

### Core Lessons

1. **Hidden ≠ Removed:**
   - `hidden md:flex` still renders on desktop
   - User said "remove", not "hide on mobile"
   - When in doubt, ask for clarification

2. **Update Related Text:**
   - Removed arrow functionality
   - But forgot to update instructions
   - UX text must match available interactions

3. **Mobile-First Thinking:**
   - If it doesn't work on mobile, don't add desktop version
   - Keep UI consistent across devices
   - Don't assume desktop users want different UI

### Files Modified

- `/frontend/components/onboarding/TaskCarousel.tsx` - Remove arrow buttons

### Related Commits

- (To be committed with learning log)

---

## Learning 16: PiP Auto-Open - currentTimeLeft vs isTimerRunning

**Date**: January 2, 2026
**Challenge**: PiP window stopped auto-opening when Focus Mode started

### The Problem

User reported:
> "데스크탑 브라우저에서 Pop Out Timer 왜 다시 바로 안 떠?"

After implementing timestamp-based countdown, PiP auto-open broke.

### Root Cause

**Auto-open condition used currentTimeLeft:**
```typescript
// GalaxyFocusView.tsx - BEFORE
useEffect(() => {
  if (isPiPSupported && !isPiPOpen && currentTimeLeft > 0) {
    const timer = setTimeout(() => {
      handleOpenPiP();
    }, 300);
    return () => clearTimeout(timer);
  }
}, [isPiPSupported, isPiPOpen, currentTimeLeft, handleOpenPiP]);
```

**Why it failed:**
- With timestamp approach, `currentTimeLeft` starts at 0
- Gets calculated after timer sync starts
- Condition `currentTimeLeft > 0` never true on mount
- PiP never opens

**Also bad dependency:**
- `currentTimeLeft` in dependency array
- Changes every 100ms
- Effect runs constantly!

### Solution: Use isTimerRunning

```typescript
// GalaxyFocusView.tsx - AFTER
useEffect(() => {
  if (isPiPSupported && !isPiPOpen && isTimerRunning) {
    const timer = setTimeout(() => {
      handleOpenPiP();
    }, 300);
    return () => clearTimeout(timer);
  }
}, [isPiPSupported, isPiPOpen, isTimerRunning, handleOpenPiP]);
```

### Results

- ✅ PiP auto-opens when Focus Mode starts
- ✅ Effect only runs when isTimerRunning changes
- ✅ No constant re-triggering

### Core Lessons

1. **Choose Right Condition:**
   - `currentTimeLeft > 0` = value-based condition (changes constantly)
   - `isTimerRunning` = state-based condition (changes on start/pause)
   - Use state flags for trigger logic

2. **Dependency Array Matters:**
   ```typescript
   // ❌ Bad - runs every 100ms
   useEffect(() => {...}, [currentTimeLeft]);

   // ✅ Good - runs when timer starts/stops
   useEffect(() => {...}, [isTimerRunning]);
   ```

3. **Effect Trigger vs Condition:**
   - Effect trigger: When should this run? (dependencies)
   - Condition check: Should it actually do something? (if statement)
   - Keep triggers stable, conditions can be dynamic

### Files Modified

- `/frontend/components/focus/GalaxyFocusView.tsx` - Change auto-open condition

### Related Commits

- `272931d` - Fix PiP auto-open, speed up CLICK ME, ensure iOS timer sound unmuted

---

## Summary: Patterns and Anti-Patterns Discovered

### Audio Patterns

✅ **DO:**
- Use global Audio instance for iOS
- Unlock with `volume: 0` AND `muted: true`
- Explicitly unmute before playback
- Test on real iPhone, not simulator

❌ **DON'T:**
- Create new Audio objects for each play on iOS
- Rely on volume: 0 alone for silence
- Assume audio unlocked in background
- Block UI waiting for audio unlock

### Timer Patterns

✅ **DO:**
- Use timestamp-based countdown (endTime - now)
- Store endTime in global state
- Calculate remaining time in real-time
- Update display every 100ms

❌ **DON'T:**
- Use setInterval counters in background tabs
- Run independent countdowns in multiple components
- Trust browser timers to be accurate
- Use `currentTimeLeft` as trigger condition

### UI Performance Patterns

✅ **DO:**
- Fire-and-forget for background tasks
- Show UI changes immediately
- Make perceived speed fast
- Test on real mobile devices

❌ **DON'T:**
- Block UI on async operations
- Wait for things user doesn't see
- Trust desktop emulator for mobile issues
- Assume hidden = removed

### State Management Patterns

✅ **DO:**
- Single source of truth in store
- Display components just render
- Explicit updates for external windows
- State flags for trigger logic

❌ **DON'T:**
- Independent state in multiple components
- Local counters that drift
- Rely on automatic re-renders for external windows
- Use changing values as effect triggers

---

**Last Updated**: January 2, 2026
**Next Update**: After iOS testing is verified
