import { Router, Request, Response } from 'express';
import multer from 'multer';
import dns from 'dns/promises';
import net from 'net';
import { textbookService } from '../services/textbookService';
import { textbookParser } from '../services/textbookParser';

import { PDFParse } from 'pdf-parse';

const router = Router();

// --- SSRF protection for user-supplied URLs ---
// Reject private, loopback, link-local (incl. cloud metadata 169.254.169.254) and reserved ranges
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    return (
      p[0] === 10 ||
      p[0] === 127 ||
      p[0] === 0 ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 100 && p[1] >= 64 && p[1] <= 127)
    );
  }
  const lower = ip.toLowerCase().replace(/^::ffff:/, '');
  if (lower !== ip.toLowerCase() && net.isIPv4(lower)) return isPrivateIp(lower);
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
}

async function assertSafePublicUrl(raw: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed');
  }
  const addrs = await dns.lookup(u.hostname, { all: true });
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new Error('URL resolves to a private or reserved address');
    }
  }
}

// Fetch that validates every hop (blocks redirect-based SSRF bypass)
async function safeFetch(raw: string, maxRedirects = 3) {
  let current = raw;
  for (let i = 0; i <= maxRedirects; i++) {
    await assertSafePublicUrl(current);
    const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects');
}

// Configure multer for PDF uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Get all textbooks for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const textbooks = await textbookService.getTextbooks(userId);
    res.json({ textbooks });
  } catch (error) {
    console.error('Error fetching textbooks:', error);
    res.status(500).json({ error: 'Failed to fetch textbooks' });
  }
});

// Get textbook by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const textbook = await textbookService.getTextbookById(id, userId);

    if (!textbook) {
      return res.status(404).json({ error: 'Textbook not found' });
    }

    res.json({ textbook });
  } catch (error) {
    console.error('Error fetching textbook:', error);
    res.status(500).json({ error: 'Failed to fetch textbook' });
  }
});

// Create new textbook
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, author, description, chapters } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Textbook title is required' });
    }

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: 'At least one chapter is required' });
    }

    const textbook = await textbookService.createTextbook(
      title,
      userId,
      chapters,
      author,
      description
    );

    res.status(201).json({ textbook });
  } catch (error) {
    console.error('Error creating textbook:', error);
    res.status(500).json({ error: 'Failed to create textbook' });
  }
});

// Update textbook
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const textbook = await textbookService.updateTextbook(id, userId, updates);

    if (!textbook) {
      return res.status(404).json({ error: 'Textbook not found' });
    }

    res.json({ textbook });
  } catch (error) {
    console.error('Error updating textbook:', error);
    res.status(500).json({ error: 'Failed to update textbook' });
  }
});

// Delete textbook
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const success = await textbookService.deleteTextbook(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Textbook not found' });
    }

    res.json({ message: 'Textbook deleted successfully' });
  } catch (error) {
    console.error('Error deleting textbook:', error);
    res.status(500).json({ error: 'Failed to delete textbook' });
  }
});

// Generate study tasks from textbook chapters using AI
router.post('/:id/generate-tasks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    const result = await textbookService.createTasksFromTextbook(id, userId);

    res.json({
      textbook: result.textbook,
      tasks: result.tasks,
      message: `Created ${result.tasks.length} study tasks`,
    });
  } catch (error: any) {
    console.error('Error generating tasks from textbook:', error);
    res.status(500).json({ error: error.message || 'Failed to generate tasks' });
  }
});

// Parse PDF and extract chapters using Claude AI
router.post('/parse/pdf', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    console.log(`📄 Parsing PDF: ${req.file.originalname} (${req.file.size} bytes)`);

    // Extract text from PDF using pdf-parse v2 API
    const parser = new PDFParse({ data: req.file.buffer });
    const pdfData = await parser.getText();
    const pdfText = pdfData.text;

    console.log(`📝 Extracted ${pdfText.length} characters from PDF`);

    // Use Claude to extract chapters
    const result = await textbookParser.extractChaptersFromPDF(pdfText);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to parse PDF' });
  }
});

// Parse URL and extract chapters using Claude AI
router.post('/parse/url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🔗 Fetching URL: ${url}`);

    // Fetch the webpage content (SSRF-guarded: blocks private/reserved IPs and unsafe redirects)
    const response = await safeFetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const htmlContent = await response.text();
    console.log(`📝 Fetched ${htmlContent.length} characters from URL`);

    // Use Claude to extract chapters
    const result = await textbookParser.extractChaptersFromURL(url, htmlContent);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error parsing URL:', error);
    res.status(500).json({ error: error.message || 'Failed to parse URL' });
  }
});

// Parse text (table of contents) and extract chapters using Claude AI
router.post('/parse/text', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    console.log(`📋 Parsing text: ${text.length} characters`);

    // Use Claude to extract chapters
    const result = await textbookParser.extractChaptersFromText(text);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error parsing text:', error);
    res.status(500).json({ error: error.message || 'Failed to parse text' });
  }
});

export default router;
