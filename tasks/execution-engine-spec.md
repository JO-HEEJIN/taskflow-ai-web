# Execution Engine - Making ADHD Users Actually DO Tasks

## Problem Statement

Based on Reddit r/ADHD_Programmers research:
- ADHD users can create task lists easily
- ADHD users CANNOT execute tasks on the list
- Gamification alone doesn't work (validated via birth2death iOS)
- Need to touch **emotions**, not just rewards

**Key insight from Reddit:**
> "My problem with task apps is not listing all of the tasks within the app but **actually executing the tasks listed there**. I never start the items."

---

## Core Principles

1. **Emotional Engagement** - Touch feelings, not just logic
2. **Aggressive Interruption** - Can't ignore, must respond
3. **Time Pressure** - Visual urgency increases over time
4. **Momentum Building** - Strike while the iron is hot
5. **Accountability** - Make avoidance uncomfortable

---

## Feature 1: Emotional Check-in System

### User Flow:

**When subtask is created but not started:**

- **0-2 hours**: No interruption (grace period)
- **2-4 hours**: Gentle notification
  - "You created 'Set up development environment' 2 hours ago. Ready to start?"
  - Options: "Start now" | "Remind me in 1hr" | "Tell me what's blocking me"

- **4-8 hours**: Emotional check-in (CRITICAL)
  - Full modal appears (can't dismiss easily)
  - "This task has been waiting for 4 hours. What's really stopping you?"
  - Options (must choose one):
    - 😰 "I'm overwhelmed - it feels too big"
    - 😴 "I'm tired - no energy right now"
    - 😕 "I don't know where to start"
    - 😠 "I don't want to do this"
    - 🤔 "Something else" (free text)

  **Then, based on response:**
  - Overwhelmed → "Let's break it down even smaller"
  - Tired → "Set a timer for 5 minutes. Just 5 minutes."
  - Don't know where → "Here's step 1: [first action]"
  - Don't want → "That's okay. Why do you need to do this? (free text)"

- **8-24 hours**: Aggressive reminder
  - Full screen takeover (like iOS alarm)
  - **Can't dismiss without choosing:**
    - "Start this now" (timer starts immediately)
    - "Postpone to tomorrow" (moves to tomorrow's list)
    - "Delete this task" (must write reason)
  - Background turns red
  - Vibration pattern (if mobile)

- **24+ hours**: Daily shame spiral check
  - "This task has been waiting for [X] days."
  - Show visualization: task card gets progressively redder/darker
  - "What would happen if you never do this? (free text)"
  - Forces reflection

### Technical Implementation:

**Backend:**
```typescript
// New fields in Subtask model
interface Subtask {
  // ... existing fields
  createdAt: Date;
  lastCheckInAt?: Date;
  emotionalState?: 'overwhelmed' | 'tired' | 'confused' | 'resistant' | 'other';
  emotionalNote?: string;
  checkInCount: number;
  postponeCount: number;
}
```

**New service:**
```typescript
// backend/src/services/emotionalCheckInService.ts
class EmotionalCheckInService {
  // Cron job runs every hour
  async checkStaleSubtasks(): Promise<void> {
    const users = await getAllActiveUsers();

    for (const user of users) {
      const tasks = await getTasksForUser(user.id);

      for (const task of tasks) {
        for (const subtask of task.subtasks) {
          if (subtask.isCompleted) continue;

          const hoursSinceCreated = getHoursSince(subtask.createdAt);

          // Trigger appropriate check-in based on time
          if (hoursSinceCreated >= 24) {
            await this.dailyShameCheck(user, task, subtask);
          } else if (hoursSinceCreated >= 8) {
            await this.aggressiveReminder(user, task, subtask);
          } else if (hoursSinceCreated >= 4) {
            await this.emotionalCheckIn(user, task, subtask);
          } else if (hoursSinceCreated >= 2) {
            await this.gentleReminder(user, task, subtask);
          }
        }
      }
    }
  }

  async emotionalCheckIn(user, task, subtask) {
    // Send push notification with emotional check-in
    await notificationService.sendToUser(user.id, {
      title: '💭 What\'s blocking you?',
      body: `"${subtask.title}" has been waiting for ${getHoursSince(subtask.createdAt)} hours`,
      data: {
        type: 'emotional_checkin',
        taskId: task.id,
        subtaskId: subtask.id,
        action: 'open_modal'
      }
    });
  }

  async aggressiveReminder(user, task, subtask) {
    // Full screen takeover notification
    await notificationService.sendToUser(user.id, {
      title: '🚨 Decision Required',
      body: `"${subtask.title}" - Start, Postpone, or Delete?`,
      data: {
        type: 'aggressive_reminder',
        taskId: task.id,
        subtaskId: subtask.id,
        action: 'fullscreen_takeover',
        priority: 'high'
      }
    });
  }

  async dailyShameCheck(user, task, subtask) {
    const daysSince = Math.floor(getHoursSince(subtask.createdAt) / 24);

    await notificationService.sendToUser(user.id, {
      title: `📅 ${daysSince} days waiting`,
      body: `What would happen if you never finish "${subtask.title}"?`,
      data: {
        type: 'daily_shame_check',
        taskId: task.id,
        subtaskId: subtask.id,
        daysSince,
        action: 'reflection_required'
      }
    });
  }
}
```

**Frontend:**
```typescript
// components/EmotionalCheckInModal.tsx
interface EmotionalCheckInModalProps {
  subtask: Subtask;
  task: Task;
  hoursSinceCreated: number;
  onResponse: (response: EmotionalResponse) => void;
}

function EmotionalCheckInModal({ subtask, task, hoursSinceCreated, onResponse }: Props) {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md">
      {/* Can't click outside to close */}
      <div className="flex items-center justify-center h-full p-4">
        <div className="max-w-md w-full bg-gradient-to-br from-purple-900/80 to-blue-900/80 rounded-2xl p-8 border border-purple-500/50">

          <h2 className="text-2xl font-bold text-white mb-2">
            What's really stopping you?
          </h2>

          <p className="text-purple-200 mb-6">
            "{subtask.title}" has been waiting for <span className="font-bold text-red-400">{hoursSinceCreated} hours</span>
          </p>

          <div className="space-y-3 mb-6">
            <EmotionButton
              emoji="😰"
              label="I'm overwhelmed - it feels too big"
              selected={selectedEmotion === 'overwhelmed'}
              onClick={() => setSelectedEmotion('overwhelmed')}
            />
            <EmotionButton
              emoji="😴"
              label="I'm tired - no energy right now"
              selected={selectedEmotion === 'tired'}
              onClick={() => setSelectedEmotion('tired')}
            />
            <EmotionButton
              emoji="😕"
              label="I don't know where to start"
              selected={selectedEmotion === 'confused'}
              onClick={() => setSelectedEmotion('confused')}
            />
            <EmotionButton
              emoji="😠"
              label="I don't want to do this"
              selected={selectedEmotion === 'resistant'}
              onClick={() => setSelectedEmotion('resistant')}
            />
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Want to add more context?"
            className="w-full p-3 rounded bg-white/10 text-white placeholder-white/50 mb-6"
            rows={3}
          />

          <button
            disabled={!selectedEmotion}
            onClick={() => onResponse({ emotion: selectedEmotion, note })}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Help me with this
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Feature 2: Time Pressure Visualization

### Visual Design:

**Subtask cards change color over time:**

- **0-2 hours**: Normal (gray border)
- **2-8 hours**: Yellow border, subtle pulse
- **8-24 hours**: Orange border, faster pulse
- **24+ hours**: Red border, urgent pulse
- **3+ days**: Deep red, "💀 STALE" badge

**Implementation:**
```typescript
function getSubtaskUrgencyStyle(createdAt: Date, isCompleted: boolean) {
  if (isCompleted) return 'border-green-500 bg-green-500/10';

  const hoursSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSince >= 72) { // 3+ days
    return 'border-red-700 bg-red-900/30 animate-pulse-slow ring-2 ring-red-500/50';
  } else if (hoursSince >= 24) {
    return 'border-red-500 bg-red-500/20 animate-pulse';
  } else if (hoursSince >= 8) {
    return 'border-orange-500 bg-orange-500/10 animate-pulse-fast';
  } else if (hoursSince >= 2) {
    return 'border-yellow-500 bg-yellow-500/10';
  }

  return 'border-gray-600';
}

function getUrgencyBadge(createdAt: Date, isCompleted: boolean) {
  if (isCompleted) return null;

  const daysSince = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince >= 7) return '💀 STALE (7+ days)';
  if (daysSince >= 3) return '🔥 URGENT (3+ days)';
  if (daysSince >= 1) return '⚠️ Waiting 24+ hours';

  return null;
}
```

---

## Feature 3: Momentum Mode

### Concept:

When you complete a subtask, immediately show the NEXT one. Strike while the iron is hot.

### User Flow:

1. User checks off subtask
2. Celebration animation (brief, 1 second)
3. **IMMEDIATELY** (no delay) show modal:
   - "🎉 Nice! You're on a roll."
   - "Want to keep the momentum going?"
   - Shows NEXT uncompleted subtask with "Start this now" button
   - If they click "Start", timer begins immediately
   - If they dismiss, normal flow

### Implementation:

```typescript
async function handleSubtaskComplete(taskId: string, subtaskId: string) {
  // Mark complete
  await api.toggleSubtask(taskId, subtaskId);

  // Brief celebration
  showConfetti();
  await delay(1000);

  // Get next uncompleted subtask
  const task = tasks.find(t => t.id === taskId);
  const nextSubtask = task.subtasks.find(st => !st.isCompleted && !st.isArchived);

  if (nextSubtask) {
    setMomentumModal({
      taskId,
      subtask: nextSubtask,
      streak: getCurrentStreak() // how many completed today
    });
  }
}
```

**MomentumModal:**
```typescript
function MomentumModal({ taskId, subtask, streak, onStart, onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-8 rounded-2xl max-w-md">
        <div className="text-6xl mb-4 text-center">🎉</div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          You're on a roll!
        </h2>
        <p className="text-purple-100 text-center mb-6">
          {streak} subtask{streak > 1 ? 's' : ''} completed today
        </p>

        <div className="bg-white/10 p-4 rounded-lg mb-6">
          <p className="text-sm text-purple-200 mb-2">Next up:</p>
          <p className="text-white font-semibold">{subtask.title}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onStart}
            className="flex-1 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50"
          >
            Keep going! 🚀
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Feature 4: Daily Start Ritual

### Concept:

Every morning, force user to pick 1-3 tasks they'll do TODAY.

### User Flow:

**On first app open of the day:**

1. Full modal appears (can't dismiss):
   - "Good morning! ☀️ What will you do today?"
   - Shows ALL pending subtasks
   - User MUST select 1-3 items
   - These become "Today's Focus"

2. Throughout the day:
   - Only "Today's Focus" items show aggressive reminders
   - Other items are muted
   - Prevents overwhelm

3. End of day (9 PM):
   - "How did today go?"
   - Shows what you completed vs what you committed to
   - No judgment, just reflection
   - "What blocked you?" (optional free text)

### Implementation:

```typescript
// New collection: DailyFocus
interface DailyFocus {
  userId: string;
  date: string; // YYYY-MM-DD
  selectedSubtasks: {
    taskId: string;
    subtaskId: string;
  }[];
  completed: number;
  reflectionNote?: string;
}

// Morning modal
function MorningRitualModal({ tasks, onSelect }) {
  const [selected, setSelected] = useState<string[]>([]);

  const allPendingSubtasks = tasks.flatMap(task =>
    task.subtasks
      .filter(st => !st.isCompleted && !st.isArchived)
      .map(st => ({ task, subtask: st }))
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-orange-500 to-pink-500 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 mt-20">
        <h1 className="text-4xl font-bold mb-2">Good morning! ☀️</h1>
        <p className="text-gray-600 mb-6">
          Pick 1-3 things you'll do today. Not everything. Just 1-3.
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
          {allPendingSubtasks.map(({ task, subtask }) => (
            <label
              key={subtask.id}
              className={`block p-4 rounded-lg border-2 cursor-pointer transition ${
                selected.includes(subtask.id)
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(subtask.id)}
                onChange={(e) => {
                  if (e.target.checked && selected.length < 3) {
                    setSelected([...selected, subtask.id]);
                  } else if (!e.target.checked) {
                    setSelected(selected.filter(id => id !== subtask.id));
                  }
                }}
                className="mr-3"
              />
              <span className="font-medium">{subtask.title}</span>
              <span className="text-sm text-gray-500 block ml-6">
                from "{task.title}"
              </span>
            </label>
          ))}
        </div>

        <button
          disabled={selected.length === 0}
          onClick={() => onSelect(selected)}
          className="w-full py-4 bg-purple-600 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700"
        >
          {selected.length === 0
            ? 'Select at least 1 task'
            : `Let's do ${selected.length} thing${selected.length > 1 ? 's' : ''} today!`
          }
        </button>
      </div>
    </div>
  );
}
```

---

## Feature 5: Aggressive Full-Screen Reminders

### Concept:

After 8 hours, notification isn't enough. Take over the ENTIRE screen.

### Implementation:

**On mobile (PWA):**
- Full screen takeover (like iOS alarm)
- Vibration pattern (escalating)
- Can't dismiss without making decision

**On desktop:**
- Full browser takeover
- Overlay on ALL tabs
- Sound alert (optional)

```typescript
// When notification arrives with action: 'fullscreen_takeover'
function handleFullscreenTakeover(taskId: string, subtaskId: string, daysSince: number) {
  // Lock scrolling
  document.body.style.overflow = 'hidden';

  // Show full screen modal
  setFullscreenModal({
    taskId,
    subtaskId,
    daysSince,
    canDismiss: false // CRITICAL
  });

  // Vibration (mobile only)
  if ('vibrate' in navigator) {
    // Escalating pattern
    navigator.vibrate([200, 100, 200, 100, 400]);
  }

  // Play sound (optional, user can disable)
  if (soundEnabled) {
    const audio = new Audio('/reminder-sound.mp3');
    audio.play();
  }
}

function FullscreenReminderModal({ task, subtask, daysSince, onDecision }) {
  return (
    <div className="fixed inset-0 z-[99999] bg-red-900">
      {/* Can't click outside */}
      <div className="flex flex-col items-center justify-center h-full p-8 text-white">

        <div className="text-8xl mb-8 animate-pulse">⏰</div>

        <h1 className="text-4xl font-bold mb-4 text-center">
          Decision Required
        </h1>

        <p className="text-xl mb-2 text-center">
          This task has been waiting for
        </p>
        <p className="text-6xl font-bold mb-8">
          {daysSince} {daysSince === 1 ? 'day' : 'days'}
        </p>

        <div className="bg-white/10 p-6 rounded-lg mb-8 max-w-md">
          <p className="text-sm text-red-200 mb-2">Task:</p>
          <p className="font-semibold text-lg">{subtask.title}</p>
        </div>

        <div className="space-y-4 w-full max-w-md">
          <button
            onClick={() => onDecision('start')}
            className="w-full py-4 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-bold"
          >
            ✅ Start this NOW
          </button>

          <button
            onClick={() => onDecision('postpone')}
            className="w-full py-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-xl font-bold"
          >
            ⏰ Postpone to tomorrow
          </button>

          <button
            onClick={() => onDecision('delete')}
            className="w-full py-4 bg-gray-700 hover:bg-gray-800 rounded-lg text-xl font-bold"
          >
            🗑️ Delete this task
          </button>
        </div>

        <p className="text-sm text-red-300 mt-8">
          You must make a decision to continue
        </p>
      </div>
    </div>
  );
}
```

---

## Feature 6: Shame/Loss Aversion (Subtle)

### Concept:

Show what you're losing by not doing the task.

### Implementation:

**On 3+ day old tasks:**
- Show "Days wasted: X" instead of "Days since created"
- Not aggressive, just factual
- Loss aversion is powerful

```typescript
function StaleTaskBadge({ daysSince }: { daysSince: number }) {
  if (daysSince < 3) return null;

  return (
    <div className="flex items-center gap-2 text-red-400 text-sm">
      <span>💀</span>
      <span className="font-semibold">
        {daysSince} days wasted
      </span>
    </div>
  );
}
```

---

## Implementation Priority

### Phase 1 (Week 1): Core Execution Features
1. ✅ Emotional Check-in Modal (4-hour trigger)
2. ✅ Time Pressure Visualization (color coding)
3. ✅ Momentum Mode (after completion)
4. ✅ Backend cron job for check-ins

### Phase 2 (Week 2): Aggressive Reminders
5. ✅ Full-screen takeover modal (8+ hour trigger)
6. ✅ Daily shame check (24+ hour trigger)
7. ✅ Push notification integration
8. ✅ Mobile PWA optimization

### Phase 3 (Week 3): Daily Ritual
9. ✅ Morning ritual modal
10. ✅ Evening reflection
11. ✅ "Today's Focus" filtering

---

## Success Metrics

Track these to validate the feature:

1. **Completion Rate**: % of subtasks completed within 24 hours of creation
2. **Check-in Response Rate**: % of emotional check-ins that get responses
3. **Momentum Success**: % of users who start next task after completion
4. **Stale Task Reduction**: Avg age of oldest incomplete subtask
5. **Daily Ritual Compliance**: % of days user completes morning selection

**Target Improvements:**
- 24-hour completion rate: 30% → 60%
- Stale tasks (3+ days): 40% → 15%
- User retention (7-day): 20% → 50%

---

## Why This Will Work

1. **Emotional engagement** - Touches feelings, not just logic (validated by Reddit)
2. **Aggressive interruption** - Can't ignore (requested by Reddit users)
3. **Time pressure** - Visual urgency builds (loss aversion)
4. **Momentum** - Capitalize on dopamine hit of completion
5. **Simplicity** - No complex gamification, just direct intervention

**Reddit validation:**
- ✅ "Are you feeling up for a small task or big task?" - Emotional check-in addresses this
- ✅ "Interrupt myself to let me know another task is coming" - Momentum mode
- ✅ "Keep me focused on each task so that it gets done" - Full-screen reminders
- ✅ "everything needs to be simple times ten" - Simple decision points, no complexity

---

This is the execution engine that will make TaskFlow AI truly useful for ADHD brains.
