# TaskFlow AI UX Improvement Plan

## Problems to Solve

1. AI breakdown fails with vague task names (no context gathering)
2. **Breakdown too slow (6-12s) - CRITICAL**
3. AI Coaching only in Focus Mode
4. Chat history lost on exit
5. AI gives answers instead of making user think
6. **BUG: "Break Down Further" button missing for large subtasks (e.g., 120min)**

## User Requirements

- Clarifying Questions: ALWAYS automatic (no skip option)
- Code Help: Socratic method, code ONLY as absolute last resort
- Chat History: Permanent per-task localStorage storage

---

## Feature 1: Clarifying Questions Before Breakdown (P0)

### New Files:
- `frontend/components/ClarifyingQuestionsModal.tsx`

### Modified Files:
- `frontend/components/TaskForm.tsx` - Show modal after task input
- `backend/src/routes/ai.ts` - Add `/api/ai/clarify` endpoint
- `backend/src/services/azureOpenAIService.ts` - Add `generateClarifyingQuestions()`

### Flow:
1. User enters task → TaskForm shows ClarifyingQuestionsModal
2. Modal calls `/api/ai/clarify` with task title
3. AI generates 2-4 quick questions (gpt-4o-mini, fast)
4. User answers inline
5. Answers passed to breakdown as enriched context

### Backend Prompt:
```
Task: "{title}"
Generate 2-4 clarifying questions to understand:
- Specific outcome expected
- Time/deadline constraints
- Dependencies or blockers
- User's current knowledge level
Return JSON: { questions: string[] }
```

---

## Feature 2: Breakdown Speed Optimization (P0 - CRITICAL)

### Problem Analysis

**Current Performance (Unacceptable):**
| Operation | Current Time | Target |
|-----------|--------------|--------|
| Initial Task → Subtasks | **~10 seconds** | <3 seconds |
| Break Down Further | ~5-8 seconds | <2 seconds |
| Focus Mode "Too big?" | ~5-8 seconds | <2 seconds |

### Current Breakdown Flow (Sequential - SLOW)

```
breakdownTask() 호출
    ↓
1. analyzeComplexity()          ← T-shirt sizing (Rule + AI) ~1-2s
    ↓  [WAIT]
2. getChatCompletions()         ← Initial breakdown ~3-5s
    ↓  [WAIT]
3. verifyBreakdown()            ← Chain-of-Verification ~2-3s
    ↓  [WAIT]
4. normalizeSubtaskDurations()  ← 시간 정규화 ~0ms
    ↓  [WAIT]
5. recursiveBreakdownUntilAtomic() ← 재귀 breakdown ~2-4s (N API calls)
    ↓
Total: 8-14 seconds 💀
```

### Modified Files:
- `backend/src/services/azureOpenAIService.ts`

### Optimization Strategy

#### Optimization 1: Skip CoV for S/M Tasks

**현재 코드 (lines 456-466):**
```typescript
// Chain-of-Verification runs for ALL tasks
const verification = await this.verifyBreakdown(taskTitle, taskDescription, subtasks, complexity);
```

**변경:**
```typescript
// Only run CoV for complex tasks (L/XL)
let verification = { isValid: true, issues: [], correctedSubtasks: undefined };

if (complexity.tshirtSize === 'L' || complexity.tshirtSize === 'XL') {
  verification = await this.verifyBreakdown(taskTitle, taskDescription, subtasks, complexity);
}
```

**이유:** S/M 태스크는 단순하므로 AI가 시간을 잘못 추정할 확률 낮음. CoV 스킵으로 **1 API 호출 절약 (~2초)**

---

#### Optimization 2: Parallel T-shirt + Initial Breakdown

**현재 코드 (순차적):**
```typescript
// Step 1: Wait for complexity analysis
const complexity = await this.analyzeComplexity(taskTitle, taskDescription);  // ~1-2s

// Step 2: Then generate breakdown
const response = await this.client.getChatCompletions(...);  // ~3-5s
```

**변경 (병렬):**
```typescript
// Start both simultaneously
const [complexity, initialBreakdown] = await Promise.all([
  this.analyzeComplexity(taskTitle, taskDescription),
  this.getQuickInitialBreakdown(taskTitle, taskDescription)  // New: lightweight prompt
]);

// Use complexity to validate/adjust after both complete
const finalSubtasks = this.adjustBreakdownWithComplexity(initialBreakdown, complexity);
```

**이유:** T-shirt analysis와 initial breakdown은 독립적. 병렬 실행으로 **~1-2초 절약**

---

#### Optimization 3: Defer Recursive Breakdown (On-Demand)

**현재 코드 (lines 483-503):**
```typescript
// AUTOMATIC recursive breakdown runs immediately
const recursivelyBrokenDown = await Promise.all(
  finalSubtasks.map(async (st: any, index: number) => {
    return {
      ...st,
      // ❌ PROBLEM: This triggers N more API calls during initial load!
      children: estimatedMinutes > 10
        ? await this.recursiveBreakdownUntilAtomic(st.title, estimatedMinutes, taskTitle, 1)
        : [],
    };
  })
);
```

**변경:**
```typescript
// Return immediately with empty children
const subtasksWithFlags = finalSubtasks.map((st: any, index: number) => ({
  ...st,
  isComposite: st.estimatedMinutes > 10,  // Flag for UI
  children: [],  // Empty - will be populated on-demand
}));

// Recursive breakdown happens ONLY when user clicks "Break Down Further"
```

**이유:** 사용자는 처음에 top-level 구조만 보면 됨. 재귀 breakdown 제거로 **~2-4초 절약**

---

#### Optimization 4: Lightweight Prompt for Quick Initial Breakdown

**현재 System Prompt:** ~1500 토큰 (예시 많음)

**변경 (Minimal Prompt):**
```typescript
private getQuickArchitectPrompt(language: 'korean' | 'english'): string {
  return `ADHD Task Architect. Output exactly 3 subtasks.

RULES:
1. First task creates immediate value (<2 min)
2. NO prep tasks (정리, 준비, 찾기, 검색)
3. Each task = action + deliverable

OUTPUT: {"subtasks": [{"title": "...", "estimatedMinutes": N}]}
${language === 'korean' ? 'Use Korean.' : 'Use English.'}`;
}
```

**이유:** 토큰 감소 → API 응답 시간 단축 **~0.5초 절약**

---

#### Optimization 5: Fast "Too big?" / "Break Down Further" Path

**현재:** `deepDiveBreakdown()` 또는 `recursiveBreakdownUntilAtomic()` 호출
- Full system prompt 사용
- 재귀적으로 children까지 breakdown

**변경:**
```typescript
async quickBreakdownSingle(
  subtaskTitle: string,
  estimatedMinutes: number,
  parentContext: string
): Promise<Subtask[]> {
  // Ultra-minimal prompt - just 3 children, no recursion
  const prompt = `Break "${subtaskTitle}" (${estimatedMinutes}min) into 3 steps.
Parent: "${parentContext}"
Rules: First step <2min, no prep tasks.
Output: [{"title":"...","estimatedMinutes":N}]`;

  const response = await this.client.getChatCompletions(
    'gpt-4o-mini',  // Fastest model
    [{ role: 'user', content: prompt }],
    { maxTokens: 200, temperature: 0.1 }
  );

  return JSON.parse(response.choices[0]?.message?.content || '[]');
}
```

**이유:** Focus Mode "Too big?"는 빠른 응답이 필수. 최소 프롬프트 + 빠른 모델로 **~3-5초 → ~1-2초**

---

### Optimized Breakdown Flow (Target)

```
breakdownTask() 호출
    ↓
┌─────────────────────────────────────────┐
│  PARALLEL EXECUTION                      │
│  ├─ analyzeComplexity()     ~1-2s       │
│  └─ getQuickInitialBreakdown() ~2-3s    │
└─────────────────────────────────────────┘
    ↓  [Max of both = ~2-3s]
adjustBreakdownWithComplexity()  ~0ms
    ↓
(Skip CoV for S/M tasks)
    ↓
Return subtasks with isComposite flags
    ↓
Total: 2-3 seconds ✅
```

### Summary

| Optimization | Before | After | Savings |
|--------------|--------|-------|---------|
| Skip CoV for S/M | Always | L/XL only | ~2s |
| Parallel T-shirt + Breakdown | Sequential | Parallel | ~1-2s |
| Defer recursive breakdown | Immediate | On-demand | ~2-4s |
| Lighter prompts | ~1500 tokens | ~400 tokens | ~0.5s |
| "Too big?" fast path | Full logic | Minimal | ~3-4s |

**Expected Results:**
- Initial breakdown: **10s → 3s**
- Break Down Further: **5-8s → 2s**
- Focus "Too big?": **5-8s → 1-2s**

---

## BUG FIX: "Break Down Further" Button Missing for Large Subtasks

### Problem Description
- Subtasks with large estimates (e.g., 120 minutes) should show "Break Down Further" button
- Currently, the button is sometimes missing even for >10min subtasks
- This is a critical UX bug - users can't break down complex subtasks

### Root Cause Analysis

**Possible causes:**
1. `isComposite` flag not being set correctly in backend
2. `isComposite` flag not being saved/retrieved from database
3. Frontend not checking `isComposite` OR `estimatedMinutes > 10`
4. Draft vs Confirmed status affecting button visibility

### Files to Investigate:
- `backend/src/services/azureOpenAIService.ts` - Check `isComposite` assignment
- `backend/src/routes/tasks.ts` - Check if `isComposite` is persisted
- `frontend/components/TaskDetail.tsx` - Check button render condition
- `frontend/components/AIBreakdownModal.tsx` - Check subtask creation

### Fix Strategy:

**Backend (azureOpenAIService.ts):**
```typescript
// Ensure isComposite is ALWAYS set based on estimatedMinutes
const subtask = {
  ...st,
  estimatedMinutes: st.estimatedMinutes || 5,
  isComposite: (st.estimatedMinutes || 5) > 10,  // Always compute
};
```

**Frontend (wherever "Break Down Further" renders):**
```typescript
// Use dual condition - don't rely only on isComposite flag
const showBreakDownButton = subtask.isComposite || subtask.estimatedMinutes > 10;
```

**Database Schema Check:**
```typescript
// Ensure isComposite is included in Subtask schema
interface Subtask {
  // ...
  isComposite?: boolean;  // Should be persisted
  estimatedMinutes: number;
}
```

### Test Cases:
1. Create task → AI generates 120min subtask → Button should appear
2. Manually create subtask with 60min → Button should appear
3. Subtask with 5min → Button should NOT appear
4. After "Break Down Further" → Parent's button should disappear

---

## Feature 3: Socratic AI Coaching

### Modified Files:
- `backend/src/services/azureOpenAIService.ts` - Update COACH_SYSTEM_PROMPT

### New System Prompt:
```
You are a Socratic coach. NEVER give direct answers or code.

Your role:
1. Ask questions that lead user to discover answers themselves
2. Break down their thinking with "What if..." prompts
3. Validate their reasoning, point out gaps
4. Only after user says "I really don't know" 3+ times, provide minimal hints
5. Code generation is ABSOLUTE LAST RESORT - only when explicitly begged

Response style:
- "What do you think would happen if...?"
- "Have you considered...?"
- "What's the first step you'd take?"
- NEVER: "Here's the solution..." or code blocks
```

---

## Feature 4: Chat History Persistence

### New Files:
- `frontend/utils/chatStorage.ts`

### Modified Files:
- `frontend/store/useCoachStore.ts` - Load/save to localStorage
- `frontend/components/focus/CoachView.tsx` - Initialize from storage

### Storage Schema:
```typescript
// localStorage key: `taskflow_chat_{taskId}`
interface ChatStorage {
  taskId: string;
  messages: ChatMessage[];
  lastUpdated: number;
}
```

### Cleanup:
Auto-prune chats older than 30 days on app load

---

## Feature 5: AI Coaching Outside Focus Mode

### New Files:
- `frontend/components/CoachChat.tsx` - Standalone chat component

### Modified Files:
- `frontend/components/TaskDetail.tsx` - Add collapsible coach panel

### Design:
- Collapsible panel in TaskDetail (not modal)
- Same CoachView internals, different container
- Persists via chatStorage

---

## Implementation Order

1. **BUG FIX: "Break Down Further" missing** (quick fix, high impact)
2. **Feature 2: Speed Optimization** (highest impact, unblocks everything)
3. **Feature 4: Chat Storage** (dependency for coach features)
4. **Feature 1: Clarifying Questions Modal** (biggest UX win)
5. **Feature 3: Socratic Prompt Update** (quick win)
6. **Feature 5: Coach Outside Focus Mode** (UI addition)

---

## Critical Files to Modify

```
frontend/
├── components/
│   ├── TaskForm.tsx (clarifying modal trigger)
│   ├── TaskDetail.tsx (coach panel + break down button fix)
│   ├── AIBreakdownModal.tsx (isComposite fix)
│   ├── ClarifyingQuestionsModal.tsx (NEW)
│   ├── CoachChat.tsx (NEW)
│   └── focus/CoachView.tsx (persistence)
├── store/useCoachStore.ts (localStorage)
└── utils/chatStorage.ts (NEW)

backend/
├── src/routes/ai.ts (/clarify endpoint)
├── src/routes/tasks.ts (isComposite persistence)
└── src/services/azureOpenAIService.ts (all AI changes + isComposite fix)
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Initial breakdown time | ~10s | <3s |
| Break Down Further time | ~5-8s | <2s |
| Focus "Too big?" time | ~5-8s | <1-2s |
| "Break Down Further" button visibility | Buggy | 100% for >10min |
| User abandonment rate | High | Low |
| Chat history retention | 0% | 100% |
