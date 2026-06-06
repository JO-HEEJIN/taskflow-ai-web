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
  tier?: 1 | 2 | 3; // assigned in Increment 2; absent in Increment 1
  tableStructure?: TableStructure; // only for type === 'table'
}

export interface Page {
  index: number; // 0-based
  widthPx: number; // page width in the unit Document AI reported (used only for bbox math)
  heightPx: number;
  renderUri?: string; // Blob URI of the rendered page image (set when render is added)
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
}
