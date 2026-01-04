# Quick Start: Implementing Triple-Tier AI Architecture
**Date:** 2026-01-05
**Estimated Time:** 2-3 weeks
**Priority:** High (Solves "책상 정리" problem)

---

## TL;DR

**Problem:** AI suggests "책상 정리" (clean desk), "노트북 켜기" (open laptop) as first subtasks
**Solution:** Use o3-mini (reasoning model) for task breakdown instead of gpt-4o-mini
**Cost:** ~$5/user/month (acceptable per user directive: "품질 최우선")
**Result:** <5% fake task rate (vs. current ~30%)

---

## What You'll Build

```
Before (Current):
Task: "프로젝트 제안서 작성"
└─ AI (gpt-4o-mini):
   1. 책상 정리 및 집중 환경 만들기 (5min) ❌
   2. 관련 자료 모으기 (10min) ❌
   3. 제안서 개요 작성 (15min) ✅

After (Triple-Tier):
Task: "프로젝트 제안서 작성"
└─ AI (o3-mini Architect):
   1. 핵심 메시지 1문장 작성 (2min) ✅
   2. 3가지 근거 bullet point (5min) ✅
   3. 서론 초안 200자 작성 (7min) ✅
```

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────┐
│  TIER 1: Architect (o3-mini)                     │
│  - Initial task breakdown                        │
│  - Eliminates "책상 정리" automatically           │
│  - Latency: 1-2s with ReasoningAnimation         │
├──────────────────────────────────────────────────┤
│  TIER 2: Coach (gpt-4o-mini)                     │
│  - Quick encouragement                           │
│  - Latency: 200-300ms                            │
├──────────────────────────────────────────────────┤
│  TIER 3: Deep Dive (o3-mini)                     │
│  - Recursive breakdown for 10+ min tasks         │
│  - Creates follow-up tasks                       │
└──────────────────────────────────────────────────┘
```

---

## Implementation Steps (Week-by-Week)

### Week 1: Foundation + Bug Fixes

#### Day 1: Azure Setup (2 hours)
1. Login to Azure Portal
2. Deploy models:
   - `taskflow-architect` → o3-mini
   - `taskflow-coach` → gpt-4o-mini
   - `taskflow-fallback` → gpt-4o
3. Update `.env`:
   ```bash
   AZURE_OPENAI_ARCHITECT=taskflow-architect
   AZURE_OPENAI_COACH=taskflow-coach
   AZURE_OPENAI_FALLBACK=taskflow-fallback
   ```

#### Day 2: Backend Implementation (4 hours)
**File:** `backend/src/services/azureOpenAIService.ts`

Key changes:
- Add model routing logic
- Implement Architect, Coach, Deep Dive methods
- Add fallback handling
- See `TRIPLE_TIER_ARCHITECTURE_PLAN.md` Task 1.3 for full code

#### Day 3: ReasoningAnimation (2 hours)
**File:** `frontend/components/loading/ReasoningAnimation.tsx`

Creates 4-step animation that matches o3-mini's 1-2s latency:
1. "Analyzing core value..." (400ms)
2. "Detecting mental blocks..." (500ms)
3. "Eliminating fake tasks..." (600ms)
4. "Creating micro-actions..." (500ms)

#### Day 4-5: iOS Audio Bug Fix (1.5 hours)
**Files:**
- `frontend/hooks/useReliableTimer.ts`
- `frontend/lib/SoundManager.ts`

Changes:
- Add `hasEverStartedRef` to track if timer actually started
- Only play completion sound if timer was running
- Remove warm-up playback from SoundManager

**Testing:**
- [ ] No sound before timer starts
- [ ] Completion sound plays reliably
- [ ] Test on actual iPhone

---

### Week 2: Deep Dive + Mobile Edit

#### Day 1-2: Database Schema Update (3 hours)
**File:** `backend/src/types/index.ts`

Add fields:
```typescript
interface Task {
  // ... existing fields
  parentTaskId?: string;
  parentSubtaskId?: string;
  isFollowUpTask: boolean;
  depth: number; // 0=original, 1=breakdown, 2=max
}

interface Subtask {
  // ... existing fields
  hasFollowUpTask: boolean;
  followUpTaskId?: string;
}
```

Run migration to add fields to existing tasks.

#### Day 3-4: Deep Dive Feature (6 hours)
**Components:**
1. `DeepDiveModal.tsx` - Asks user if they want breakdown
2. `/api/tasks/deep-dive` endpoint - Creates follow-up task
3. Integration in `GalaxyFocusView.tsx`

**Flow:**
1. User hits 10+ min subtask
2. Modal appears after 2s
3. User accepts → AI breakdown → Follow-up task created
4. Redirect to follow-up Focus Mode

#### Day 5: Mobile Edit Mode (5 hours)
**Components:**
1. `useBreakdownEditor.ts` hook
2. `SubtaskEditor.tsx` component

**Features:**
- Edit subtask title/duration
- Add/delete subtasks
- Regenerate all subtasks
- Save changes

---

### Week 3: Testing + Launch

#### Day 1-2: Manual Testing
**Test each scenario:**
- [ ] "프로젝트 제안서 작성" → No preparation tasks
- [ ] "운동 루틴 시작" → First step is actual exercise
- [ ] First subtask always <3 min
- [ ] Deep Dive creates follow-up correctly
- [ ] Mobile edit works on phone
- [ ] iOS audio bug fixed

#### Day 3: Deploy to Production
1. Deploy backend
2. Deploy frontend
3. Verify health checks
4. Smoke test with real tasks

#### Day 4-5: Monitoring + User Feedback
- Watch latency metrics
- Check cost per request
- Collect user feedback
- Adjust prompts if needed

---

## Critical Files Reference

### Must Modify
1. `backend/src/services/azureOpenAIService.ts` - Main service (Task 1.3)
2. `frontend/components/loading/ReasoningAnimation.tsx` - NEW (Task 2.1)
3. `frontend/hooks/useReliableTimer.ts` - Bug fix (Task 5.1)
4. `frontend/lib/SoundManager.ts` - Bug fix (Task 5.2)

### Should Create
5. `frontend/components/focus/DeepDiveModal.tsx` - NEW (Task 3.2)
6. `frontend/hooks/useBreakdownEditor.ts` - NEW (Task 4.1)
7. `frontend/components/tasks/SubtaskEditor.tsx` - NEW (Task 4.2)
8. `backend/src/routes/tasks.ts` - Add Deep Dive endpoint (Task 3.4)

### May Update Later
9. `frontend/components/focus/GalaxyFocusView.tsx` - Deep Dive integration
10. `backend/src/types/index.ts` - Schema updates

---

## Testing Shortcuts

### Quick Quality Test
```bash
# Create these tasks and verify NO "책상 정리" type subtasks:
1. "프로젝트 제안서 작성"
2. "운동 루틴 시작"
3. "블로그 포스트 작성"
4. "이력서 업데이트"
5. "방 청소"
```

Expected: First subtask creates value in <2 minutes, no preparation tasks.

### Quick Latency Test
```bash
# Measure breakdown time:
time curl -X POST https://api.taskflow.ai/tasks/breakdown \
  -H "Content-Type: application/json" \
  -d '{"taskTitle":"프로젝트 제안서 작성"}'
```

Expected: <2 seconds (1-2s is normal for o3-mini)

### Quick Cost Check
```bash
# Check last 24 hours usage:
az monitor metrics list \
  --resource <openai-resource-id> \
  --metric TokensUsed \
  --interval PT1H
```

Expected: ~800 tokens per breakdown × $0.80/1K = $0.64 per breakdown

---

## Common Issues & Solutions

### Issue 1: o3-mini Still Produces "책상 정리"
**Symptom:** First subtask is preparation task
**Solution:**
1. Check system prompt is correctly set (see Task 1.3)
2. Verify using `taskflow-architect` deployment (not fallback)
3. Add post-processing filter as last resort

### Issue 2: Latency >3 seconds
**Symptom:** Users complain about slowness
**Solution:**
1. Verify ReasoningAnimation is enabled
2. Check Azure region (East US 2 is fastest)
3. Consider switching to gpt-4o fallback temporarily

### Issue 3: Cost Higher Than Expected
**Symptom:** >$10/user/month
**Solution:**
1. Check for prompt bloat (keep system prompt <1000 tokens)
2. Verify caching is working for duplicate tasks
3. Implement rate limiting (10 breakdowns/user/day)

### Issue 4: iOS Audio Still Plays Early
**Symptom:** Sound before timer starts
**Solution:**
1. Verify `hasEverStartedRef` is implemented correctly
2. Check SoundManager warm-up is removed
3. Test on actual iPhone (simulator behaves differently)

---

## Success Metrics

### After Week 1
- [ ] o3-mini deployed and responding
- [ ] ReasoningAnimation shows during breakdown
- [ ] iOS audio bug fixed (no early sounds)
- [ ] <5% fake task rate in manual testing

### After Week 2
- [ ] Deep Dive modal working
- [ ] Follow-up tasks created correctly
- [ ] Mobile edit mode functional
- [ ] Depth limit enforced (max 2)

### After Week 3
- [ ] Production deployed
- [ ] <30% user edit rate (users trust AI)
- [ ] P99 latency <2s
- [ ] Cost ~$5/user/month
- [ ] User feedback positive

---

## Rollback Plan

If something goes wrong, immediately revert:

```bash
# Emergency rollback to gpt-4o-mini (lower quality but stable)
AZURE_OPENAI_ARCHITECT=taskflow-coach

# Or full rollback to previous commit
git revert HEAD
git push origin main
```

**When to rollback:**
- Fake task rate >20% (current is ~30%, o3-mini should be <5%)
- Latency P99 >5s (unacceptable even with animation)
- Cost >$15/user/month (3x budget)
- Critical bugs preventing task creation

---

## Next Actions (Right Now)

### Option 1: Start Implementation (Recommended)
1. Open Azure Portal → Deploy o3-mini
2. Update `.env` with deployment names
3. Modify `azureOpenAIService.ts` (Task 1.3)
4. Test with 5 common tasks
5. Fix iOS audio bug while testing

### Option 2: Research More (If Unsure)
1. Read `AI_MODEL_RESEARCH_2026.md` for complete model analysis
2. Review `TRIPLE_TIER_ARCHITECTURE_PLAN.md` for detailed code
3. Test o3-mini in Azure Portal playground first
4. Come back and implement

### Option 3: Quick Win (iOS Bug Only)
1. Fix iOS audio bug first (1 hour)
2. Deploy and verify fix
3. Then tackle Triple-Tier architecture

---

## Questions to Ask User

Before starting, confirm:

1. **Budget confirmation:** Is $5/user/month acceptable? (You said "품질 최우선" but confirm)
2. **Timeline:** Is 2-3 weeks realistic? Any urgent deadline?
3. **Scope:** Should we do all phases or focus on Week 1 foundation first?
4. **Testing:** Do you have test users available for Week 3 A/B test?

---

## Related Documents

- **AI_MODEL_RESEARCH_2026.md** - Complete model research, benchmarks, case studies
- **TRIPLE_TIER_ARCHITECTURE_PLAN.md** - Full implementation details with code samples
- **PHASE3_WEBSOCKET_PLAN.md** - WebSocket cross-device sync (future feature, rolled back)

---

**Ready to implement?** Start with Week 1, Day 1: Azure Setup (2 hours).

**Need clarification?** Read the detailed documents above.

**Found a bug?** Check "Common Issues & Solutions" section.

Good luck! 🚀
