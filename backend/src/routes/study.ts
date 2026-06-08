import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDocumentAiProvider } from '../services/documentAi';
import { studyService } from '../services/studyService';
import { studyReviewService, applyGrade, computeRetention, daysUntilHalf } from '../services/studyReviewService';
import { studyStreakService } from '../services/studyStreakService';
import { studyEntitlementService } from '../services/studyEntitlementService';
import { assignTiers } from '../services/studyTiering';
import { taskService } from '../services/taskService';
import { notificationService } from '../services/notificationService';
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

    // Gate: the first book is free. Book 2+ requires a 'books' (or 'premium')
    // entitlement, enforced server-side before any Document AI cost is incurred.
    const existingBooks = await studyService.listBooks(ownerRef);
    if (existingBooks.length >= 1) {
      const entitled =
        (await studyEntitlementService.has(ownerRef, 'books')) ||
        (await studyEntitlementService.has(ownerRef, 'premium'));
      if (!entitled) {
        return res.status(402).json({
          error: 'payment_required',
          gate: 'books',
          message: 'The first book is free. Unlock additional books to continue.',
        });
      }
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

    // Layer 3: seed spaced-repetition review items for the recall-target regions,
    // all due now so the first study session has items.
    const reviewItemCount = await studyReviewService.generateReviewItems(book, regions);

    res.status(201).json({
      book,
      cached: false,
      pageCount: layout.pages.length,
      regionCount: layout.regions.length,
      reviewItemCount,
    });
  } catch (error: any) {
    console.error('[study] PDF processing failed:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to process PDF' });
  }
});

// The caller's entitlements (what they have unlocked). Read-only; clients can
// never write entitlements, only the verified webhook can.
router.get('/entitlements', async (req: Request, res: Response) => {
  const ownerRef = getOwnerRef(req);
  if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });
  const entitlements = await studyEntitlementService.list(ownerRef);
  res.json({
    entitlements,
    books: entitlements.some((e) => e.scope === 'books' || e.scope === 'premium'),
    premium: entitlements.some((e) => e.scope === 'premium'),
  });
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

// Due review items for the caller, enriched with the region to render.
router.get('/review/due', async (req: Request, res: Response) => {
  const ownerRef = getOwnerRef(req);
  if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });
  const items = await studyReviewService.getDueItems(ownerRef);

  // Attach each item's region (bbox, page, content) so the session can render it.
  const bookIds = Array.from(new Set(items.map((i) => i.bookId)));
  const regionsByBook = new Map<string, Awaited<ReturnType<typeof studyService.getRegions>>>();
  await Promise.all(bookIds.map(async (b) => regionsByBook.set(b, await studyService.getRegions(b))));

  const enriched = items.map((item) => {
    const region = regionsByBook.get(item.bookId)?.find((r) => r.id === item.regionId) || null;
    // Honest decay: real retention estimate now and days until it reaches 50%.
    return {
      item,
      region,
      retention: computeRetention(item),
      daysUntilHalf: daysUntilHalf(item),
    };
  });
  res.json({ due: enriched });
});

// Materialize due review items as TaskFlow tasks so the existing notification
// system owns the trigger. One task per book with due items, idempotent per day.
// Note: backend tasks surface for signed-in users; guests (localStorage tasks)
// use the review session UI and /review/due directly.
router.post('/review/sync-tasks', async (req: Request, res: Response) => {
  const ownerRef = getOwnerRef(req);
  if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });

  const counts = await studyReviewService.booksWithDueItems(ownerRef);
  const bookIds = Object.keys(counts);
  if (bookIds.length === 0) return res.json({ created: [], skipped: [] });

  const books = await studyService.listBooks(ownerRef);
  const titleById = new Map(books.map((b) => [b.id, b.title]));
  const existing = await taskService.getTasksBySyncCode(ownerRef);
  const today = new Date().toISOString().slice(0, 10);

  const created: string[] = [];
  const skipped: string[] = [];
  for (const bookId of bookIds) {
    const taskTitle = `Review: ${titleById.get(bookId) || 'book'} (${counts[bookId]} due)`;
    const alreadyToday = existing.some(
      (t) => t.title === taskTitle && new Date(t.createdAt).toISOString().slice(0, 10) === today
    );
    if (alreadyToday) {
      skipped.push(taskTitle);
      continue;
    }
    await taskService.createTask(taskTitle, undefined, ownerRef);
    await notificationService.notifyDueDateReminder(ownerRef, taskTitle, 'today');
    created.push(taskTitle);
  }
  res.json({ created, skipped });
});

// Grade a review item (quality 0..5). Applies SM-2 and reschedules.
router.post('/review/:itemId/grade', async (req: Request, res: Response) => {
  const ownerRef = getOwnerRef(req);
  if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });
  const quality = Number(req.body?.quality);
  if (!Number.isFinite(quality)) return res.status(400).json({ error: 'quality (0..5) is required' });

  const item = await studyReviewService.getItem(req.params.itemId, ownerRef);
  if (!item) return res.status(404).json({ error: 'Review item not found' });

  const updated = applyGrade(item, quality);
  await studyReviewService.saveItem(updated);
  const streak = await studyStreakService.recordStudy(ownerRef);
  res.json({ item: updated, streak });
});

// ADHD-safe study streak for the caller (current/longest streak, freezes, weekly goal).
router.get('/review/streak', async (req: Request, res: Response) => {
  const ownerRef = getOwnerRef(req);
  if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });
  const streak = await studyStreakService.getStreak(ownerRef);
  res.json({ streak });
});

// Frontend reads this to open the inline checkout (no secrets; slug and variant
// are public). API key and webhook secret stay server-side only.
router.get('/checkout-config', (_req: Request, res: Response) => {
  res.json({
    storeSlug: process.env.LEMONSQUEEZY_STORE_SLUG || '',
    variantBooks: process.env.LEMONSQUEEZY_VARIANT_BOOKS || '',
    variantPremium: process.env.LEMONSQUEEZY_VARIANT_PREMIUM || '',
  });
});

// Premium seam: past-exam mapping. v1 ships the gate and entitlement only; the
// mapping engine is a later phase. Requires a 'premium' entitlement.
router.post('/past-exam', async (req: Request, res: Response) => {
  const ownerRef = getOwnerRef(req);
  if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });
  const premium = await studyEntitlementService.has(ownerRef, 'premium');
  if (!premium) {
    return res.status(402).json({
      error: 'payment_required',
      gate: 'premium',
      message: 'Past-exam mapping is a premium feature.',
    });
  }
  return res.status(501).json({ error: 'not_implemented', message: 'Past-exam mapping is coming soon.' });
});

// Lemon Squeezy webhook. Verifies the HMAC signature over the raw body, then on
// order_created grants 'books' to the owner_ref passed as checkout custom data.
// This is the only path that creates an entitlement.
router.post('/lemonsqueezy/webhook', async (req: Request, res: Response) => {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const sig = req.headers['x-signature'] as string | undefined;
  const raw = (req as any).rawBody as Buffer | undefined;
  if (!secret || !sig || !raw) return res.status(400).json({ error: 'Bad webhook request' });

  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body?.meta?.event_name;
  const ownerRef = req.body?.meta?.custom_data?.owner_ref;
  if (event === 'order_created' && ownerRef) {
    const attrs = req.body?.data?.attributes || {};
    const variantId = String(attrs?.first_order_item?.variant_id || '');
    const premiumVariant = process.env.LEMONSQUEEZY_VARIANT_PREMIUM || '';
    const scope: 'books' | 'premium' = premiumVariant && variantId === premiumVariant ? 'premium' : 'books';
    await studyEntitlementService.grant(ownerRef, scope, {
      lemonsqueezyOrderId: String(req.body?.data?.id || ''),
      email: attrs.user_email,
    });
    console.log(`[study] entitlement granted to ${ownerRef} via order ${req.body?.data?.id}`);
  }
  res.json({ received: true });
});

// Passwordless recovery: re-grant on a new device from the order email by looking
// up paid orders via the Lemon Squeezy API (server-side).
router.post('/entitlements/restore', async (req: Request, res: Response) => {
  const ownerRef = getOwnerRef(req);
  if (!ownerRef) return res.status(400).json({ error: 'Missing x-user-id header' });
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email) return res.status(400).json({ error: 'email is required' });

  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!apiKey || !storeId) return res.status(500).json({ error: 'Billing not configured' });

  try {
    const r = await fetch(
      `https://api.lemonsqueezy.com/v1/orders?filter[store_id]=${storeId}&filter[user_email]=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/vnd.api+json' } }
    );
    const data = (await r.json()) as any;
    const orders = data.data || [];
    if (orders.length === 0) return res.json({ restored: false });
    await studyEntitlementService.grant(ownerRef, 'books', { email, lemonsqueezyOrderId: String(orders[0].id) });
    res.json({ restored: true });
  } catch (e: any) {
    console.error('[study] restore failed:', e?.message || e);
    res.status(502).json({ error: 'Recovery lookup failed' });
  }
});

export default router;
