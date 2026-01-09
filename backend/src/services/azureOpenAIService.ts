import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import dotenv from 'dotenv';
import { AIBreakdownResponse, Subtask } from '../types';

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

/**
 * T-Shirt Sizing Keywords for Complexity Classification
 * Based on Gemini's recommendation: Classification > Regression for LLMs
 * Pessimistic merge: Always take the HIGHER complexity
 */
type TShirtSize = 'S' | 'M' | 'L' | 'XL';

const TSHIRT_KEYWORDS: Record<TShirtSize, { korean: string[]; english: string[] }> = {
  // XL (Epic): >4h. Multiple work sessions
  'XL': {
    korean: ['프로젝트', '시스템', '개발', '구축', '설계', '이사', '학습', '공부'],
    english: ['learn', 'study', 'develop', 'build', 'design', 'move', 'project', 'system', 'architecture', 'migrate']
  },
  // L (Large): 1h - 4h. Requires gathering docs, deep thinking
  'L': {
    korean: ['세금', '신고', '보고서', '분석', '계획', '연구', '작성', '결산', '회계'],
    english: ['tax', 'return', 'file', 'report', 'analyze', 'plan', 'research', 'write', 'thesis', 'audit', 'budget', 'financial', 'draft']
  },
  // M (Medium): 15m - 1h. Requires focus or 1-2 prep steps
  'M': {
    korean: ['정리', '청소', '검토', '수정', '업데이트', '일정'],
    english: ['clean', 'organize', 'schedule', 'fix', 'review', 'update', 'prepare', 'document']
  },
  // S (Small): <15 min. No prep needed
  'S': {
    korean: ['이메일', '전화', '전송', '읽기'],
    english: ['email', 'call', 'send', 'read', 'submit', 'click', 'open', 'save']
  }
};

const TSHIRT_SIZE_ORDER: TShirtSize[] = ['S', 'M', 'L', 'XL'];

const TSHIRT_DURATION_MAP: Record<TShirtSize, { minMinutes: number; maxMinutes: number; defaultMinutes: number }> = {
  'S': { minMinutes: 1, maxMinutes: 15, defaultMinutes: 10 },
  'M': { minMinutes: 15, maxMinutes: 60, defaultMinutes: 30 },
  'L': { minMinutes: 60, maxMinutes: 240, defaultMinutes: 120 },
  'XL': { minMinutes: 240, maxMinutes: 960, defaultMinutes: 480 }
};

/**
 * ADHD-specific constants from research
 */
const ADHD_MULTIPLIER = 1.5; // Accounts for transition costs and time blindness
const ATOMIC_THRESHOLD_MINUTES = 10; // JIT recursive breakdown threshold
const PRIMITIVE_THRESHOLD_MINUTES = 5; // Below this, task is primitive (cannot be further broken down)

/**
 * Study Mode Keywords for Learning Task Detection
 * When these keywords are detected, use Learning Architect prompt instead of standard breakdown
 */
const STUDY_MODE_KEYWORDS = {
  korean: ['공부', '학습', '복습', '암기', '시험', '챕터', '튜토리얼', '이론', '개념', '강의', '교재', '단어', '문법', '연습문제', '과목'],
  english: ['study', 'learn', 'review', 'memorize', 'exam', 'chapter', 'tutorial', 'theory', 'concept', 'lecture', 'textbook', 'vocabulary', 'grammar', 'practice problem', 'course']
};

class AzureOpenAIService {
  private client: OpenAIClient | null = null;
  private models: ModelConfig;
  private apiVersion: string;

  /**
   * Detect language from input text
   * Returns 'korean' if Korean characters found, otherwise 'english'
   */
  private detectLanguage(text: string): 'korean' | 'english' {
    // Check for Korean characters (Hangul Unicode range: 0xAC00-0xD7A3)
    const koreanRegex = /[\uAC00-\uD7A3]/;
    return koreanRegex.test(text) ? 'korean' : 'english';
  }

  /**
   * [STUDY MODE DETECTION] Detect if task is a learning/study task
   * Returns true if task title or description contains study-related keywords
   */
  private isStudyModeTask(taskTitle: string, taskDescription?: string): boolean {
    const text = `${taskTitle} ${taskDescription || ''}`.toLowerCase();
    const language = this.detectLanguage(taskTitle);
    const keywords = STUDY_MODE_KEYWORDS[language];

    const isStudyTask = keywords.some(kw => text.includes(kw.toLowerCase()));

    if (isStudyTask) {
      console.log(`📚 [Study Mode] Detected learning task: "${taskTitle}"`);
    }

    return isStudyTask;
  }

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
   * [RULE-BASED T-SHIRT SIZING] Get minimum T-Shirt size from keyword matching
   * Returns the HIGHEST matching size (pessimistic approach)
   */
  private getRuleBasedTShirtSize(taskTitle: string, taskDescription?: string): {
    size: TShirtSize;
    matchedKeywords: string[];
  } {
    const text = `${taskTitle} ${taskDescription || ''}`.toLowerCase();
    const language = this.detectLanguage(taskTitle);

    const matchedKeywords: string[] = [];
    let highestSize: TShirtSize = 'S'; // Default to smallest

    // Check each size from largest to smallest (XL → S)
    for (const size of [...TSHIRT_SIZE_ORDER].reverse()) {
      const keywords = language === 'korean'
        ? TSHIRT_KEYWORDS[size].korean
        : TSHIRT_KEYWORDS[size].english;

      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matchedKeywords.push(`${size}:${keyword}`);
          // Update highestSize if this size is larger
          if (TSHIRT_SIZE_ORDER.indexOf(size) > TSHIRT_SIZE_ORDER.indexOf(highestSize)) {
            highestSize = size;
          }
        }
      }
    }

    return { size: highestSize, matchedKeywords };
  }

  /**
   * [T-SHIRT SIZING] AI-based complexity classification (not time regression!)
   * Uses gpt-4o-mini with structured prompt for S/M/L/XL sizing
   * Key insight: LLMs are better at classification than regression
   */
  private async getTShirtSize(taskTitle: string, taskDescription?: string): Promise<{
    size: TShirtSize;
    reasoning: string;
    impliedMinutes: number;
  }> {
    if (!this.client) {
      return { size: 'M', reasoning: 'Default (no AI)', impliedMinutes: 30 };
    }

    try {
      const systemPrompt = `You are a T-Shirt Sizing Agent for an ADHD task manager.
Your job is NOT to plan the task, but to SIZE it based on "Mental Friction" and "Hidden Steps."

SIZING GUIDE:
- S (Small): <15 min. No prep needed. (e.g., "Email Mom", "Water plants")
- M (Medium): 15m - 1h. Requires focus or 1-2 prep steps. (e.g., "Write weekly update", "Clean kitchen")
- L (Large): 1h - 4h. Requires gathering docs, deep thinking, or avoiding distractions. (e.g., "File taxes", "Code new feature")
- XL (Epic): >4h. Multiple work sessions. (e.g., "Build a website", "Move house")

LOGIC:
1. Identify immediate "preparation actions" (e.g., logging in, finding papers).
2. Apply "ADHD Tax": Assume the user will get distracted or stuck.
3. Select the Size (S, M, L, XL).

OUTPUT FORMAT (JSON only):
{"size": "S" | "M" | "L" | "XL", "reasoning": "string (max 10 words)", "implied_duration_minutes": number}`;

      const userPrompt = `INPUT TASK: "${taskTitle}"${taskDescription ? `\nContext: ${taskDescription}` : ''}

Respond with JSON only.`;

      const response = await this.client.getChatCompletions(
        this.models.coach, // gpt-4o-mini for speed
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { maxTokens: 100, temperature: 0.1 }
      );

      const content = response.choices[0]?.message?.content || '{}';

      // Parse JSON response
      try {
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanedContent);

        const size = (['S', 'M', 'L', 'XL'].includes(parsed.size) ? parsed.size : 'M') as TShirtSize;
        const reasoning = parsed.reasoning || 'AI classified';
        const impliedMinutes = parsed.implied_duration_minutes || TSHIRT_DURATION_MAP[size].defaultMinutes;

        return { size, reasoning, impliedMinutes };
      } catch (parseError) {
        console.warn('[T-Shirt Sizing] Failed to parse JSON, using default M');
        return { size: 'M', reasoning: 'Parse error fallback', impliedMinutes: 30 };
      }
    } catch (error) {
      console.error('[T-Shirt Sizing] Error:', error);
      return { size: 'M', reasoning: 'Error fallback', impliedMinutes: 30 };
    }
  }

  /**
   * [T-SHIRT COMPLEXITY ANALYSIS] Combines rule-based + AI T-Shirt sizing
   * Uses PESSIMISTIC MERGE: Always take the HIGHER complexity
   * Key insight from Gemini: Classification > Regression for LLMs
   */
  private async analyzeComplexity(
    taskTitle: string,
    taskDescription?: string
  ): Promise<{
    complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
    estimatedTotalHours: number;
    timeScale: 'minutes' | 'hours';
    reasoning: string;
    tshirtSize?: TShirtSize;
    ruleBasedSize?: TShirtSize;
    aiSize?: TShirtSize;
    adhdAdjusted?: boolean;
  }> {
    console.log(`👕 [T-Shirt Analysis] Analyzing: "${taskTitle}"`);

    // PHASE 1: Rule-Based T-Shirt Sizing (keyword matching)
    const ruleResult = this.getRuleBasedTShirtSize(taskTitle, taskDescription);
    console.log(`📋 [Rule-Based] Size: ${ruleResult.size}, Keywords: [${ruleResult.matchedKeywords.join(', ')}]`);

    // PHASE 2: AI T-Shirt Sizing (classification, not regression!)
    const aiResult = await this.getTShirtSize(taskTitle, taskDescription);
    console.log(`🤖 [AI T-Shirt] Size: ${aiResult.size}, Reasoning: "${aiResult.reasoning}", Implied: ${aiResult.impliedMinutes}min`);

    // PHASE 3: PESSIMISTIC MERGE - Always take the HIGHER complexity
    const ruleIndex = TSHIRT_SIZE_ORDER.indexOf(ruleResult.size);
    const aiIndex = TSHIRT_SIZE_ORDER.indexOf(aiResult.size);
    const finalSize: TShirtSize = ruleIndex > aiIndex ? ruleResult.size : aiResult.size;

    console.log(`🔀 [Pessimistic Merge] Rule: ${ruleResult.size} (idx ${ruleIndex}) vs AI: ${aiResult.size} (idx ${aiIndex}) → Final: ${finalSize}`);

    // PHASE 4: Map T-Shirt to complexity level
    const complexityMap: Record<TShirtSize, 'simple' | 'moderate' | 'complex' | 'very_complex'> = {
      'S': 'simple',
      'M': 'moderate',
      'L': 'complex',
      'XL': 'very_complex'
    };
    const finalComplexity = complexityMap[finalSize];

    // PHASE 5: Calculate duration with ADHD multiplier
    const baseDuration = TSHIRT_DURATION_MAP[finalSize].defaultMinutes;
    const adhdAdjustedMinutes = Math.round(baseDuration * ADHD_MULTIPLIER);
    const estimatedTotalHours = adhdAdjustedMinutes / 60;

    console.log(`🧠 [ADHD Adjustment] ${baseDuration}min × ${ADHD_MULTIPLIER} = ${adhdAdjustedMinutes}min (${estimatedTotalHours.toFixed(1)}h)`);

    // PHASE 6: Time Scale - L/XL use hours, S/M use minutes
    const timeScale: 'minutes' | 'hours' =
      (finalSize === 'L' || finalSize === 'XL') ? 'hours' : 'minutes';

    const reasoning = `T-Shirt Analysis: Rule-based=${ruleResult.size}, AI=${aiResult.size} ("${aiResult.reasoning}"), Pessimistic Merge→${finalSize}, ADHD×${ADHD_MULTIPLIER}→${adhdAdjustedMinutes}min`;

    console.log(`✅ [T-Shirt Result] ${finalSize} (${finalComplexity.toUpperCase()}) | ${estimatedTotalHours.toFixed(1)}h | ${timeScale} scale`);

    return {
      complexity: finalComplexity,
      estimatedTotalHours,
      timeScale,
      reasoning,
      tshirtSize: finalSize,
      ruleBasedSize: ruleResult.size,
      aiSize: aiResult.size,
      adhdAdjusted: true
    };
  }

  /**
   * [NORMALIZATION] Code-level time consistency enforcement
   * Solves the "arithmetic hallucination" problem where AI generates subtasks
   * that don't add up to the parent duration
   *
   * Implementation from research paper:
   * "scale = task.estimatedMinutes / subtaskSum"
   * "If the AI breaks a 60-minute task into three 10-minute tasks (Sum=30),
   *  the scale becomes 2.0. We then multiply each subtask by 2."
   */
  private normalizeSubtaskDurations(
    subtasks: any[],
    parentDurationMinutes: number,
    tolerance: number = 0.15
  ): { normalized: any[]; wasNormalized: boolean; originalSum: number; finalSum: number } {
    // Calculate original sum
    const originalSum = subtasks.reduce((acc, st) => acc + (st.estimatedMinutes || 0), 0);

    // Check if normalization is needed (outside tolerance range)
    const deviation = Math.abs(originalSum - parentDurationMinutes);
    const deviationPercent = deviation / parentDurationMinutes;

    if (deviationPercent <= tolerance || originalSum === 0) {
      // Within tolerance or invalid sum, no normalization needed
      return {
        normalized: subtasks,
        wasNormalized: false,
        originalSum,
        finalSum: originalSum
      };
    }

    // Calculate normalization scale
    const scale = parentDurationMinutes / originalSum;

    console.warn(`⚠️  [Normalization] Time mismatch detected!`);
    console.log(`   Parent: ${parentDurationMinutes}min | AI Sum: ${originalSum}min | Deviation: ${(deviationPercent * 100).toFixed(1)}%`);
    console.log(`   Applying scale factor: ${scale.toFixed(2)}x`);

    // Apply normalization to each subtask
    const normalized = subtasks.map(st => ({
      ...st,
      estimatedMinutes: Math.round((st.estimatedMinutes || 0) * scale)
    }));

    const finalSum = normalized.reduce((acc, st) => acc + st.estimatedMinutes, 0);

    console.log(`✅ [Normalization] Adjusted: ${originalSum}min → ${finalSum}min (target: ${parentDurationMinutes}min)`);

    return {
      normalized,
      wasNormalized: true,
      originalSum,
      finalSum
    };
  }

  /**
   * [PRIMITIVE CHECK] Detect if task is atomic (cannot be broken down further)
   * Based on research: "If the task description matches a pattern of simple imperatives
   * and the duration is < 5 minutes, force level = Low"
   */
  private isPrimitiveTask(taskTitle: string, estimatedMinutes: number): boolean {
    // Below primitive threshold
    if (estimatedMinutes < PRIMITIVE_THRESHOLD_MINUTES) {
      return true;
    }

    // Check for simple imperative patterns
    const primitivePatterns = [
      /^(click|open|close|save|type|write|read|send|call|email|buy|print)/i,
      /^(클릭|열기|닫기|저장|입력|작성|읽기|전송|전화|이메일|구매|인쇄)/
    ];

    for (const pattern of primitivePatterns) {
      if (pattern.test(taskTitle.trim())) {
        console.log(`🔒 [Primitive Check] Task "${taskTitle}" is primitive (matches imperative pattern + ${estimatedMinutes}min)`);
        return true;
      }
    }

    return false;
  }

  /**
   * [TIER 1] ARCHITECT: Initial task breakdown using o3-mini
   * Native CoT reasoning eliminates "책상 정리" automatically
   */
  async breakdownTask(
    taskTitle: string,
    taskDescription?: string,
    userId?: string,
    existingSubtasks?: Array<{ title: string; estimatedMinutes?: number }>
  ): Promise<EnhancedBreakdownResponse> {
    if (!this.client) {
      return this.getMockBreakdown(taskTitle);
    }

    const startTime = Date.now();
    const modelUsed = this.models.architect;

    try {
      // Step 1: Analyze complexity (CoT reasoning)
      const complexity = await this.analyzeComplexity(taskTitle, taskDescription);
      console.log(`⚖️  [Complexity] ${complexity.complexity.toUpperCase()} task: ${complexity.estimatedTotalHours}h (${complexity.timeScale} scale)`);

      // Step 2: Detect language from task title
      const language = this.detectLanguage(taskTitle);
      console.log(`🌐 [Language Detection] Detected: ${language} for task: "${taskTitle}"`);

      // Step 3: Detect study mode and select appropriate prompt
      const isStudyMode = this.isStudyModeTask(taskTitle, taskDescription);
      const systemPrompt = isStudyMode
        ? this.getLearningArchitectSystemPrompt(language, complexity)
        : this.getArchitectSystemPrompt(language, complexity);
      const userPrompt = this.buildArchitectUserPrompt(taskTitle, taskDescription, language, existingSubtasks, complexity);

      console.log(`🏗️  [${isStudyMode ? 'Learning Architect' : 'Architect'}] Breaking down task: "${taskTitle}" with model: ${modelUsed}`);

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
      const rawSubtasks = parsed.subtasks || parsed;

      // Normalize field names (handle snake_case, camelCase, and other variations)
      const subtasks = Array.isArray(rawSubtasks) ? rawSubtasks.map((st: any) => {
        // Get estimated minutes from various possible field names
        const minutes =
          st.estimatedMinutes ??
          st.estimated_minutes ??
          st.duration ??
          st.time ??
          st.minutes ??
          null;

        // Convert string to number if needed
        const estimatedMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;

        // Log if we found an alternative field name
        if (!st.estimatedMinutes && minutes !== null) {
          console.log(`🔄 [Field Normalization] Found time in alternative field for "${st.title}": ${minutes} min`);
        }

        return {
          ...st,
          estimatedMinutes: estimatedMinutes || 5,  // Default to 5 if nothing found
        };
      }) : rawSubtasks;

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

      // Step 4A: Chain-of-Verification (CoV) - ONLY for L/XL tasks (Skip for S/M to save ~2s)
      let workingSubtasks = subtasks;

      if (complexity.tshirtSize === 'L' || complexity.tshirtSize === 'XL') {
        console.log('🔍 [CoV] Running verification for complex task (L/XL)...');
        const verification = await this.verifyBreakdown(taskTitle, taskDescription, subtasks, complexity);

        // Use corrected subtasks if verification failed and corrections provided
        if (!verification.isValid && verification.correctedSubtasks) {
          console.log('🔧 [CoV] Using AI-corrected breakdown due to verification issues');
          workingSubtasks = verification.correctedSubtasks;
        }
      } else {
        console.log('⏭️  [CoV] Skipping verification for simple task (S/M) - saves ~2s');
      }

      // Step 4B: Code-level Normalization (Mathematical guarantee)
      // Ensure subtasks add up to parent duration (ADHD-adjusted)
      const targetDurationMinutes = Math.round(complexity.estimatedTotalHours * 60);
      const normResult = this.normalizeSubtaskDurations(workingSubtasks, targetDurationMinutes);

      const finalSubtasks = normResult.normalized;

      if (normResult.wasNormalized) {
        console.log(`🔧 [Code Normalization] Applied ${normResult.originalSum}min → ${normResult.finalSum}min`);
      }

      // Step 5: DEFERRED RECURSIVE BREAKDOWN (On-Demand for speed)
      // Instead of auto-breaking down all >10min subtasks, just flag them as composite
      // User can click "Break Down Further" to expand later - saves ~2-4s on initial load
      console.log('⚡ [Deferred] Returning subtasks with composite flags (no auto-recursion)');

      const subtasksWithFlags = finalSubtasks.map((st: any, index: number) => {
        const estimatedMinutes = st.estimatedMinutes || 5;

        return {
          title: st.title || String(st),
          order: st.order ?? index,
          estimatedMinutes,
          stepType: st.stepType || 'mental',
          status: 'draft' as const,
          isComposite: estimatedMinutes > 10,  // Flag for "Break Down Further" button
          depth: 0,
          children: [],  // Empty - populated on-demand when user clicks "Break Down Further"
          // Learning Engine fields (from Learning Architect prompt)
          strategyTag: st.strategyTag,  // e.g., 'priming', 'feynman', 'blurting'
          interactionType: st.interactionType || 'checkbox',  // default to checkbox
        };
      });

      console.log(`✅ [Deferred] ${subtasksWithFlags.filter((s: any) => s.isComposite).length} composite subtasks flagged for on-demand breakdown`);

      return {
        subtasks: subtasksWithFlags,
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
   * [TIER 1] ARCHITECT (STREAMING): Stream task breakdown as it's generated
   * Yields JSON chunks incrementally for progressive UI rendering
   */
  async *breakdownTaskStreaming(
    taskTitle: string,
    taskDescription?: string,
    userId?: string
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      console.warn('⚠️  OpenAI not configured, using mock streaming breakdown');
      // Yield mock data as JSON string for guest mode
      const mockData = this.getMockBreakdown(taskTitle);
      const jsonString = JSON.stringify(mockData.subtasks);

      // Simulate streaming by yielding the JSON in chunks
      const chunkSize = 20;
      for (let i = 0; i < jsonString.length; i += chunkSize) {
        yield jsonString.slice(i, i + chunkSize);
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return;
    }

    const modelUsed = this.models.architect; // o3-mini
    const startTime = Date.now();

    try {
      // Step 1: Analyze complexity (CoT reasoning)
      const complexity = await this.analyzeComplexity(taskTitle, taskDescription);
      console.log(`⚖️  [Streaming Complexity] ${complexity.complexity.toUpperCase()} task: ${complexity.estimatedTotalHours}h (${complexity.timeScale} scale)`);

      // Step 2: Detect language from task title
      const language = this.detectLanguage(taskTitle);
      console.log(`🌐 [Streaming] Detected: ${language} for task: "${taskTitle}"`);

      // Step 3: Detect study mode and select appropriate prompt
      const isStudyMode = this.isStudyModeTask(taskTitle, taskDescription);
      const systemPrompt = isStudyMode
        ? this.getLearningArchitectSystemPrompt(language, complexity)
        : this.getArchitectSystemPrompt(language, complexity);
      const userPrompt = this.buildArchitectUserPrompt(taskTitle, taskDescription, language, undefined, complexity);

      console.log(`🔄 [${isStudyMode ? 'Learning Architect' : 'Architect'} Streaming] Breaking down: "${taskTitle}"`);

      // Stream chat completions
      const stream = await this.client.streamChatCompletions(
        modelUsed,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        this.getModelOptions(modelUsed, 800)
      );

      let buffer = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          buffer += delta;
          // Yield each chunk as it arrives
          yield delta;
        }
      }

      const latencyMs = Date.now() - startTime;
      console.log(`✅ [Architect Streaming] Complete: ${latencyMs}ms, ${buffer.length} chars`);

      // Log metadata (can't get token usage from streaming easily)
      if (userId) {
        this.logBreakdown({
          userId,
          taskTitle,
          model: modelUsed,
          latencyMs,
          tokensUsed: 0, // Not available in streaming
          reasoningTokens: 0,
          costUSD: 0,
          subtasks: [], // Will be parsed on client
        });
      }
    } catch (error) {
      console.error('❌ [Architect Streaming] Error:', error);
      throw error;
    }
  }

  /**
   * Chain-of-Verification (CoV): Verify that breakdown time estimates are realistic
   * Uses o3-mini reasoning to validate subtask estimates against complexity analysis
   */
  private async verifyBreakdown(
    taskTitle: string,
    taskDescription: string | undefined,
    subtasks: any[],
    complexity: {
      complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
      estimatedTotalHours: number;
      timeScale: 'minutes' | 'hours';
      reasoning: string;
    }
  ): Promise<{
    isValid: boolean;
    issues: string[];
    correctedSubtasks?: any[];
  }> {
    if (!this.client) {
      // If no OpenAI client, skip verification
      return { isValid: true, issues: [] };
    }

    const modelUsed = this.models.architect; // o3-mini for reasoning

    // Calculate actual total from subtasks
    const actualTotalMinutes = subtasks.reduce((sum, st) => sum + (st.estimatedMinutes || 0), 0);
    const actualTotalHours = actualTotalMinutes / 60;

    // Count subtasks >10min
    const compositeCount = subtasks.filter(st => (st.estimatedMinutes || 0) > 10).length;

    const verificationPrompt = `You are verifying a task breakdown for realism and consistency.

**Original Task:**
Title: "${taskTitle}"
Description: ${taskDescription || 'None'}

**Complexity Analysis (CoT):**
- Complexity Level: ${complexity.complexity}
- Expected Total Time: ${complexity.estimatedTotalHours} hours (${Math.round(complexity.estimatedTotalHours * 60)} minutes)
- Time Scale: ${complexity.timeScale}
- Reasoning: ${complexity.reasoning}

**Generated Breakdown:**
${subtasks.map((st, i) => `${i + 1}. "${st.title}" - ${st.estimatedMinutes} min`).join('\n')}

**Actual Total:** ${actualTotalMinutes} minutes (${actualTotalHours.toFixed(1)} hours)
**Subtasks >10min:** ${compositeCount} out of ${subtasks.length}

**VERIFICATION CHECKS:**

1. **Time Consistency:** Does actual total (${actualTotalHours.toFixed(1)}h) match expected (${complexity.estimatedTotalHours}h)?
   - Tolerance: ±30% is acceptable
   - Issue if: actual < 50% or > 150% of expected

2. **Time Scale Match:**
   - If complexity is COMPLEX/VERY_COMPLEX (hours scale), at least 1-2 subtasks MUST be >10 minutes
   - If complexity is SIMPLE/MODERATE (minutes scale), most subtasks should be <10 minutes

3. **Realism Check:** Are individual time estimates realistic?
   - "데이터 파이프라인 브레인스토밍" should be 1-2 hours minimum, not 5 minutes
   - "이메일 보내기" should be 2-5 minutes, not 30 minutes
   - Consider real-world execution time, not idealized time

4. **Irreversibility Test:** Do all subtasks create actual progress?

**OUTPUT FORMAT (strict JSON):**
{
  "isValid": true/false,
  "issues": ["issue 1", "issue 2", ...],
  "reasoning": "step-by-step verification reasoning",
  "correctedSubtasks": [ // Only if isValid=false
    { "title": "...", "estimatedMinutes": 120 }, // Corrected estimates
    ...
  ]
}

Respond with verification results:`;

    try {
      const startTime = Date.now();
      const response = await this.client.getChatCompletions(
        modelUsed,
        [{ role: 'user', content: verificationPrompt }],
        { ...this.getModelOptions(modelUsed, 800), responseFormat: { type: 'json_object' } }
      );

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      const latencyMs = Date.now() - startTime;

      console.log(`🔍 [CoV] Verification: ${result.isValid ? '✅ PASS' : '❌ FAIL'} (${latencyMs}ms)`);
      if (result.issues?.length > 0) {
        console.log(`⚠️  [CoV] Issues found:`, result.issues);
      }
      if (result.reasoning) {
        console.log(`💭 [CoV] Reasoning: ${result.reasoning}`);
      }

      return {
        isValid: result.isValid,
        issues: result.issues || [],
        correctedSubtasks: result.correctedSubtasks,
      };
    } catch (error) {
      console.error('❌ [CoV] Verification error:', error);
      // If verification fails, assume valid to not block user
      return { isValid: true, issues: [] };
    }
  }

  /**
   * [TIER 3] DEEP DIVE: Recursively break down >10min subtasks using o3-mini
   */
  async deepDiveBreakdown(
    subtaskTitle: string,
    originalEstimate: number,
    parentTaskTitle: string,
    parentDepth: number = 0,
    userId?: string
  ): Promise<Subtask[]> {
    if (!this.client) {
      console.warn('⚠️  Deep Dive not available (OpenAI not configured)');
      return [];
    }

    const modelUsed = this.models.deepDive; // o3-mini
    const startTime = Date.now();

    try {
      // Detect language from subtask title (or parent task title as fallback)
      const language = this.detectLanguage(subtaskTitle || parentTaskTitle);
      console.log(`🌐 [Deep Dive] Detected: ${language} for subtask: "${subtaskTitle}"`);
      console.log(`🔍 [Deep Dive] Breaking down: "${subtaskTitle}" (${originalEstimate} min)`);

      const languageInstruction = language === 'korean' ? '- Use Korean language' : '- Use English language';

      const systemPrompt = `You are an ADHD Coach specialized in breaking down complex tasks into micro-actions.

CRITICAL RULES (Irreversibility Test):
1. NO preparation tasks (no "책상 정리", "자료 모으기", "노트북 켜기")
2. EVERY subtask must create IRREVERSIBLE PROGRESS toward the goal
3. First subtask must be <2 minutes and create immediate value
4. Each subtask must pass this test: "If I only did this one thing, would the world change?"

OUTPUT FORMAT (strict JSON array):
[
  {
    "title": "First immediate action that creates value",
    "estimatedMinutes": 2,
    "stepType": "mental" | "physical" | "creative",
    "order": 0
  },
  {
    "title": "Second micro-action",
    "estimatedMinutes": 5,
    "stepType": "...",
    "order": 1
  },
  {
    "title": "Third micro-action",
    "estimatedMinutes": 3,
    "stepType": "...",
    "order": 2
  }
]

CONSTRAINTS:
- EXACTLY 3 subtasks (Rule of Three)
- Each subtask <10 minutes
- Total time ≈ ${originalEstimate} minutes
- NO preparation tasks
${languageInstruction}`;

      const userPrompt = `Parent task: "${parentTaskTitle}"
Subtask to break down: "${subtaskTitle}"
Original estimate: ${originalEstimate} minutes

This subtask is too large (>10 min). Break it into 3 smaller micro-actions, each <10 minutes.
Follow the Irreversibility Test - no preparation tasks allowed.

Return ONLY the JSON array, no markdown, no explanation.`;

      const response = await this.client.getChatCompletions(
        modelUsed,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        this.getModelOptions(modelUsed, 600)
      );

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content?.trim() || '[]';

      // Parse JSON response
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedContent);
      const childSubtasks = Array.isArray(parsed) ? parsed : parsed.subtasks || [];

      // Calculate usage and cost
      const usage = response.usage;
      const tokensUsed = usage?.totalTokens || 0;
      const reasoningTokens = (usage as any)?.completionTokensDetails?.reasoningTokens || 0;
      const costUSD = this.calculateCost(modelUsed, tokensUsed);

      console.log(`✅ [Deep Dive] Generated ${childSubtasks.length} children: ${latencyMs}ms, ${tokensUsed} tokens ($${costUSD.toFixed(4)})`);

      // ✅ CRITICAL: Normalize children to sum to parent duration
      const normResult = this.normalizeSubtaskDurations(childSubtasks, originalEstimate, 0.15);

      if (normResult.wasNormalized) {
        console.log(`🔧 [Deep Dive Normalization] ${normResult.originalSum}min → ${normResult.finalSum}min (target: ${originalEstimate}min)`);
      }

      // Map to Subtask[] with increased depth
      return normResult.normalized.map((child: any, index: number) => {
        const estimatedMinutes = child.estimatedMinutes || 5;
        const isComposite = estimatedMinutes > 10; // Recursively check threshold

        return {
          id: '', // Will be assigned by backend when saved
          title: child.title || String(child),
          order: child.order ?? index,
          estimatedMinutes,
          stepType: child.stepType || 'mental',
          status: 'draft', // Children also start as draft
          isComposite,
          depth: parentDepth + 1, // Increase depth
          children: [], // Initialize empty (can be further broken down)
          isCompleted: false,
          isArchived: false,
          parentTaskId: '', // Will be set by caller
          parentSubtaskId: '', // Will be set by caller
        } as Subtask;
      });
    } catch (error) {
      console.error('❌ [Deep Dive] Error:', error);
      return []; // Return empty on error
    }
  }

  /**
   * [AUTOMATIC RECURSIVE BREAKDOWN] Recursively break down subtasks until all are atomic (<10min)
   * Based on ReCAP-ADHD Algorithm - continues until no composite tasks remain
   *
   * @param subtaskTitle - Title of the subtask to break down
   * @param estimatedMinutes - Current estimate for this subtask
   * @param parentTaskTitle - Title of the parent task (for context)
   * @param currentDepth - Current depth in the recursion tree
   * @param maxDepth - Maximum recursion depth (default 3 to prevent infinite loops)
   * @returns Array of atomic subtasks with all children recursively broken down
   */
  async recursiveBreakdownUntilAtomic(
    subtaskTitle: string,
    estimatedMinutes: number,
    parentTaskTitle: string,
    currentDepth: number = 1,
    maxDepth: number = 1  // Reduced from 3 to 1 for faster generation
  ): Promise<any[]> {
    // SAFETY: Prevent infinite recursion
    if (currentDepth > maxDepth) {
      console.warn(`⚠️  [Recursive] Max depth ${maxDepth} reached for "${subtaskTitle}". Stopping recursion.`);
      return [];
    }

    // BASE CASE: Already atomic (<= 10 minutes)
    if (estimatedMinutes <= 10) {
      console.log(`✅ [Recursive] "${subtaskTitle}" is atomic (${estimatedMinutes}min) - no breakdown needed`);
      return [];
    }

    console.log(`🔄 [Recursive Depth ${currentDepth}] Breaking down "${subtaskTitle}" (${estimatedMinutes}min)...`);

    try {
      // Call Deep Dive to break down this subtask
      const children = await this.deepDiveBreakdown(
        subtaskTitle,
        estimatedMinutes,
        parentTaskTitle,
        currentDepth
      );

      if (!children || children.length === 0) {
        console.warn(`⚠️  [Recursive] Deep Dive returned no children for "${subtaskTitle}"`);
        return [];
      }

      // RECURSIVE STEP: For each child, check if it needs further breakdown
      const fullyBrokenDown = await Promise.all(
        children.map(async (child: any) => {
          const childEstimate = child.estimatedMinutes || 5;

          return {
            ...child,
            isComposite: childEstimate > 10,
            depth: currentDepth,
            // ✅ RECURSIVELY BREAK DOWN if still composite
            children: childEstimate > 10
              ? await this.recursiveBreakdownUntilAtomic(
                  child.title,
                  childEstimate,
                  parentTaskTitle,
                  currentDepth + 1,
                  maxDepth
                )
              : [],
          };
        })
      );

      console.log(`✅ [Recursive Depth ${currentDepth}] Generated ${fullyBrokenDown.length} atomic children for "${subtaskTitle}"`);
      return fullyBrokenDown;

    } catch (error) {
      console.error(`❌ [Recursive] Error at depth ${currentDepth} for "${subtaskTitle}":`, error);
      return []; // Return empty on error
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
      const rawSubtasks = parsed.subtasks || parsed;

      // Normalize field names (handle snake_case, camelCase, and other variations)
      const subtasks = Array.isArray(rawSubtasks) ? rawSubtasks.map((st: any) => {
        const minutes =
          st.estimatedMinutes ??
          st.estimated_minutes ??
          st.duration ??
          st.time ??
          st.minutes ??
          null;
        const estimatedMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;
        return { ...st, estimatedMinutes: estimatedMinutes || 5 };
      }) : rawSubtasks;

      const usage = response.usage;
      const tokensUsed = usage?.totalTokens || 0;
      const reasoningTokens = (usage as any)?.completionTokensDetails?.reasoningTokens || 0;
      const costUSD = this.calculateCost(modelUsed, tokensUsed);

      console.log(`✅ [Deep Dive] Completed in ${latencyMs}ms, ${tokensUsed} tokens ($${costUSD.toFixed(4)})`);

      return {
        subtasks: subtasks.map((st: any, index: number) => ({
          title: st.title || String(st),
          order: index,
          estimatedMinutes: st.estimatedMinutes,
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

      const systemPrompt = `You are an ADHD coach with TWO MODES: Socratic mode (default) and Direct mode.

Context:
${contextInfo.length > 0 ? contextInfo.join('\n') : 'No active task'}

=== MODE DETECTION ===
Switch to DIRECT MODE when user says things like:
- "just tell me" / "그냥 알려줘"
- "give me the answer" / "답 알려줘" / "답해줘"
- "summarize" / "정리해줘" / "요약해줘"
- "stop asking" / "질문 그만"
- "I give up" / "모르겠어"
- "help me directly" / "직접 도와줘"
- Any clear signal they want you to stop questioning

=== SOCRATIC MODE (default) ===
- Ask 1-2 guiding questions
- "What do you think would happen if...?"
- "What's the first tiny step you could take?"
- Help them discover answers themselves

=== DIRECT MODE (when triggered) ===
- Acknowledge their request: "Got it, let me help directly."
- Give a clear, organized answer
- Provide concrete steps or solutions
- For code questions: give actual code examples
- Be helpful and thorough, not questioning

IMPORTANT: Once user signals they want direct help, STOP asking questions and START helping directly. Don't make them ask multiple times.

Keep responses brief (2-4 sentences). Match the user's language (Korean/English).`;

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
      // Analyze complexity (even in fallback)
      const complexity = await this.analyzeComplexity(taskTitle, taskDescription);

      // Detect language from task title
      const language = this.detectLanguage(taskTitle);
      console.log(`🌐 [Fallback] Detected: ${language} for task: "${taskTitle}"`);

      // Detect study mode and select appropriate prompt
      const isStudyMode = this.isStudyModeTask(taskTitle, taskDescription);
      const systemPrompt = isStudyMode
        ? this.getLearningArchitectSystemPrompt(language, complexity)
        : this.getArchitectSystemPrompt(language, complexity);
      const userPrompt = this.buildArchitectUserPrompt(taskTitle, taskDescription, language, undefined, complexity);

      console.log(`🏗️  [Fallback ${isStudyMode ? 'Learning Architect' : 'Architect'}] Breaking down: "${taskTitle}"`);

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
      const rawSubtasks = parsed.subtasks || parsed;

      // Normalize field names (handle snake_case, camelCase, and other variations)
      const subtasks = Array.isArray(rawSubtasks) ? rawSubtasks.map((st: any) => {
        const minutes =
          st.estimatedMinutes ??
          st.estimated_minutes ??
          st.duration ??
          st.time ??
          st.minutes ??
          null;
        const estimatedMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;
        return { ...st, estimatedMinutes: estimatedMinutes || 5 };
      }) : rawSubtasks;

      const usage = response.usage;
      const tokensUsed = usage?.totalTokens || 0;
      const costUSD = this.calculateCost(modelUsed, tokensUsed);

      console.log(`✅ [Fallback] Used ${modelUsed}: ${latencyMs}ms, ${tokensUsed} tokens`);

      // Chain-of-Verification (CoV) - ONLY for L/XL tasks (Skip for S/M to save ~2s)
      let workingSubtasks = subtasks;

      if (complexity.tshirtSize === 'L' || complexity.tshirtSize === 'XL') {
        console.log('🔍 [Fallback CoV] Running verification for complex task (L/XL)...');
        const verification = await this.verifyBreakdown(taskTitle, taskDescription, subtasks, complexity);

        if (!verification.isValid && verification.correctedSubtasks) {
          console.log('🔧 [Fallback CoV] Using AI-corrected breakdown due to verification issues');
          workingSubtasks = verification.correctedSubtasks;
        }
      } else {
        console.log('⏭️  [Fallback CoV] Skipping verification for simple task (S/M) - saves ~2s');
      }

      // Code-level Normalization (Mathematical guarantee)
      const targetDurationMinutes = Math.round(complexity.estimatedTotalHours * 60);
      const normResult = this.normalizeSubtaskDurations(workingSubtasks, targetDurationMinutes);

      const finalSubtasks = normResult.normalized;

      if (normResult.wasNormalized) {
        console.log(`🔧 [Fallback Normalization] Applied ${normResult.originalSum}min → ${normResult.finalSum}min`);
      }

      return {
        subtasks: finalSubtasks.map((st: any, index: number) => {
          const estimatedMinutes = st.estimatedMinutes || 5;
          const isComposite = estimatedMinutes > 10; // JIT threshold: >10 min needs breakdown

          return {
            title: st.title || String(st),
            order: index,
            estimatedMinutes,
            stepType: st.stepType || 'mental',
            status: 'draft', // All AI-generated subtasks start as DRAFT
            isComposite, // Flag for "Break Down Further" button
            depth: 0, // Top-level subtask
            children: [], // Initialize empty children array
            // Learning Engine fields (from Learning Architect prompt)
            strategyTag: st.strategyTag,
            interactionType: st.interactionType || 'checkbox',
          };
        }),
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
  private getArchitectSystemPrompt(
    language: 'korean' | 'english' = 'english',
    complexity?: { timeScale: 'minutes' | 'hours'; estimatedTotalHours: number }
  ): string {
    const languageInstruction = language === 'korean'
      ? '\n\nIMPORTANT: Generate all subtasks in Korean language.'
      : '\n\nIMPORTANT: Generate all subtasks in English language.';

    // Time scale instructions based on complexity
    const timeScaleInstructions = complexity?.timeScale === 'hours'
      ? `
**TIME SCALE: HOUR-SCALE BREAKDOWN (Complex Task)**
- Total estimated time: ${complexity.estimatedTotalHours} hours
- Generate 3 subtasks in HOUR-SCALE (30 minutes to 4 hours each)
- At least 1-2 subtasks MUST be >10 minutes (these will be flagged for recursive breakdown)
- Example: "요구사항 분석 및 문서화 (2시간)", "시스템 아키텍처 설계 (3시간)", "프로토타입 구현 (4시간)"
- These are strategic chunks - user will break them down further into micro-tasks
`
      : `
**TIME SCALE: MINUTE-SCALE BREAKDOWN (Simple/Moderate Task)**
- Total estimated time: ${complexity ? Math.round(complexity.estimatedTotalHours * 60) : '15-25'} minutes
- Generate 3 subtasks in MINUTE-SCALE (2-10 minutes each)
- Keep subtasks actionable and immediately executable
- Example: "핵심 메시지 1문장 작성 (2분)", "3가지 bullet point 작성 (5분)"
`;

    return `You are an ADHD Task Architect using Cognitive Shuffling methodology.

CORE PRINCIPLE: Create IMMEDIATE, IRREVERSIBLE value in first step.

IRREVERSIBILITY TEST:
- ❌ PREPARATION: Can be undone without output (책상 정리, 노트북 켜기, 자료 모으기, 템플릿 찾기)
- ✅ VALUE-FIRST: Creates artifact (문장 작성, 선 그리기, 파일 생성, 코드 작성)

${timeScaleInstructions}

CRITICAL RULES:
1. Output exactly 3 subtasks in JSON
2. First task MUST create value (quick win)
3. Each task builds on previous output
4. NEVER suggest: 준비, 세팅, 정리, 찾기, 모으기, 확인, 검색, 열기
5. Follow the TIME SCALE instructions above carefully

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
}${languageInstruction}`;
  }

  /**
   * [LEARNING ARCHITECT] System prompt for study/learning tasks
   * Uses Cognitive Action Protocol - bans passive verbs, uses active learning strategies
   * Based on research: Feynman, Blurting, Active Recall, Priming, Interleaving
   */
  private getLearningArchitectSystemPrompt(
    language: 'korean' | 'english' = 'english',
    complexity?: { timeScale: 'minutes' | 'hours'; estimatedTotalHours: number }
  ): string {
    const languageInstruction = language === 'korean'
      ? '\n\nIMPORTANT: Generate all subtasks in Korean language.'
      : '\n\nIMPORTANT: Generate all subtasks in English language.';

    const totalMinutes = complexity ? Math.round(complexity.estimatedTotalHours * 60) : 45;

    return `You are a Learning Architect using the Cognitive Action Protocol for ADHD learners.

CORE PRINCIPLE: BAN PASSIVE LEARNING. Every step must be an ACTIVE cognitive action.

=== BANNED VERBS (PASSIVE LEARNING) ===
❌ NEVER USE: 읽기(Read), 보기(Watch), 복습(Review), 훑어보기(Skim), 듣기(Listen), 확인(Check)
These create ILLUSION of progress without actual retention.

=== REQUIRED: ACTIVE LEARNING STRATEGIES ===
Each subtask MUST use one of these cognitive science-backed strategies:

1. **PRIMING** (strategyTag: "priming")
   - Quick preview BEFORE deep dive
   - "Scan headings and write 3 predictions about content"
   - InteractionType: checkbox

2. **ACTIVE READING** (strategyTag: "active_recall")
   - Transform reading into question-answering
   - "Read section X, then close book and write 3 key points"
   - InteractionType: text_input

3. **FEYNMAN TECHNIQUE** (strategyTag: "feynman")
   - Explain concept as if teaching a 10-year-old
   - "Explain [concept] in simple terms without jargon"
   - InteractionType: text_input

4. **BLURTING** (strategyTag: "blurting")
   - Brain dump everything you know (no notes!)
   - "Close all materials, write everything you remember about [topic]"
   - InteractionType: text_input

5. **CONCRETE ANALOGY** (strategyTag: "concrete_analogy")
   - Connect abstract concept to real-world example
   - "Create a real-life analogy for [concept]"
   - InteractionType: text_input

6. **ELABORATION** (strategyTag: "elaboration")
   - Connect new info to existing knowledge
   - "How does [new concept] relate to [prior knowledge]?"
   - InteractionType: text_input

=== OUTPUT FORMAT ===
{
  "subtasks": [
    {
      "title": "Active learning action with specific deliverable",
      "estimatedMinutes": number,
      "stepType": "mental",
      "strategyTag": "priming" | "active_recall" | "feynman" | "blurting" | "concrete_analogy" | "elaboration",
      "interactionType": "checkbox" | "text_input"
    }
  ]
}

=== EXAMPLES ===

Task: "유기화학 챕터 3 공부"
❌ BAD (PASSIVE):
[
  {"title": "챕터 3 읽기", "estimatedMinutes": 30},
  {"title": "노트 정리하기", "estimatedMinutes": 15},
  {"title": "문제 풀기", "estimatedMinutes": 20}
]

✅ GOOD (ACTIVE):
[
  {"title": "챕터 3 훑고 핵심 개념 3개 예측하기 (제목/그림만 보고)", "estimatedMinutes": 5, "strategyTag": "priming", "interactionType": "checkbox"},
  {"title": "첫 번째 개념 읽고 책 덮은 후 핵심 내용 3줄 적기", "estimatedMinutes": 10, "strategyTag": "active_recall", "interactionType": "text_input"},
  {"title": "그 개념을 초등학생에게 설명하듯 적기 (전문용어 금지)", "estimatedMinutes": 8, "strategyTag": "feynman", "interactionType": "text_input"},
  {"title": "일상 속 예시로 비유 만들기", "estimatedMinutes": 7, "strategyTag": "concrete_analogy", "interactionType": "text_input"}
]

Task: "Learn React Hooks"
❌ BAD (PASSIVE):
[
  {"title": "Watch React hooks tutorial", "estimatedMinutes": 30},
  {"title": "Read documentation", "estimatedMinutes": 20}
]

✅ GOOD (ACTIVE):
[
  {"title": "Scan React docs: predict what useState and useEffect do", "estimatedMinutes": 3, "strategyTag": "priming", "interactionType": "checkbox"},
  {"title": "Read useState section, then close docs and write how it works", "estimatedMinutes": 10, "strategyTag": "active_recall", "interactionType": "text_input"},
  {"title": "Explain useState like you're teaching a friend who only knows vanilla JS", "estimatedMinutes": 8, "strategyTag": "feynman", "interactionType": "text_input"},
  {"title": "Create analogy: useState is like ___ in real life", "estimatedMinutes": 5, "strategyTag": "concrete_analogy", "interactionType": "text_input"},
  {"title": "Blurt: Close everything, write everything you remember about hooks", "estimatedMinutes": 7, "strategyTag": "blurting", "interactionType": "text_input"}
]

CONSTRAINTS:
- Total time ≈ ${totalMinutes} minutes
- 3-5 subtasks
- First subtask should be PRIMING (quick preview)
- At least 2 subtasks MUST have interactionType: "text_input"
- Mix different strategyTags for variety${languageInstruction}`;
  }

  /**
   * Build user prompt for Architect
   */
  private buildArchitectUserPrompt(
    title: string,
    description?: string,
    language: 'korean' | 'english' = 'english',
    existingSubtasks?: Array<{ title: string; estimatedMinutes?: number }>,
    complexity?: { timeScale: 'minutes' | 'hours'; estimatedTotalHours: number }
  ): string {
    const languageReminder = language === 'korean'
      ? '\n\nReminder: Respond in Korean language.'
      : '\n\nReminder: Respond in English language.';

    // If existing subtasks, show them and ask for ADDITIONAL ones (avoid duplicates)
    const existingContext = existingSubtasks && existingSubtasks.length > 0
      ? `\n\nEXISTING SUBTASKS (DO NOT DUPLICATE):\n${existingSubtasks.map((st, i) => `${i + 1}. ${st.title} (${st.estimatedMinutes || '?'} min)`).join('\n')}\n\nIMPORTANT: Generate 3 NEW subtasks that are DIFFERENT from the existing ones above. Focus on aspects not yet covered.`
      : '';

    // Time scale reminder
    const timeScaleReminder = complexity?.timeScale === 'hours'
      ? `\n\nThis is a COMPLEX task (~${complexity.estimatedTotalHours} hours). Generate 3 HOUR-SCALE subtasks (30min-4hr each). At least 1-2 MUST be >10 minutes.`
      : `\n\nThis is a SIMPLE/MODERATE task. Generate 3 MINUTE-SCALE subtasks (2-10min each), immediately actionable.`;

    return `Task: "${title}"
${description ? `Context: ${description}` : ''}
${existingContext}${timeScaleReminder}
Output JSON only.${languageReminder}`;
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
        status: 'draft' as const,
        isComposite: false, // <10 min
        depth: 0,
        children: [],
      },
      {
        title: `첫 번째 구체적 행동 실행`,
        order: 1,
        estimatedMinutes: 7,
        stepType: 'creative' as const,
        status: 'draft' as const,
        isComposite: false, // <10 min
        depth: 0,
        children: [],
      },
      {
        title: `결과물 확인 및 다음 단계 메모`,
        order: 2,
        estimatedMinutes: 5,
        stepType: 'mental' as const,
        status: 'draft' as const,
        isComposite: false, // <10 min
        depth: 0,
        children: [],
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
   * [CLARIFYING QUESTIONS] Generate quick questions to understand task better
   * Uses gpt-4o-mini for speed (~1-2s response)
   */
  async generateClarifyingQuestions(
    taskTitle: string,
    taskDescription?: string
  ): Promise<{ questions: string[] }> {
    if (!this.client) {
      // Mock response for guest users
      return {
        questions: [
          'What specific outcome do you want from this task?',
          'How much time do you have for this?',
          'What\'s blocking you from starting right now?',
        ],
      };
    }

    const modelUsed = this.models.coach; // gpt-4o-mini for speed
    const startTime = Date.now();

    try {
      const language = this.detectLanguage(taskTitle);

      const systemPrompt = language === 'korean'
        ? `당신은 ADHD 코치입니다. 사용자의 작업을 더 잘 이해하기 위해 2-4개의 명확한 질문을 생성합니다.

질문 목적:
1. 구체적인 결과물 파악
2. 시간/마감 제약 확인
3. 장애물이나 의존성 파악
4. 사용자의 현재 지식 수준 이해

규칙:
- 2-4개의 질문만 생성
- 짧고 구체적인 질문
- 예/아니오로 답할 수 없는 열린 질문
- JSON 형식으로만 응답

출력 형식:
{"questions": ["질문1?", "질문2?", "질문3?"]}`
        : `You are an ADHD coach. Generate 2-4 clarifying questions to understand the user's task better.

Question purposes:
1. Identify specific deliverable/outcome
2. Understand time/deadline constraints
3. Identify blockers or dependencies
4. Gauge user's current knowledge level

Rules:
- Generate exactly 2-4 questions
- Keep questions short and specific
- Use open-ended questions (not yes/no)
- Respond with JSON only

Output format:
{"questions": ["Question 1?", "Question 2?", "Question 3?"]}`;

      const userPrompt = `Task: "${taskTitle}"${taskDescription ? `\nDescription: ${taskDescription}` : ''}

Generate 2-4 clarifying questions. JSON only.`;

      console.log(`❓ [Clarify] Generating questions for: "${taskTitle}"`);

      const response = await this.client.getChatCompletions(
        modelUsed,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 200, temperature: 0.7 }
      );

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '{}';

      // Parse JSON
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedContent);

      console.log(`✅ [Clarify] Generated ${parsed.questions?.length || 0} questions in ${latencyMs}ms`);

      return {
        questions: parsed.questions || [],
      };
    } catch (error) {
      console.error('❌ [Clarify] Error:', error);
      // Return default questions on error
      return {
        questions: [
          'What specific outcome do you want from this task?',
          'How much time do you have for this?',
        ],
      };
    }
  }

  /**
   * Check if service is connected
   */
  isConnected(): boolean {
    return this.client !== null;
  }
}

export const azureOpenAIService = new AzureOpenAIService();
