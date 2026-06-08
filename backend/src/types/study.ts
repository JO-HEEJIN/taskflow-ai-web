// AI Study Layer types (v1). Kept separate from the existing Task/Textbook types
// in types/index.ts so the study layer stays surgical and easy to remove.

export type RegionType = 'text' | 'heading' | 'caption' | 'figure' | 'table';

// Bounding box stored as fractions of the page (0..1), so the frontend overlay
// is resolution-independent and aligns to whatever size we render the page at.
export interface FractionBox {
  x: number; // left, 0..1
  y: number; // top, 0..1
  width: number; // 0..1
  height: number; // 0..1
}

export interface TableCell {
  rowIndex: number;
  columnIndex: number;
  rowSpan?: number;
  columnSpan?: number;
  content: string;
}

export interface TableStructure {
  rowCount: number;
  columnCount: number;
  cells: TableCell[];
}

export interface Region {
  id: string;
  pageIndex: number; // 0-based
  type: RegionType;
  bbox: FractionBox;
  content: string;
  tier?: 1 | 2 | 3; // assigned in Increment 2
  // where the tier came from. 'structural' is the v1 rule-based source. Seams:
  // 'past-exam' (premium, later) and 'reweighted' (per-user failures, Layer 3).
  tierSource?: 'structural' | 'past-exam' | 'reweighted';
  tableStructure?: TableStructure; // only for type === 'table'
}

export interface Page {
  index: number; // 0-based
  widthPx: number; // page width in the unit Document AI reported (used only for bbox math)
  heightPx: number;
  renderUri?: string; // Blob URI of the rendered page image (set when render is added)
}

// A spaced-repetition review item for one recall-target region. SM-2 state.
export interface ReviewItem {
  id: string;
  ownerRef: string;
  bookId: string;
  regionId: string;
  kind: 'text' | 'figure' | 'table';
  ease: number; // SM-2 easiness factor (>= 1.3), default 2.5
  intervalDays: number; // current interval; 0 before first successful review
  repetitions: number; // count of consecutive successful reviews
  dueAt: string; // ISO; item is due when dueAt <= now
  lastResult?: number; // last grade 0..5
  lastReviewedAt?: string; // ISO
  retentionEstimate: number; // 0..1 estimate (drives Increment 6 loss-aversion UI)
}

// An unlock the user owns. 'books' = additional books past the free first book;
// 'premium' = past-exam mapping (Increment 8 gate). Created server-side only
// (by the verified Lemon Squeezy webhook), never trusted from the client.
export interface Entitlement {
  id: string;
  ownerRef: string;
  scope: 'books' | 'premium';
  lemonsqueezyOrderId?: string;
  licenseKey?: string;
  email?: string;
  createdAt: string;
}

// ADHD-safe study streak. One document per owner (id = ownerRef). Forgiving:
// streak freezes absorb a missed day; a real break resets gently with no shame;
// goals are weekly, not daily.
export interface StudyStreak {
  id: string;
  ownerRef: string;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string; // YYYY-MM-DD ('' if never)
  freezesAvailable: number;
  weeklyGoal: number;
  weekStartDate: string; // YYYY-MM-DD (Monday of the tracked week)
  weekReviewCount: number;
}

// A processed book. owner_ref is the existing identity value (email or guest id),
// matching the syncCode/partition convention used elsewhere.
export interface Book {
  id: string;
  ownerRef: string;
  title: string;
  sourceHash: string; // sha256 of the PDF bytes; used for process-once dedupe
  pageCount: number;
  processedAt: string; // ISO
  provider: string; // which Document AI provider produced the regions
  pdfBlobName?: string; // private Blob name of the original PDF; streamed via the API
}
