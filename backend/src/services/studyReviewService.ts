import { v4 as uuidv4 } from 'uuid';
import { cosmosService } from './cosmosService';
import { Book, Region, ReviewItem } from '../types/study';

const DAY_MS = 86_400_000;

// Recall targets are the things the user actively reconstructs: tier 1 and tier 2
// regions, plus every figure and table (caption-to-figure / header-to-cell).
// Tier-3 body text is the full prose you reveal, not a flashcard, so it is excluded.
export function isRecallTarget(r: Region): boolean {
  if (r.type === 'figure' || r.type === 'table') return true;
  return r.tier === 1 || r.tier === 2;
}

function kindOf(r: Region): ReviewItem['kind'] {
  if (r.type === 'figure') return 'figure';
  if (r.type === 'table') return 'table';
  return 'text';
}

// Pure SM-2 update. Quality is 0..5 (>=3 is a pass). Returns the new item state.
export function applyGrade(item: ReviewItem, quality: number, nowMs: number = Date.now()): ReviewItem {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { ease, intervalDays, repetitions } = item;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1; // see it again tomorrow
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
    repetitions += 1;
  }

  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return {
    ...item,
    ease,
    intervalDays,
    repetitions,
    dueAt: new Date(nowMs + intervalDays * DAY_MS).toISOString(),
    lastResult: q,
    lastReviewedAt: new Date(nowMs).toISOString(),
    retentionEstimate: 1, // just reviewed
  };
}

// Estimated retention now, from elapsed time since the last review and the
// current interval as the stability. Real decay, not a countdown (Increment 6 UI).
export function computeRetention(item: ReviewItem, nowMs: number = Date.now()): number {
  if (!item.lastReviewedAt) return 1;
  const elapsedDays = (nowMs - Date.parse(item.lastReviewedAt)) / DAY_MS;
  const stability = Math.max(1, item.intervalDays);
  return Math.exp(-Math.max(0, elapsedDays) / stability);
}

// Days from now until estimated retention falls to 0.5. Drives the honest
// "slips below about 50 percent in N days" message. Real decay, not a countdown.
export function daysUntilHalf(item: ReviewItem, nowMs: number = Date.now()): number {
  const stability = Math.max(1, item.intervalDays);
  let elapsedDays = 0;
  if (item.lastReviewedAt) elapsedDays = Math.max(0, (nowMs - Date.parse(item.lastReviewedAt)) / DAY_MS);
  return Math.max(0, stability * Math.LN2 - elapsedDays);
}

class StudyReviewService {
  async hasItemsForBook(ownerRef: string, bookId: string): Promise<boolean> {
    const container = cosmosService.getContainer('studyReviewItems');
    const { resources } = await container.items
      .query<{ id: string }>({
        query: 'SELECT TOP 1 c.id FROM c WHERE c.ownerRef = @o AND c.bookId = @b',
        parameters: [
          { name: '@o', value: ownerRef },
          { name: '@b', value: bookId },
        ],
      })
      .fetchAll();
    return resources.length > 0;
  }

  // Create one review item per recall-target region, all due now. Idempotent.
  async generateReviewItems(book: Book, regions: Region[], nowMs: number = Date.now()): Promise<number> {
    if (await this.hasItemsForBook(book.ownerRef, book.id)) return 0;
    const container = cosmosService.getContainer('studyReviewItems');
    const targets = regions.filter(isRecallTarget);
    const dueAt = new Date(nowMs).toISOString();
    const items: ReviewItem[] = targets.map((r) => ({
      id: uuidv4(),
      ownerRef: book.ownerRef,
      bookId: book.id,
      regionId: r.id,
      kind: kindOf(r),
      ease: 2.5,
      intervalDays: 0,
      repetitions: 0,
      dueAt,
      retentionEstimate: 1,
    }));
    await Promise.all(items.map((i) => container.items.upsert(i)));
    return items.length;
  }

  async getDueItems(ownerRef: string, limit = 50, nowMs: number = Date.now()): Promise<ReviewItem[]> {
    const container = cosmosService.getContainer('studyReviewItems');
    const now = new Date(nowMs).toISOString();
    const { resources } = await container.items
      .query<ReviewItem>({
        query: 'SELECT * FROM c WHERE c.ownerRef = @o AND c.dueAt <= @now ORDER BY c.dueAt ASC OFFSET 0 LIMIT @limit',
        parameters: [
          { name: '@o', value: ownerRef },
          { name: '@now', value: now },
          { name: '@limit', value: limit },
        ],
      })
      .fetchAll();
    return resources;
  }

  async getItem(itemId: string, ownerRef: string): Promise<ReviewItem | null> {
    const container = cosmosService.getContainer('studyReviewItems');
    try {
      const { resource } = await container.item(itemId, ownerRef).read<ReviewItem>();
      return resource || null;
    } catch {
      return null;
    }
  }

  async saveItem(item: ReviewItem): Promise<void> {
    const container = cosmosService.getContainer('studyReviewItems');
    await container.items.upsert(item);
  }

  // Distinct books that currently have due items (for the daily task sweep).
  async booksWithDueItems(ownerRef: string, nowMs: number = Date.now()): Promise<Record<string, number>> {
    const due = await this.getDueItems(ownerRef, 1000, nowMs);
    const counts: Record<string, number> = {};
    for (const i of due) counts[i.bookId] = (counts[i.bookId] || 0) + 1;
    return counts;
  }
}

export const studyReviewService = new StudyReviewService();
