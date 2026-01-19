import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

interface ExtractedChapter {
  title: string;
  description?: string;
}

interface TextbookParseResult {
  title: string;
  author?: string;
  description?: string;
  chapters: ExtractedChapter[];
}

class ClaudeService {
  // Extract chapters from PDF text content
  async extractChaptersFromPDF(pdfText: string): Promise<TextbookParseResult> {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are analyzing a textbook PDF. Extract the following information and return ONLY valid JSON:

1. title: The textbook title
2. author: The author(s) if found
3. description: A brief description of what the textbook covers
4. chapters: An array of chapters, each with:
   - title: Chapter title (include chapter number if present)
   - description: Brief description of what the chapter covers (1-2 sentences)

Here is the PDF content:
---
${pdfText.slice(0, 30000)}
---

Return ONLY a JSON object with this structure:
{
  "title": "...",
  "author": "...",
  "description": "...",
  "chapters": [
    {"title": "Chapter 1: ...", "description": "..."},
    {"title": "Chapter 2: ...", "description": "..."}
  ]
}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    return JSON.parse(jsonMatch[0]) as TextbookParseResult;
  }

  // Extract chapters from URL content
  async extractChaptersFromURL(url: string, htmlContent: string): Promise<TextbookParseResult> {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are analyzing a webpage that contains information about a textbook or course syllabus.
URL: ${url}

Extract the following information and return ONLY valid JSON:

1. title: The textbook/course title
2. author: The author(s) or instructor if found
3. description: A brief description of what it covers
4. chapters: An array of chapters/sections/modules, each with:
   - title: Chapter/section title
   - description: Brief description (1-2 sentences)

Here is the webpage content:
---
${htmlContent.slice(0, 30000)}
---

Return ONLY a JSON object with this structure:
{
  "title": "...",
  "author": "...",
  "description": "...",
  "chapters": [
    {"title": "Chapter 1: ...", "description": "..."},
    {"title": "Chapter 2: ...", "description": "..."}
  ]
}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    return JSON.parse(jsonMatch[0]) as TextbookParseResult;
  }

  // Extract chapters from plain text (table of contents)
  async extractChaptersFromText(text: string): Promise<TextbookParseResult> {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are analyzing a table of contents or syllabus text. Extract the following information and return ONLY valid JSON:

1. title: Infer a title for this content
2. author: The author(s) if mentioned
3. description: A brief description based on the content
4. chapters: An array of chapters/sections, each with:
   - title: Chapter/section title
   - description: Brief description (1-2 sentences, inferred from title)

Here is the text:
---
${text}
---

Return ONLY a JSON object with this structure:
{
  "title": "...",
  "author": "...",
  "description": "...",
  "chapters": [
    {"title": "Chapter 1: ...", "description": "..."},
    {"title": "Chapter 2: ...", "description": "..."}
  ]
}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    return JSON.parse(jsonMatch[0]) as TextbookParseResult;
  }
}

export const claudeService = new ClaudeService();
