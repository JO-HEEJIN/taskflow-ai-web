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

const MODEL = '@cf/google/gemma-4-26b-a4b-it';

// Call Cloudflare Workers AI (Gemma) and return the raw text response
async function runGemma(prompt: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const authToken = process.env.CLOUDFLARE_AUTH_TOKEN;

  if (!accountId || !authToken) {
    throw new Error('Cloudflare credentials not configured (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AUTH_TOKEN)');
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudflare AI error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    success: boolean;
    result?: { response?: string; choices?: Array<{ message?: { content?: string } }> };
    errors?: unknown;
  };
  // gemma-4-26b returns OpenAI-style choices[].message.content; other models use result.response
  const content = data.result?.choices?.[0]?.message?.content ?? data.result?.response;
  if (!data.success || !content) {
    throw new Error(`Cloudflare AI failed: ${JSON.stringify(data.errors)}`);
  }

  return content;
}

// Parse the first JSON object out of the model response
function extractJSON(text: string): TextbookParseResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from model response');
  }
  return JSON.parse(jsonMatch[0]) as TextbookParseResult;
}

class TextbookParser {
  // Extract chapters from PDF text content
  async extractChaptersFromPDF(pdfText: string): Promise<TextbookParseResult> {
    const response = await runGemma(`You are analyzing a textbook PDF. Extract the following information and return ONLY valid JSON:

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
}`);

    return extractJSON(response);
  }

  // Extract chapters from URL content
  async extractChaptersFromURL(url: string, htmlContent: string): Promise<TextbookParseResult> {
    const response = await runGemma(`You are analyzing a webpage that contains information about a textbook or course syllabus.
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
}`);

    return extractJSON(response);
  }

  // Extract chapters from plain text (table of contents)
  async extractChaptersFromText(text: string): Promise<TextbookParseResult> {
    const response = await runGemma(`You are analyzing a table of contents or syllabus text. Extract the following information and return ONLY valid JSON:

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
}`);

    return extractJSON(response);
  }
}

export const textbookParser = new TextbookParser();
