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
            content: 'You are a helpful task management assistant that breaks down complex tasks into actionable subtasks. Return only a JSON array of subtask objects with "title" field. Keep subtasks clear, specific, and actionable. Generate 3-7 subtasks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.7,
          maxTokens: 500,
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
          order: index,
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
      { title: `Research and plan for: ${taskTitle}`, order: 0 },
      { title: `Gather necessary resources and materials`, order: 1 },
      { title: `Execute main steps`, order: 2 },
      { title: `Review and test results`, order: 3 },
      { title: `Document and finalize`, order: 4 },
    ];

    return { subtasks: mockSubtasks };
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

export const azureOpenAIService = new AzureOpenAIService();
