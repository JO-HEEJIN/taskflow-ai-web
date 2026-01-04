# Triple-Tier AI Architecture Implementation Plan
**Date:** 2026-01-05
**Purpose:** Complete implementation roadmap for quality-first ADHD task breakdown
**Related:** AI_MODEL_RESEARCH_2026.md

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER REQUEST                             │
│              "프로젝트 제안서 작성"                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              TIER 1: ARCHITECT (o3-mini)                     │
│  - Initial task breakdown (3 subtasks)                       │
│  - Native CoT reasoning                                      │
│  - Eliminates "책상 정리" automatically                       │
│  - Latency: 1-2s with ReasoningAnimation                    │
│  - Cost: $0.80/1K tokens                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  3 Value-First Tasks   │
        │  [2min, 5min, 7min]    │
        └────────────┬───────────┘
                     │
         ┌───────────┴────────────┐
         │                        │
         ▼                        ▼
┌─────────────────────┐  ┌──────────────────────────┐
│ TIER 2: COACH       │  │ TIER 3: DEEP DIVE        │
│ (gpt-4o-mini)       │  │ (o3-mini)                │
│                     │  │                          │
│ - Encouragement     │  │ - Triggered when user    │
│ - Quick tips        │  │   hits 10+ min task      │
│ - Chat responses    │  │ - Recursive breakdown    │
│ - Latency: 200-300ms│  │ - Creates follow-up task │
│ - Cost: $0.10/1K    │  │ - Parent-child linking   │
└─────────────────────┘  └──────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Backend Foundation (Week 1)

#### Task 1.1: Deploy Azure OpenAI Models
**Status:** ⏳ Not Started
**Time Estimate:** 2 hours

**Steps:**
1. Login to Azure Portal
2. Navigate to Azure OpenAI Service → Deployments
3. Create deployments:
   - `taskflow-architect` → o3-mini (TPM: 50,000)
   - `taskflow-coach` → gpt-4o-mini (TPM: 100,000)
   - `taskflow-fallback` → gpt-4o (TPM: 30,000)
4. Copy deployment names and endpoint
5. Add to environment variables

**Verification:**
```bash
curl https://taskflow-ai-prod.openai.azure.com/openai/deployments/taskflow-architect/chat/completions \
  -H "api-key: $AZURE_OPENAI_API_KEY" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

---

#### Task 1.2: Update Environment Variables
**Status:** ⏳ Not Started
**Time Estimate:** 10 minutes

**Files to Modify:**
- `backend/.env.production`
- `backend/.env.development`

```bash
# Azure OpenAI Triple-Tier Configuration
AZURE_OPENAI_ENDPOINT=https://taskflow-ai-prod.openai.azure.com/
AZURE_OPENAI_API_KEY=<secret>

# Model Deployment Names
AZURE_OPENAI_ARCHITECT=taskflow-architect
AZURE_OPENAI_COACH=taskflow-coach
AZURE_OPENAI_DEEPDIVE=taskflow-architect  # Same model, different prompts
AZURE_OPENAI_FALLBACK=taskflow-fallback

# Feature Flags
ENABLE_O3_MINI=true
ENABLE_REASONING_ANIMATION=true
```

---

#### Task 1.3: Refactor azureOpenAIService.ts
**Status:** ⏳ Not Started
**Time Estimate:** 4 hours
**File:** `backend/src/services/azureOpenAIService.ts`

**Implementation:**

```typescript
import { AzureOpenAI } from '@azure/openai';
import type { ChatCompletionMessageParam } from '@azure/openai/types';

interface ModelConfig {
  architect: string;
  coach: string;
  deepDive: string;
  fallback: string;
}

interface BreakdownResult {
  subtasks: Array<{
    title: string;
    estimatedMinutes: number;
    reasoning?: string;
  }>;
  metadata: {
    model: string;
    latencyMs: number;
    tokensUsed: number;
    costUSD: number;
  };
}

class AzureOpenAIService {
  private client: AzureOpenAI;
  private models: ModelConfig;

  constructor() {
    this.client = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: '2024-08-01-preview',
    });

    this.models = {
      architect: process.env.AZURE_OPENAI_ARCHITECT || 'taskflow-architect',
      coach: process.env.AZURE_OPENAI_COACH || 'taskflow-coach',
      deepDive: process.env.AZURE_OPENAI_DEEPDIVE || 'taskflow-architect',
      fallback: process.env.AZURE_OPENAI_FALLBACK || 'taskflow-fallback',
    };
  }

  /**
   * [TIER 1] ARCHITECT: Initial task breakdown using o3-mini
   * Eliminates "책상 정리" automatically via native reasoning
   */
  async breakdownTask(
    taskTitle: string,
    taskDescription?: string,
    userId?: string
  ): Promise<BreakdownResult> {
    const startTime = Date.now();
    const modelUsed = this.models.architect;

    const systemPrompt = this.getArchitectSystemPrompt();
    const userPrompt = this.buildArchitectUserPrompt(taskTitle, taskDescription);

    try {
      const response = await this.client.getChatCompletions(
        modelUsed,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.2,
          maxTokens: 800,
          responseFormat: { type: 'json_object' },
        }
      );

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Architect model');
      }

      const parsed = JSON.parse(content);
      const tokensUsed = response.usage?.totalTokens || 0;
      const costUSD = this.calculateCost(modelUsed, tokensUsed);

      // Log for monitoring
      await this.logBreakdown({
        userId,
        taskTitle,
        model: modelUsed,
        latencyMs,
        tokensUsed,
        costUSD,
        subtasks: parsed.subtasks,
      });

      return {
        subtasks: parsed.subtasks,
        metadata: {
          model: modelUsed,
          latencyMs,
          tokensUsed,
          costUSD,
        },
      };
    } catch (error) {
      console.error('Architect model failed, falling back to gpt-4o:', error);
      return this.fallbackBreakdown(taskTitle, taskDescription, userId);
    }
  }

  /**
   * [TIER 2] COACH: Quick encouragement and tips using gpt-4o-mini
   */
  async generateEncouragement(
    context: string,
    subtaskTitle?: string
  ): Promise<string> {
    const startTime = Date.now();

    const systemPrompt = `You are a supportive ADHD coach. Give brief, encouraging feedback (1-2 sentences).
Focus on progress and momentum, not perfection.`;

    const userPrompt = subtaskTitle
      ? `User is about to start: "${subtaskTitle}". Give quick encouragement.`
      : `Context: ${context}. Give quick encouragement.`;

    const response = await this.client.getChatCompletions(
      this.models.coach,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        maxTokens: 150,
      }
    );

    console.log(`Coach latency: ${Date.now() - startTime}ms`);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * [TIER 3] DEEP DIVE: Recursive breakdown for 10+ minute tasks
   */
  async deepBreakdownSubtask(
    subtaskTitle: string,
    parentContext: string,
    userId?: string
  ): Promise<BreakdownResult> {
    const startTime = Date.now();
    const modelUsed = this.models.deepDive;

    const systemPrompt = `You are an ADHD Task Architect for Deep Dive breakdown.

User is stuck on a subtask that takes >10 minutes.
Break it into 3-5 micro-steps (2-5 minutes each).
First step must create immediate value in <2 minutes.

OUTPUT FORMAT (JSON):
{
  "subtasks": [
    {
      "title": "구체적 행동 + 결과물",
      "estimatedMinutes": number
    }
  ]
}`;

    const userPrompt = `Parent Task: "${parentContext}"
Current Subtask (user is stuck): "${subtaskTitle}"

Break this into 3-5 micro-steps. First step must be completable in 2 minutes and create tangible output.`;

    try {
      const response = await this.client.getChatCompletions(
        modelUsed,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.2,
          maxTokens: 600,
          responseFormat: { type: 'json_object' },
        }
      );

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Deep Dive model');
      }

      const parsed = JSON.parse(content);
      const tokensUsed = response.usage?.totalTokens || 0;
      const costUSD = this.calculateCost(modelUsed, tokensUsed);

      return {
        subtasks: parsed.subtasks,
        metadata: {
          model: modelUsed,
          latencyMs,
          tokensUsed,
          costUSD,
        },
      };
    } catch (error) {
      console.error('Deep Dive failed:', error);
      throw error;
    }
  }

  /**
   * Fallback to gpt-4o when o3-mini fails
   */
  private async fallbackBreakdown(
    taskTitle: string,
    taskDescription?: string,
    userId?: string
  ): Promise<BreakdownResult> {
    const startTime = Date.now();
    const modelUsed = this.models.fallback;

    // Use extensive Few-Shot prompting for gpt-4o
    const systemPrompt = this.getArchitectSystemPrompt();
    const userPrompt = this.buildArchitectUserPrompt(taskTitle, taskDescription);

    const response = await this.client.getChatCompletions(
      modelUsed,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.2,
        maxTokens: 800,
        responseFormat: { type: 'json_object' },
      }
    );

    const latencyMs = Date.now() - startTime;
    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(content || '{}');
    const tokensUsed = response.usage?.totalTokens || 0;
    const costUSD = this.calculateCost(modelUsed, tokensUsed);

    console.warn(`Used fallback model ${modelUsed} for task: ${taskTitle}`);

    return {
      subtasks: parsed.subtasks,
      metadata: {
        model: modelUsed,
        latencyMs,
        tokensUsed,
        costUSD,
      },
    };
  }

  /**
   * System prompt for Architect role
   */
  private getArchitectSystemPrompt(): string {
    return `You are an ADHD Task Architect using Cognitive Shuffling methodology.

CORE PRINCIPLE: Create IMMEDIATE, IRREVERSIBLE value in first step.

IRREVERSIBILITY TEST:
- ❌ PREPARATION: Can be undone without output (책상 정리, 노트북 켜기, 자료 모으기, 템플릿 찾기)
- ✅ VALUE-FIRST: Creates artifact (문장 작성, 선 그리기, 파일 생성, 코드 작성)

CRITICAL RULES:
1. Output exactly 3 subtasks in JSON
2. First task MUST create value in <2 minutes
3. Total estimated time: 15-25 minutes
4. Each task builds on previous output
5. NEVER suggest: 준비, 세팅, 정리, 찾기, 모으기, 확인, 검색, 열기

EXAMPLES:

Task: "프로젝트 제안서 작성"
❌ BAD:
{
  "subtasks": [
    {"title": "책상 정리 및 집중 환경 만들기", "estimatedMinutes": 5},
    {"title": "관련 자료 모으기", "estimatedMinutes": 10},
    {"title": "개요 작성", "estimatedMinutes": 15}
  ]
}

✅ GOOD:
{
  "subtasks": [
    {"title": "핵심 메시지 1문장 작성 (목표/문제/해결책)", "estimatedMinutes": 2},
    {"title": "3가지 핵심 근거 bullet point 작성", "estimatedMinutes": 5},
    {"title": "서론 초안 200자 작성 (bullet을 이용한 흐름)", "estimatedMinutes": 7}
  ]
}

Task: "운동 루틴 시작"
❌ BAD:
{
  "subtasks": [
    {"title": "운동복 챙기기", "estimatedMinutes": 3},
    {"title": "운동 계획 검색하기", "estimatedMinutes": 5},
    {"title": "첫 운동 시작", "estimatedMinutes": 10}
  ]
}

✅ GOOD:
{
  "subtasks": [
    {"title": "제자리에서 스쿼트 5회 (지금 바로)", "estimatedMinutes": 1},
    {"title": "플랭크 20초 유지", "estimatedMinutes": 2},
    {"title": "간단한 스트레칭 3가지 (팔, 다리, 허리)", "estimatedMinutes": 5}
  ]
}

Task: "블로그 포스트 작성"
❌ BAD:
{
  "subtasks": [
    {"title": "주제 조사 및 자료 수집", "estimatedMinutes": 15},
    {"title": "아웃라인 구성", "estimatedMinutes": 10},
    {"title": "본문 작성", "estimatedMinutes": 30}
  ]
}

✅ GOOD:
{
  "subtasks": [
    {"title": "핵심 주장 1문장 + 이유 3가지 메모", "estimatedMinutes": 3},
    {"title": "도입부 2문단 작성 (주장 + 배경)", "estimatedMinutes": 7},
    {"title": "첫 번째 근거 설명 3문단 작성", "estimatedMinutes": 10}
  ]
}

OUTPUT FORMAT:
{
  "subtasks": [
    {
      "title": "구체적 행동 + 결과물",
      "estimatedMinutes": number
    }
  ]
}`;
  }

  /**
   * Build user prompt for Architect
   */
  private buildArchitectUserPrompt(
    taskTitle: string,
    taskDescription?: string
  ): string {
    return `Task: "${taskTitle}"
${taskDescription ? `Context: ${taskDescription}` : ''}

Create 3 micro-tasks. First step must be completable in <2 minutes and create tangible output.
Output JSON only.`;
  }

  /**
   * Calculate cost based on model and tokens
   */
  private calculateCost(model: string, tokens: number): number {
    const pricing: Record<string, number> = {
      'taskflow-architect': 0.80 / 1000, // o3-mini: $0.80 per 1K tokens
      'taskflow-coach': 0.10 / 1000, // gpt-4o-mini: $0.10 per 1K tokens
      'taskflow-fallback': 0.60 / 1000, // gpt-4o: $0.60 per 1K tokens (average)
    };

    const rate = pricing[model] || 0.50 / 1000;
    return tokens * rate;
  }

  /**
   * Log breakdown for monitoring
   */
  private async logBreakdown(data: {
    userId?: string;
    taskTitle: string;
    model: string;
    latencyMs: number;
    tokensUsed: number;
    costUSD: number;
    subtasks: any[];
  }): Promise<void> {
    // TODO: Implement logging to Cosmos DB or Application Insights
    console.log('Breakdown Log:', {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
}

export const azureOpenAIService = new AzureOpenAIService();
```

**Testing:**
```bash
npm run test -- azureOpenAIService.test.ts
```

---

### Phase 2: Frontend UX (Week 1)

#### Task 2.1: Create ReasoningAnimation Component
**Status:** ⏳ Not Started
**Time Estimate:** 2 hours
**File:** `frontend/components/loading/ReasoningAnimation.tsx` (NEW)

**Implementation:**

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Target, Brain, Trash2, Zap } from 'lucide-react';

interface ReasoningStep {
  text: string;
  icon: typeof Target;
  duration: number;
}

const REASONING_STEPS: ReasoningStep[] = [
  { text: 'Analyzing core value...', icon: Target, duration: 400 },
  { text: 'Detecting mental blocks...', icon: Brain, duration: 500 },
  { text: 'Eliminating fake tasks...', icon: Trash2, duration: 600 },
  { text: 'Creating micro-actions...', icon: Zap, duration: 500 },
];

export function ReasoningAnimation() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= REASONING_STEPS.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, REASONING_STEPS[currentStep].duration);

    return () => clearTimeout(timer);
  }, [currentStep]);

  const step = REASONING_STEPS[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / REASONING_STEPS.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Animated Icon */}
      <motion.div
        key={currentStep}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.2, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="p-6 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
          <Icon className="w-16 h-16 text-purple-400" />
        </div>
      </motion.div>

      {/* Step Text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={currentStep}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="text-xl font-medium text-white mb-8"
        >
          {step.text}
        </motion.p>
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="w-full max-w-md">
        <div className="h-2 bg-purple-900/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mt-4">
          {REASONING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index <= currentStep ? 'bg-purple-400' : 'bg-purple-900/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Subtext */}
      <p className="text-sm text-purple-300/60 mt-6">
        Using advanced reasoning to create quality tasks...
      </p>
    </div>
  );
}
```

**Usage:**
```typescript
// In task breakdown page
import { ReasoningAnimation } from '@/components/loading/ReasoningAnimation';

function TaskBreakdownPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleBreakdown = async () => {
    setIsLoading(true);
    const result = await api.breakdownTask(taskTitle);
    setIsLoading(false);
  };

  if (isLoading) {
    return <ReasoningAnimation />;
  }

  // ... rest of component
}
```

---

#### Task 2.2: Update API Client with Model Metadata
**Status:** ⏳ Not Started
**Time Estimate:** 1 hour
**File:** `frontend/lib/api/tasks.ts`

**Implementation:**

```typescript
interface BreakdownResponse {
  subtasks: Subtask[];
  metadata: {
    model: string;
    latencyMs: number;
    tokensUsed: number;
    costUSD: number;
  };
}

export async function breakdownTask(
  taskTitle: string,
  taskDescription?: string
): Promise<BreakdownResponse> {
  const response = await fetch('/api/tasks/breakdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskTitle, taskDescription }),
  });

  if (!response.ok) {
    throw new Error('Failed to breakdown task');
  }

  return response.json();
}
```

---

### Phase 3: Deep Dive Feature (Week 2)

#### Task 3.1: Update Database Schema for Parent-Child Tasks
**Status:** ⏳ Not Started
**Time Estimate:** 2 hours
**File:** `backend/src/types/index.ts`

**Implementation:**

```typescript
interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subtasks: Subtask[];
  status: 'active' | 'completed' | 'archived';
  createdAt: number;
  updatedAt: number;

  // 🆕 Follow-up task tracking
  parentTaskId?: string; // ID of parent task (if this is a follow-up)
  parentSubtaskId?: string; // ID of subtask that triggered this
  isFollowUpTask: boolean; // True if created via Deep Dive
  depth: number; // 0=original, 1=1st breakdown, 2=2nd (max)
}

interface Subtask {
  id: string;
  title: string;
  estimatedMinutes: number;
  isCompleted: boolean;
  completedAt?: number;

  // 🆕 Deep Dive state
  hasFollowUpTask: boolean; // True if user created Deep Dive for this
  followUpTaskId?: string; // ID of the follow-up task
}
```

**Migration:**
```typescript
// Run in backend/src/migrations/
async function addFollowUpFields() {
  const tasks = await cosmosContainer.items.readAll().fetchAll();

  for (const task of tasks.resources) {
    await cosmosContainer.item(task.id, task.id).replace({
      ...task,
      isFollowUpTask: false,
      depth: 0,
    });
  }

  console.log('Migration complete: Added follow-up fields');
}
```

---

#### Task 3.2: Create DeepDiveModal Component
**Status:** ⏳ Not Started
**Time Estimate:** 3 hours
**File:** `frontend/components/focus/DeepDiveModal.tsx` (NEW)

**Implementation:**

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

interface DeepDiveModalProps {
  isOpen: boolean;
  currentSubtask: {
    id: string;
    title: string;
    estimatedMinutes: number;
  };
  currentTask: {
    id: string;
    title: string;
    depth: number;
  };
  onAccept: () => Promise<void>;
  onDeny: () => void;
}

export function DeepDiveModal({
  isOpen,
  currentSubtask,
  currentTask,
  onAccept,
  onDeny,
}: DeepDiveModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept();
    } catch (error) {
      console.error('Deep Dive failed:', error);
      alert('Failed to break down task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't allow depth > 2 (prevent infinite nesting)
  const isMaxDepth = currentTask.depth >= 2;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            background: 'rgba(10, 5, 20, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative max-w-lg w-full p-8 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 15, 50, 0.98), rgba(50, 25, 80, 0.98))',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              boxShadow: '0 0 50px rgba(192, 132, 252, 0.2)',
            }}
          >
            {/* Close button */}
            <button
              onClick={onDeny}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-purple-300" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-yellow-500/20 border border-yellow-400/30">
                <AlertCircle className="w-12 h-12 text-yellow-400" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              This task seems overwhelming
            </h2>

            {/* Subtask info */}
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-purple-300 mb-2">Current subtask:</p>
              <p className="text-lg font-medium text-white mb-2">
                "{currentSubtask.title}"
              </p>
              <p className="text-sm text-purple-400">
                Estimated time: {currentSubtask.estimatedMinutes} minutes
              </p>
            </div>

            {/* Question */}
            <p className="text-purple-200 text-center mb-8">
              Would you like me to break this down into smaller, easier steps?
            </p>

            {/* Buttons */}
            {isMaxDepth ? (
              <div className="text-center">
                <p className="text-sm text-yellow-400 mb-4">
                  Maximum breakdown depth reached. Try tackling this step directly!
                </p>
                <button
                  onClick={onDeny}
                  className="px-8 py-3 rounded-xl font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                >
                  Got it
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={onDeny}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                >
                  No, I'm Good
                </button>

                <button
                  onClick={handleAccept}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    'Breaking down...'
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Yes, Break it Down
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

#### Task 3.3: Integrate Deep Dive into GalaxyFocusView
**Status:** ⏳ Not Started
**Time Estimate:** 3 hours
**File:** `frontend/components/focus/GalaxyFocusView.tsx`

**Changes:**

```typescript
import { DeepDiveModal } from './DeepDiveModal';
import { useRouter } from 'next/navigation';

export function GalaxyFocusView({ task }: { task: Task }) {
  const router = useRouter();
  const [showDeepDiveModal, setShowDeepDiveModal] = useState(false);
  const [currentSubtaskIndex, setCurrentSubtaskIndex] = useState(0);

  const currentSubtask = task.subtasks[currentSubtaskIndex];

  // Check if current subtask is too long (>10 minutes)
  useEffect(() => {
    if (currentSubtask && currentSubtask.estimatedMinutes >= 10) {
      // Show modal after 2 seconds (give user time to read)
      const timer = setTimeout(() => {
        setShowDeepDiveModal(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentSubtask]);

  const handleDeepDiveAccept = async () => {
    // 1. Call Deep Dive API
    const response = await fetch('/api/tasks/deep-dive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subtaskId: currentSubtask.id,
        subtaskTitle: currentSubtask.title,
        parentTaskId: task.id,
        parentContext: task.title,
      }),
    });

    if (!response.ok) {
      throw new Error('Deep Dive failed');
    }

    const data = await response.json();
    const followUpTask = data.followUpTask;

    // 2. Close modal
    setShowDeepDiveModal(false);

    // 3. Navigate to follow-up task Focus Mode
    router.push(`/focus/${followUpTask.id}`);
  };

  const handleDeepDiveDeny = () => {
    setShowDeepDiveModal(false);
    // User continues with current subtask
  };

  return (
    <div>
      {/* Existing GalaxyFocusView content */}
      {/* ... */}

      {/* Deep Dive Modal */}
      <DeepDiveModal
        isOpen={showDeepDiveModal}
        currentSubtask={currentSubtask}
        currentTask={task}
        onAccept={handleDeepDiveAccept}
        onDeny={handleDeepDiveDeny}
      />
    </div>
  );
}
```

---

#### Task 3.4: Create Deep Dive API Endpoint
**Status:** ⏳ Not Started
**Time Estimate:** 2 hours
**File:** `backend/src/routes/tasks.ts` (NEW ENDPOINT)

**Implementation:**

```typescript
router.post('/deep-dive', async (req, res) => {
  const { subtaskId, subtaskTitle, parentTaskId, parentContext } = req.body;
  const userId = req.user.id;

  try {
    // 1. Get AI breakdown
    const breakdown = await azureOpenAIService.deepBreakdownSubtask(
      subtaskTitle,
      parentContext,
      userId
    );

    // 2. Get parent task to determine depth
    const parentTask = await taskService.getTaskById(parentTaskId, userId);
    const newDepth = (parentTask.depth || 0) + 1;

    if (newDepth > 2) {
      return res.status(400).json({
        error: 'Maximum breakdown depth (2) exceeded',
      });
    }

    // 3. Create follow-up task
    const followUpTask = await taskService.createTask({
      userId,
      title: `🔍 ${subtaskTitle}`,
      description: `Deep dive breakdown from: ${parentContext}`,
      subtasks: breakdown.subtasks,
      parentTaskId,
      parentSubtaskId: subtaskId,
      isFollowUpTask: true,
      depth: newDepth,
    });

    // 4. Update parent subtask to link to follow-up
    await taskService.updateSubtask(parentTaskId, subtaskId, {
      hasFollowUpTask: true,
      followUpTaskId: followUpTask.id,
    });

    res.json({
      followUpTask,
      metadata: breakdown.metadata,
    });
  } catch (error) {
    console.error('Deep Dive error:', error);
    res.status(500).json({ error: 'Failed to create deep dive breakdown' });
  }
});
```

---

### Phase 4: Mobile Edit Mode (Week 2)

#### Task 4.1: Create useBreakdownEditor Hook
**Status:** ⏳ Not Started
**Time Estimate:** 2 hours
**File:** `frontend/hooks/useBreakdownEditor.ts` (NEW)

**Implementation:**

```typescript
import { useState, useCallback } from 'react';

interface Subtask {
  id: string;
  title: string;
  estimatedMinutes: number;
  isCompleted: boolean;
}

interface BreakdownEditorState {
  mode: 'view' | 'edit';
  originalSubtasks: Subtask[];
  editingSubtasks: Subtask[];
  isDirty: boolean;
}

export function useBreakdownEditor(initialSubtasks: Subtask[]) {
  const [state, setState] = useState<BreakdownEditorState>({
    mode: 'view',
    originalSubtasks: initialSubtasks,
    editingSubtasks: initialSubtasks,
    isDirty: false,
  });

  const enterEditMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: 'edit',
      editingSubtasks: [...prev.originalSubtasks],
      isDirty: false,
    }));
  }, []);

  const exitEditMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: 'view',
      editingSubtasks: prev.originalSubtasks,
      isDirty: false,
    }));
  }, []);

  const updateSubtask = useCallback((index: number, updates: Partial<Subtask>) => {
    setState((prev) => ({
      ...prev,
      editingSubtasks: prev.editingSubtasks.map((st, i) =>
        i === index ? { ...st, ...updates } : st
      ),
      isDirty: true,
    }));
  }, []);

  const addSubtask = useCallback((subtask: Subtask) => {
    setState((prev) => ({
      ...prev,
      editingSubtasks: [...prev.editingSubtasks, subtask],
      isDirty: true,
    }));
  }, []);

  const deleteSubtask = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      editingSubtasks: prev.editingSubtasks.filter((_, i) => i !== index),
      isDirty: true,
    }));
  }, []);

  const regenerate = useCallback(async (taskId: string, taskTitle: string) => {
    const response = await fetch('/api/tasks/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle }),
    });

    if (!response.ok) {
      throw new Error('Failed to regenerate');
    }

    const data = await response.json();

    setState((prev) => ({
      ...prev,
      editingSubtasks: data.subtasks,
      isDirty: true,
    }));
  }, []);

  const save = useCallback(async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtasks: state.editingSubtasks }),
    });

    if (!response.ok) {
      throw new Error('Failed to save');
    }

    setState((prev) => ({
      ...prev,
      mode: 'view',
      originalSubtasks: prev.editingSubtasks,
      isDirty: false,
    }));
  }, [state.editingSubtasks]);

  return {
    state,
    actions: {
      enterEditMode,
      exitEditMode,
      updateSubtask,
      addSubtask,
      deleteSubtask,
      regenerate,
      save,
    },
  };
}
```

---

#### Task 4.2: Create SubtaskEditor Component
**Status:** ⏳ Not Started
**Time Estimate:** 3 hours
**File:** `frontend/components/tasks/SubtaskEditor.tsx` (NEW)

**Implementation:**

```typescript
'use client';

import { useState } from 'react';
import { Edit2, Trash2, Plus, RotateCw, Save, X } from 'lucide-react';
import { useBreakdownEditor } from '@/hooks/useBreakdownEditor';

interface SubtaskEditorProps {
  taskId: string;
  taskTitle: string;
  initialSubtasks: Subtask[];
  onSave: () => void;
}

export function SubtaskEditor({
  taskId,
  taskTitle,
  initialSubtasks,
  onSave,
}: SubtaskEditorProps) {
  const { state, actions } = useBreakdownEditor(initialSubtasks);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await actions.regenerate(taskId, taskTitle);
    } catch (error) {
      alert('Failed to regenerate. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      await actions.save(taskId);
      onSave();
    } catch (error) {
      alert('Failed to save changes. Please try again.');
    }
  };

  if (state.mode === 'view') {
    return (
      <div>
        {/* View mode - show edit button */}
        <button
          onClick={actions.enterEditMode}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit Subtasks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Edit Subtasks</h3>

        <div className="flex gap-2">
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>

          <button
            onClick={actions.exitEditMode}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!state.isDirty}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Editable subtask list */}
      <div className="space-y-3">
        {state.editingSubtasks.map((subtask, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={subtask.title}
                  onChange={(e) =>
                    actions.updateSubtask(index, { title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400"
                  placeholder="Subtask title"
                />

                <input
                  type="number"
                  value={subtask.estimatedMinutes}
                  onChange={(e) =>
                    actions.updateSubtask(index, {
                      estimatedMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
                  min={1}
                  max={60}
                />
                <span className="text-sm text-purple-300 ml-2">minutes</span>
              </div>

              <button
                onClick={() => actions.deleteSubtask(index)}
                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new subtask */}
      <button
        onClick={() =>
          actions.addSubtask({
            id: `temp-${Date.now()}`,
            title: '',
            estimatedMinutes: 5,
            isCompleted: false,
          })
        }
        className="w-full py-3 rounded-xl border-2 border-dashed border-purple-400/30 hover:border-purple-400/60 text-purple-300 hover:text-purple-200 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Subtask
      </button>
    </div>
  );
}
```

---

### Phase 5: Bug Fixes (Week 1-2)

#### Task 5.1: Fix iOS Audio Bug - Timer Completion Sound
**Status:** ⏳ Not Started
**Time Estimate:** 1 hour
**File:** `frontend/hooks/useReliableTimer.ts`

**Changes:**

```typescript
export function useReliableTimer({ durationMinutes, subtaskId, taskId, onComplete }) {
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);

  const isCompletedRef = useRef(false);
  const hasEverStartedRef = useRef(false); // 🆕 Track if timer was actually started

  // 1. Reset on subtask change
  useEffect(() => {
    console.log(`⏰ Timer Reset for subtask: ${subtaskId}`);
    isCompletedRef.current = false;
    hasEverStartedRef.current = false; // 🆕 Reset started flag

    const durationSec = durationMinutes * 60;
    setTimeLeft(durationSec);

    const now = Date.now();
    const newTarget = now + (durationSec * 1000);
    setTargetTime(newTarget);
    setIsRunning(false);

    return () => {
      soundManager.stopHeartbeat();
    };
  }, [subtaskId, durationMinutes]);

  // 2. Tick loop
  useEffect(() => {
    if (!isRunning || !targetTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((targetTime - now) / 1000);

      if (remaining <= 0) {
        setTimeLeft(0);
        setIsRunning(false);
        clearInterval(interval);

        // 🆕 Bug fix: Only complete if timer was actually started
        if (!isCompletedRef.current && hasEverStartedRef.current) {
          isCompletedRef.current = true;
          handleCompletion();
        } else if (!hasEverStartedRef.current) {
          console.warn('⚠️ Timer completed without ever starting - no notification');
        }
      } else {
        setTimeLeft(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, targetTime]);

  const handleCompletion = useCallback(async () => {
    console.log('🎉 Timer Completed!');
    soundManager.stopHeartbeat();

    try {
      await soundManager.play('timer-complete');
      console.log('✅ Timer completion sound played successfully');
    } catch (error) {
      console.error('❌ Failed to play timer completion sound:', error);
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    onComplete();
  }, [onComplete]);

  const startTimer = useCallback(() => {
    if (!targetTime) return;

    if (!isRunning && timeLeft > 0) {
      const now = Date.now();
      const newTarget = now + (timeLeft * 1000);
      setTargetTime(newTarget);
      console.log(`▶️  Timer Started: Target ${new Date(newTarget).toLocaleTimeString()}`);
    }

    hasEverStartedRef.current = true; // 🆕 Mark as started
    soundManager.startHeartbeat();
    setIsRunning(true);
  }, [isRunning, timeLeft, targetTime]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    soundManager.stopHeartbeat();
    console.log('⏸️  Timer Paused');
  }, []);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isRunning, pauseTimer, startTimer]);

  return {
    timeLeft,
    isRunning,
    startTimer,
    pauseTimer,
    toggleTimer,
  };
}
```

---

#### Task 5.2: Fix iOS Audio Bug - Remove Warm-up Playback
**Status:** ⏳ Not Started
**Time Estimate:** 30 minutes
**File:** `frontend/lib/SoundManager.ts`

**Changes:**

```typescript
public async unlockAudio() {
  if (!this.context) this.init();
  if (!this.context) return;

  console.log('🔑 Starting iOS-compatible audio unlock...');

  // 1. Resume AudioContext if suspended
  if (this.context.state === 'suspended') {
    try {
      await this.context.resume();
      console.log('🔄 AudioContext resumed from suspended state');
    } catch (e) {
      console.error('Audio resume failed:', e);
    }
  }

  // 2. Play silent buffer (required for iOS unlock)
  const silentBuffer = this.context.createBuffer(1, 1, 22050);
  const silentSource = this.context.createBufferSource();
  silentSource.buffer = silentBuffer;
  silentSource.connect(this.context.destination);
  silentSource.start(0);
  console.log('✅ Silent buffer played (context unlocked)');

  // 3. 🆕 Load timer-complete file WITHOUT playing
  // iOS will allow playback later because AudioContext is already unlocked
  try {
    const timerBuffer = this.buffers.get('timer-complete');

    if (!timerBuffer) {
      console.log('📥 Loading timer-complete.mp3 (no playback)...');
      const url = this.soundManifest['timer-complete'];
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set('timer-complete', audioBuffer);
      console.log('✅ timer-complete.mp3 loaded (ready for playback)');
    }

    // 🚫 REMOVED: Warm-up playback at volume 0 (was causing sound leak)
    // iOS AudioContext unlock is sufficient for later playback
  } catch (error) {
    console.error('❌ Failed to load timer-complete.mp3:', error);
  }

  this.isUnlocked = true;
  console.log('🔊 Audio Engine Fully Unlocked');
}
```

---

## Testing Plan

### Unit Tests

```bash
# Backend
npm run test -- azureOpenAIService.test.ts
npm run test -- taskService.test.ts

# Frontend
npm run test -- useBreakdownEditor.test.ts
npm run test -- useReliableTimer.test.ts
```

### Integration Tests

**Test Case 1: Architect Quality**
```typescript
test('o3-mini eliminates fake tasks', async () => {
  const tasks = [
    '프로젝트 제안서 작성',
    '운동 루틴 시작',
    '블로그 포스트 작성',
    '이력서 업데이트',
    '방 청소',
  ];

  for (const taskTitle of tasks) {
    const result = await azureOpenAIService.breakdownTask(taskTitle);

    // Check no fake task keywords
    const fakeKeywords = ['책상', '정리', '준비', '세팅', '모으기', '찾기', '검색', '열기'];
    result.subtasks.forEach((subtask) => {
      fakeKeywords.forEach((keyword) => {
        expect(subtask.title).not.toContain(keyword);
      });
    });

    // Check first subtask is quick (<3 min)
    expect(result.subtasks[0].estimatedMinutes).toBeLessThanOrEqual(3);
  }
});
```

**Test Case 2: Deep Dive Flow**
```typescript
test('deep dive creates follow-up task with parent link', async () => {
  // 1. Create initial task
  const task = await taskService.createTask({
    userId: 'test-user',
    title: 'Write research paper',
    subtasks: [
      { title: 'Literature review (30 min)', estimatedMinutes: 30 },
    ],
  });

  // 2. Trigger Deep Dive
  const response = await request(app)
    .post('/api/tasks/deep-dive')
    .send({
      subtaskId: task.subtasks[0].id,
      subtaskTitle: task.subtasks[0].title,
      parentTaskId: task.id,
      parentContext: task.title,
    });

  expect(response.status).toBe(200);

  const followUpTask = response.body.followUpTask;
  expect(followUpTask.parentTaskId).toBe(task.id);
  expect(followUpTask.isFollowUpTask).toBe(true);
  expect(followUpTask.depth).toBe(1);
  expect(followUpTask.subtasks.length).toBeGreaterThanOrEqual(3);

  // 3. Verify parent subtask updated
  const updatedTask = await taskService.getTaskById(task.id, 'test-user');
  expect(updatedTask.subtasks[0].hasFollowUpTask).toBe(true);
  expect(updatedTask.subtasks[0].followUpTaskId).toBe(followUpTask.id);
});
```

### Manual Testing Checklist

**Architect Quality (o3-mini):**
- [ ] "프로젝트 제안서 작성" → No "책상 정리" or "자료 모으기"
- [ ] "운동 루틴 시작" → First subtask is actual exercise (<2 min)
- [ ] "블로그 포스트 작성" → First subtask creates text output
- [ ] First subtask always <3 minutes
- [ ] All tasks create tangible output (no preparation only)

**Latency (P99 <2s):**
- [ ] ReasoningAnimation shows during o3-mini processing
- [ ] Animation completes as results arrive (psychological match)
- [ ] No perceived "slowness" complaint from test users

**Deep Dive:**
- [ ] Modal appears when 10+ min subtask encountered
- [ ] "Accept" creates follow-up task with breakdown
- [ ] Parent-child link established correctly
- [ ] Depth limit enforced (max 2)
- [ ] Constellation view shows larger parent node

**Mobile Edit:**
- [ ] Edit mode accessible on mobile
- [ ] Can modify subtask title and duration
- [ ] Can add/delete subtasks
- [ ] Regenerate button works
- [ ] Changes saved correctly

**iOS Audio Bug:**
- [ ] No sound plays before timer starts
- [ ] Completion sound plays reliably after timer ends
- [ ] Vibration works on completion (iOS/Android)

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing complete (all checkboxes above)
- [ ] Azure models deployed and verified
- [ ] Environment variables configured
- [ ] Cost monitoring dashboard set up

### Deployment

- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Verify health checks pass
- [ ] Smoke test: Create 3 tasks, check quality

### Post-Deployment

- [ ] Monitor latency metrics (P50, P95, P99)
- [ ] Monitor cost per request
- [ ] Collect user feedback on task quality
- [ ] A/B test results analysis (if running)

---

## Monitoring Dashboard

### Key Metrics

```typescript
interface MonitoringMetrics {
  // Quality
  fakeTaskRate: number; // % of breakdowns with preparation-only tasks
  userEditRate: number; // % of AI breakdowns edited by user
  taskCompletionRate: number; // % of users who complete first subtask

  // Performance
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;

  // Cost
  costPerBreakdown: number;
  monthlyCostPerUser: number;
  totalMonthlyCost: number;

  // Usage
  breakdownsPerDay: number;
  deepDivesPerDay: number;
  activeUsers: number;
}
```

### Alerts

```yaml
alerts:
  - name: High Fake Task Rate
    condition: fakeTaskRate > 0.10
    severity: high
    action: Investigate prompt or model issue

  - name: Latency Degradation
    condition: latencyP99 > 3000ms
    severity: medium
    action: Check Azure service health

  - name: Cost Overrun
    condition: totalMonthlyCost > 10000
    severity: high
    action: Review usage patterns, consider rate limiting

  - name: Model Failure
    condition: fallback_rate > 0.20
    severity: high
    action: Check o3-mini deployment status
```

---

## Rollback Plan

### If o3-mini Quality Issues

```typescript
// Temporary: Revert to gpt-4o with extensive Few-Shot prompting
AZURE_OPENAI_ARCHITECT=taskflow-fallback  // Use gpt-4o
```

### If Latency Unacceptable

```typescript
// Option 1: Disable ReasoningAnimation (shows raw latency)
ENABLE_REASONING_ANIMATION=false

// Option 2: Switch to gpt-4o (faster, lower quality)
AZURE_OPENAI_ARCHITECT=taskflow-fallback
```

### If Cost Too High

```typescript
// Use gpt-4o-mini for all tasks (sacrifice quality)
AZURE_OPENAI_ARCHITECT=taskflow-coach
AZURE_OPENAI_DEEPDIVE=taskflow-coach
```

---

## Success Criteria

**Week 1 (Foundation):**
- [x] Research complete
- [ ] Azure models deployed
- [ ] Backend Triple-Tier implemented
- [ ] ReasoningAnimation created
- [ ] iOS audio bug fixed

**Week 2 (Deep Dive & Mobile Edit):**
- [ ] Deep Dive modal working
- [ ] Parent-child task linking functional
- [ ] Mobile edit mode complete
- [ ] All manual tests passing

**Week 3 (Testing & Launch):**
- [ ] A/B test launched (200 users)
- [ ] Monitoring dashboard live
- [ ] User feedback collected
- [ ] Full rollout decision

**Success Metrics (After 2 weeks):**
- Fake Task Rate: <5% (vs. current ~30%)
- User Edit Rate: <30% (users trust AI)
- P99 Latency: <2s (with animation)
- Task Completion Rate: >70%
- Cost per user: ~$5/month (acceptable)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-05
**Status:** Ready for Implementation
**Next Action:** Deploy Azure models and implement Task 1.1-1.3
