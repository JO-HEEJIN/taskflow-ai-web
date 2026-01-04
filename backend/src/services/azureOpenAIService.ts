import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import dotenv from 'dotenv';
import { AIBreakdownResponse } from '../types';

dotenv.config();

interface ModelConfig {
  architect: string;
  coach: string;
  deepDive: string;
  fallback: string;
}

interface BreakdownMetadata {
  model: string;
  latencyMs: number;
  tokensUsed: number;
  reasoningTokens?: number;
  costUSD: number;
}

interface EnhancedBreakdownResponse extends AIBreakdownResponse {
  metadata?: BreakdownMetadata;
}

class AzureOpenAIService {
  private client: OpenAIClient | null = null;
  private models: ModelConfig;
  private apiVersion: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
    const apiKey = process.env.AZURE_OPENAI_API_KEY || '';
    this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';

    // Triple-Tier model configuration
    this.models = {
      architect: process.env.AZURE_OPENAI_ARCHITECT || 'o3-mini',
      coach: process.env.AZURE_OPENAI_COACH || 'gpt-4o-mini',
      deepDive: process.env.AZURE_OPENAI_DEEPDIVE || 'o3-mini',
      fallback: process.env.AZURE_OPENAI_FALLBACK || 'gpt-4o-mini',
    };

    if (!endpoint || !apiKey) {
      console.warn('⚠️  Azure OpenAI credentials not configured. AI breakdown will use mock data.');
      return;
    }

    try {
      // Pass API version explicitly in client options
      this.client = new OpenAIClient(
        endpoint,
        new AzureKeyCredential(apiKey),
        {
          apiVersion: this.apiVersion,
        }
      );
      console.log('✅ Azure OpenAI Service initialized (Triple-Tier Architecture)');
      console.log(`   API Version: ${this.apiVersion}`);
      console.log(`   Architect: ${this.models.architect}`);
      console.log(`   Coach: ${this.models.coach}`);
      console.log(`   Deep Dive: ${this.models.deepDive}`);
      console.log(`   Fallback: ${this.models.fallback}`);
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI:', error);
    }
  }

  /**
   * [TIER 1] ARCHITECT: Initial task breakdown using o3-mini
   * Native CoT reasoning eliminates "책상 정리" automatically
   */
  async breakdownTask(
    taskTitle: string,
    taskDescription?: string,
    userId?: string
  ): Promise<EnhancedBreakdownResponse> {
    if (!this.client) {
      return this.getMockBreakdown(taskTitle);
    }

    const startTime = Date.now();
    const modelUsed = this.models.architect;

    try {
      const systemPrompt = this.getArchitectSystemPrompt();
      const userPrompt = this.buildArchitectUserPrompt(taskTitle, taskDescription);

      console.log(`🏗️  [Architect] Breaking down task: "${taskTitle}" with model: ${modelUsed}`);

      const response = await this.client.getChatCompletions(
        modelUsed,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        this.getModelOptions(modelUsed, 800)
      );

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Architect model');
      }

      // Parse JSON response
      const parsed = JSON.parse(content);
      const subtasks = parsed.subtasks || parsed;

      // Calculate tokens and cost
      const usage = response.usage;
      const tokensUsed = usage?.totalTokens || 0;
      const reasoningTokens = (usage as any)?.completionTokensDetails?.reasoningTokens || 0;
      const costUSD = this.calculateCost(modelUsed, tokensUsed);

      console.log(`✅ [Architect] Completed in ${latencyMs}ms, ${tokensUsed} tokens ($${costUSD.toFixed(4)})`);
      if (reasoningTokens > 0) {
        console.log(`   💭 Reasoning tokens: ${reasoningTokens}`);
      }

      // Log for monitoring
      this.logBreakdown({
        userId,
        taskTitle,
        model: modelUsed,
        latencyMs,
        tokensUsed,
        reasoningTokens,
        costUSD,
        subtasks,
      });

      return {
        subtasks: subtasks.map((st: any, index: number) => ({
          title: st.title || String(st),
          order: st.order ?? index,
          estimatedMinutes: st.estimatedMinutes || 5,
          stepType: st.stepType || 'mental',
        })),
        metadata: {
          model: modelUsed,
          latencyMs,
          tokensUsed,
          reasoningTokens,
          costUSD,
        },
      };
    } catch (error) {
      console.error('❌ [Architect] Error:', error);
      console.log(`🔄 Falling back to ${this.models.fallback}`);
      return this.fallbackBreakdown(taskTitle, taskDescription, userId);
    }
  }

  /**
   * [TIER 2] COACH: Quick encouragement and tips using gpt-4o-mini
   */
  async generateEncouragement(
    completedSubtask: { title: string; estimatedMinutes?: number },
    nextSubtask: { title: string; estimatedMinutes?: number } | null,
    progress: { completed: number; total: number }
  ): Promise<string> {
    if (!this.client) {
      return this.getMockEncouragement(progress);
    }

    const modelUsed = this.models.coach;

    try {
      const completedMinutes = completedSubtask.estimatedMinutes || 5;
      const nextMinutes = nextSubtask?.estimatedMinutes || 5;

      const prompt = nextSubtask
        ? `The user just completed: "${completedSubtask.title}" (${completedMinutes} min)

Next up: "${nextSubtask.title}" (${nextMinutes} min)

Progress: ${progress.completed}/${progress.total} subtasks done.

Provide a SHORT (1-2 sentences) encouraging message that:
1. Celebrates the completion with genuine excitement
2. Mentions the EXACT time for the next task: "${nextMinutes} minutes"
3. Creates urgency to start immediately
4. Uses ADHD-friendly language (concrete, action-oriented, no fluff)

CRITICAL: You MUST say "Now focus for ${nextMinutes} minutes!" or similar to match the timer.

Return ONLY the message text, no JSON, no formatting.`
        : `The user just completed the final subtask: "${completedSubtask.title}"

All ${progress.total} subtasks are now complete!

Provide a SHORT (1-2 sentences) celebration message that:
1. Celebrates the entire task completion with genuine excitement
2. Acknowledges their focus and persistence
3. Uses ADHD-friendly language (concrete, energetic)

Return ONLY the message text, no JSON, no formatting.`;

      console.log(`💬 [Coach] Generating encouragement with model: ${modelUsed}`);

      const response = await this.client.getChatCompletions(
        modelUsed,
        [
          {
            role: 'system',
            content:
              'You are an energetic ADHD coach. Be brief, enthusiastic, and action-oriented. Keep responses to 1-2 sentences max.',
          },
          { role: 'user', content: prompt },
        ],
        this.getModelOptions(modelUsed, 100, 0.9)
      );

      const message = response.choices[0]?.message?.content;
      return message || this.getMockEncouragement(progress);
    } catch (error) {
      console.error('❌ [Coach] Error generating encouragement:', error);
      return this.getMockEncouragement(progress);
    }
  }

  /**
   * [TIER 3] DEEP DIVE: Recursive breakdown for 10+ minute tasks
   */
  async deepBreakdownSubtask(
    subtaskTitle: string,
    parentContext: string,
    userId?: string
  ): Promise<EnhancedBreakdownResponse> {
    if (!this.client) {
      return this.getMockBreakdown(subtaskTitle);
    }

    const startTime = Date.now();
    const modelUsed = this.models.deepDive;

    try {
      const systemPrompt = `You are an ADHD Task Architect for Deep Dive breakdown.

User is stuck on a subtask that takes >10 minutes.
Break it into 3-5 micro-steps (2-5 minutes each).
First step must create immediate value in <2 minutes.

CRITICAL RULES:
1. Output 3-5 subtasks in JSON array
2. First task MUST create value in <2 minutes
3. Each task builds on previous output
4. NEVER suggest: 준비, 세팅, 정리, 찾기, 모으기, 확인, 검색, 열기

OUTPUT FORMAT (JSON only):
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

Break this into 3-5 micro-steps. First step must be completable in 2 minutes and create tangible output.
Return ONLY JSON.`;

      console.log(`🔍 [Deep Dive] Breaking down: "${subtaskTitle}" with model: ${modelUsed}`);

      const response = await this.client.getChatCompletions(
        modelUsed,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        this.getModelOptions(modelUsed, 600)
      );

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Deep Dive model');
      }

      const parsed = JSON.parse(content);
      const subtasks = parsed.subtasks || parsed;

      const usage = response.usage;
      const tokensUsed = usage?.totalTokens || 0;
      const reasoningTokens = (usage as any)?.completionTokensDetails?.reasoningTokens || 0;
      const costUSD = this.calculateCost(modelUsed, tokensUsed);

      console.log(`✅ [Deep Dive] Completed in ${latencyMs}ms, ${tokensUsed} tokens ($${costUSD.toFixed(4)})`);

      return {
        subtasks: subtasks.map((st: any, index: number) => ({
          title: st.title || String(st),
          order: index,
          estimatedMinutes: st.estimatedMinutes || 5,
          stepType: 'mental',
        })),
        metadata: {
          model: modelUsed,
          latencyMs,
          tokensUsed,
          reasoningTokens,
          costUSD,
        },
      };
    } catch (error) {
      console.error('❌ [Deep Dive] Error:', error);
      throw error;
    }
  }

  /**
   * Chat with ADHD Coach (uses Coach tier)
   */
  async chatWithCoach(
    userMessage: string,
    taskTitle?: string,
    subtaskTitle?: string,
    conversationHistory: Array<{ role: 'user' | 'ai'; content: string }> = []
  ): Promise<string> {
    if (!this.client) {
      return this.getMockCoachResponse();
    }

    const modelUsed = this.models.coach;

    try {
      const contextInfo = [];
      if (taskTitle) {
        contextInfo.push(`Current task: "${taskTitle}"`);
      }
      if (subtaskTitle) {
        contextInfo.push(`Current subtask: "${subtaskTitle}"`);
      }

      const systemPrompt = `You are an ADHD coach helping someone stay focused and productive.

Context:
${contextInfo.length > 0 ? contextInfo.join('\n') : 'No active task'}

Your role:
- Be warm, encouraging, and action-oriented
- Keep responses brief (2-3 sentences max)
- Give concrete, specific advice
- Acknowledge emotions without judgment
- Help them break through blocks
- Use ADHD-friendly language (no fluff)

Important:
- Don't lecture or be preachy
- Don't give vague advice like "just focus"
- Do ask clarifying questions if needed
- Do celebrate small wins
- Do provide specific next steps`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.map((msg) => ({
          role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
        })),
        { role: 'user' as const, content: userMessage },
      ];

      const response = await this.client.getChatCompletions(
        modelUsed,
        messages,
        this.getModelOptions(modelUsed, 150, 0.8)
      );

      const coachResponse = response.choices[0]?.message?.content;
      return coachResponse || this.getMockCoachResponse();
    } catch (error) {
      console.error('❌ [Coach] Error in chat:', error);
      return this.getMockCoachResponse();
    }
  }

  /**
   * Fallback to gpt-4o-mini when o3-mini fails
   */
  private async fallbackBreakdown(
    taskTitle: string,
    taskDescription?: string,
    userId?: string
  ): Promise<EnhancedBreakdownResponse> {
    const startTime = Date.now();
    const modelUsed = this.models.fallback;

    try {
      // Use Architect prompt even with fallback model
      const systemPrompt = this.getArchitectSystemPrompt();
      const userPrompt = this.buildArchitectUserPrompt(taskTitle, taskDescription);

      const response = await this.client!.getChatCompletions(
        modelUsed,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        this.getModelOptions(modelUsed, 800)
      );

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;
      const parsed = JSON.parse(content || '{"subtasks":[]}');
      const subtasks = parsed.subtasks || parsed;

      const usage = response.usage;
      const tokensUsed = usage?.totalTokens || 0;
      const costUSD = this.calculateCost(modelUsed, tokensUsed);

      console.log(`✅ [Fallback] Used ${modelUsed}: ${latencyMs}ms, ${tokensUsed} tokens`);

      return {
        subtasks: subtasks.map((st: any, index: number) => ({
          title: st.title || String(st),
          order: index,
          estimatedMinutes: st.estimatedMinutes || 5,
          stepType: st.stepType || 'mental',
        })),
        metadata: {
          model: modelUsed,
          latencyMs,
          tokensUsed,
          costUSD,
        },
      };
    } catch (error) {
      console.error('❌ [Fallback] Also failed:', error);
      return this.getMockBreakdown(taskTitle);
    }
  }

  /**
   * Get Architect system prompt (eliminates "책상 정리" problem)
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
  private buildArchitectUserPrompt(title: string, description?: string): string {
    return `Task: "${title}"
${description ? `Context: ${description}` : ''}

Create 3 micro-tasks. First step must be completable in <2 minutes and create tangible output.
Output JSON only.`;
  }

  /**
   * Get model-specific options (handles o-series vs GPT-4o differences)
   */
  private getModelOptions(
    modelName: string,
    maxTokens: number,
    temperature: number = 0.2
  ): any {
    const isOSeries = modelName.includes('o3') || modelName.includes('o1');

    if (isOSeries) {
      // o-series uses max_completion_tokens and does NOT support temperature
      return {
        maxCompletionTokens: maxTokens,
      };
    } else {
      // GPT-4o series uses max_tokens and supports temperature
      return {
        temperature,
        maxTokens,
      };
    }
  }

  /**
   * Calculate cost based on model and tokens
   */
  private calculateCost(model: string, tokens: number): number {
    const pricing: Record<string, number> = {
      'o3-mini': 0.8 / 1000, // $0.80 per 1K tokens (includes reasoning)
      'gpt-4o-mini': 0.1 / 1000, // $0.10 per 1K tokens
      'gpt-4o': 0.6 / 1000, // ~$0.60 per 1K tokens (average)
    };

    // Find matching pricing
    let rate = 0.5 / 1000; // Default fallback
    for (const [key, value] of Object.entries(pricing)) {
      if (model.includes(key)) {
        rate = value;
        break;
      }
    }

    return tokens * rate;
  }

  /**
   * Log breakdown for monitoring
   */
  private logBreakdown(data: {
    userId?: string;
    taskTitle: string;
    model: string;
    latencyMs: number;
    tokensUsed: number;
    reasoningTokens?: number;
    costUSD: number;
    subtasks: any[];
  }): void {
    // TODO: Implement logging to Cosmos DB or Application Insights
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...data,
      firstSubtaskTitle: data.subtasks[0]?.title,
      subtaskCount: data.subtasks.length,
    };

    // For now, just console log (can be extended to proper logging service)
    console.log('📊 [Breakdown Log]', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Mock breakdown fallback
   */
  private getMockBreakdown(taskTitle: string): AIBreakdownResponse {
    console.log('⚠️  Using mock breakdown (OpenAI not configured)');

    // Value-first mock (NO "책상 정리"!)
    const mockSubtasks = [
      {
        title: `"${taskTitle}"의 핵심 목표 1문장 작성`,
        order: 0,
        estimatedMinutes: 2,
        stepType: 'mental' as const,
      },
      {
        title: `첫 번째 구체적 행동 실행`,
        order: 1,
        estimatedMinutes: 7,
        stepType: 'creative' as const,
      },
      {
        title: `결과물 확인 및 다음 단계 메모`,
        order: 2,
        estimatedMinutes: 5,
        stepType: 'mental' as const,
      },
    ];

    return { subtasks: mockSubtasks };
  }

  /**
   * Mock encouragement fallback
   */
  private getMockEncouragement(progress: { completed: number; total: number }): string {
    const messages = [
      "Amazing work! Let's keep the momentum going!",
      "You're crushing it! Next one won't know what hit it!",
      "Yes! That's how it's done! Ready for the next challenge?",
      "Boom! Another one down! You're unstoppable!",
      "Fantastic! You're on fire today!",
    ];

    if (progress.completed === progress.total) {
      return "Mission accomplished! You absolutely crushed every single task!";
    }

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Mock coach response fallback
   */
  private getMockCoachResponse(): string {
    const responses = [
      "I'm here to help! What's blocking you right now?",
      "Let's break this down together. What feels hardest about this task?",
      "You've got this! What's one tiny step you could take right now?",
      "Stuck? That's totally normal. Let's figure out what's in the way.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Check if service is connected
   */
  isConnected(): boolean {
    return this.client !== null;
  }
}

export const azureOpenAIService = new AzureOpenAIService();
