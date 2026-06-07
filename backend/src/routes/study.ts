import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDocumentAiProvider } from '../services/documentAi';
import { studyService } from '../services/studyService';
import { assignTiers } from '../services/studyTiering';
import { logPayloadTokens } from '../services/headroom';
import { blobService } from '../services/blobService';
import { Book } from '../types/study';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

// owner identity: the existing no-login identity value (guest id or email),
// sent as x-user-id. Study processing must run server-side, so guests send it too.
function getOwnerRef(req: Request): string | null {
  const v = req.headers['x-user-id'];
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

// Upload a textbook PDF: validate, dedupe by content hash (process-once), run
// Document AI layout analysis, persist Book/Page/Region. No tiering yet.
router.post('/books', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    const ownerRef = getOwnerRef(req);
    if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    const pdf = req.file.buffer;
    const sourceHash = crypto.createHash('sha256').update(pdf).digest('hex');

    // Process-once: return the cached book if this PDF was already processed.
    const cached = await studyService.findCachedBook(ownerRef, sourceHash);
    if (cached) {
      return res.json({ book: cached, cached: true });
    }

    console.log(`[study] processing PDF "${req.file.originalname}" (${pdf.length} bytes) for ${ownerRef}`);
    const layout = await getDocumentAiProvider().analyzeLayout(pdf);

    // Token baseline for the payload Headroom will compress at the tiering step.
    logPayloadTokens('document-ai layout JSON', layout.raw);

    // Layer 1: assign importance tiers from structural signals.
    const regions = assignTiers(layout.regions);

    const titleFromHeading = regions.find((r) => r.type === 'heading')?.content;
    const title =
      req.file.originalname.replace(/\.pdf$/i, '').trim() || titleFromHeading || 'Untitled book';

    const bookId = uuidv4();

    // Store the original PDF privately so the viewer can render it via pdf.js.
    // Served only through the owner-verified /books/:id/pdf endpoint, not a public URL.
    const pdfBlobName = `study/${ownerRef}/${bookId}.pdf`;
    await blobService.uploadBuffer(pdf, 'application/pdf', pdfBlobName);

    const book: Book = {
      id: bookId,
      ownerRef,
      title,
      sourceHash,
      pageCount: layout.pages.length,
      processedAt: new Date().toISOString(),
      provider: getDocumentAiProvider().name,
      pdfBlobName,
    };

    await studyService.saveProcessedBook(book, layout.pages, regions);

    res.status(201).json({
      book,
      cached: false,
      pageCount: layout.pages.length,
      regionCount: layout.regions.length,
    });
  } catch (error: any) {
    console.error('[study] PDF processing failed:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to process PDF' });
  }
});

// List the caller's processed books.
router.get('/books', async (req: Request, res: Response) => {
  const ownerRef = getOwnerRef(req);
  if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });
  const books = await studyService.listBooks(ownerRef);
  res.json({ books });
});

// Stream the original PDF, only to its owner. Never a public URL (copyright/privacy).
router.get('/books/:id/pdf', async (req: Request, res: Response) => {
  const ownerRef = getOwnerRef(req);
  if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });
  const book = await studyService.getBook(req.params.id, ownerRef);
  if (!book || !book.pdfBlobName) return res.status(404).json({ error: 'PDF not found' });
  try {
    const buffer = await blobService.downloadToBuffer(book.pdfBlobName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (error: any) {
    console.error('[study] PDF stream failed:', error?.message || error);
    res.status(500).json({ error: 'Failed to load PDF' });
  }
});

// Get one book with its pages and regions.
router.get('/books/:id', async (req: Request, res: Response) => {
  const ownerRef = getOwnerRef(req);
  if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });
  const book = await studyService.getBook(req.params.id, ownerRef);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  const [pages, regions] = await Promise.all([
    studyService.getPages(book.id),
    studyService.getRegions(book.id),
  ]);
  res.json({ book, pages, regions });
});

export default router;
