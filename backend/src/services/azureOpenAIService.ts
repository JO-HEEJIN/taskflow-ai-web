import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import dotenv from 'dotenv';
import { AIBreakdownResponse } from '../types';

dotenv.config();

class AzureOpenAIService {
  private client: OpenAIClient | null = null;
  private deploymentName: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
    const apiKey = process.env.AZURE_OPENAI_API_KEY || '';
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';

    if (!endpoint || !apiKey) {
      console.warn('⚠️  Azure OpenAI credentials not configured. AI breakdown will use mock data.');
      return;
    }

    try {
      this.client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
      console.log('✅ Azure OpenAI Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI:', error);
    }
  }

  async breakdownTask(
    taskTitle: string,
    taskDescription?: string
  ): Promise<AIBreakdownResponse> {
    if (!this.client) {
      // Return mock subtasks if OpenAI not configured
      return this.getMockBreakdown(taskTitle);
    }

    try {
      const prompt = this.buildPrompt(taskTitle, taskDescription);

      const response = await this.client.getChatCompletions(
        this.deploymentName,
        [
          {
            role: 'system',
            content: `You are an ADHD Coach specialized in breaking down tasks into hyper-specific, achievable subtasks optimized for dopamine-driven execution.

CRITICAL RULES:
1. Each subtask must take 5-15 minutes MAX (ADHD attention span)
2. Start with the EASIEST physical action (e.g., "Open laptop" not "Research topic")
3. Include estimated time in minutes for each subtask
4. Classify each step: "physical" (body action), "mental" (thinking), or "creative" (making)
5. Generate 3-7 subtasks total

OUTPUT FORMAT (strict JSON array):
[
  {
    "title": "Clear desk surface",
    "estimatedMinutes": 5,
    "stepType": "physical",
    "order": 0
  },
  {
    "title": "Open laptop and required applications",
    "estimatedMinutes": 2,
    "stepType": "physical",
    "order": 1
  }
]

IMPORTANT: Return ONLY the JSON array. No other text.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.7,
          maxTokens: 800,
        }
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Azure OpenAI');
      }

      // Parse JSON response
      const subtasks = JSON.parse(content);

      return {
        subtasks: subtasks.map((st: any, index: number) => ({
          title: st.title || st.text || st.name || String(st),
          order: st.order ?? index,
          estimatedMinutes: st.estimatedMinutes || 5, // fallback to 5 minutes
          stepType: st.stepType || 'mental', // fallback to 'mental'
        })),
      };
    } catch (error) {
      console.error('Error calling Azure OpenAI:', error);
      // Fallback to mock data on error
      return this.getMockBreakdown(taskTitle);
    }
  }

  private buildPrompt(title: string, description?: string): string {
    let prompt = `Break down the following task into 3-7 actionable subtasks:\n\nTask: ${title}`;

    if (description) {
      prompt += `\nDescription: ${description}`;
    }

    prompt += '\n\nReturn ONLY a JSON array in this exact format: [{"title": "Subtask 1"}, {"title": "Subtask 2"}, ...]';

    return prompt;
  }

  private getMockBreakdown(taskTitle: string): AIBreakdownResponse {
    // Simple mock breakdown based on task title
    const mockSubtasks = [
      { title: `Clear workspace and gather materials`, order: 0, estimatedMinutes: 5, stepType: 'physical' as const },
      { title: `Research and plan for: ${taskTitle}`, order: 1, estimatedMinutes: 10, stepType: 'mental' as const },
      { title: `Execute first main step`, order: 2, estimatedMinutes: 15, stepType: 'creative' as const },
      { title: `Review and test results`, order: 3, estimatedMinutes: 10, stepType: 'mental' as const },
      { title: `Document and finalize`, order: 4, estimatedMinutes: 5, stepType: 'mental' as const },
    ];

    return { subtasks: mockSubtasks };
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

export const azureOpenAIService = new AzureOpenAIService();
