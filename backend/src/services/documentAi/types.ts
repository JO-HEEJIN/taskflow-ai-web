import { Page, Region } from '../../types/study';

// Result of layout analysis, normalized across providers. Regions carry a
// provider-independent fractional bbox so downstream code never sees provider
// specifics. tier is not set here (that is Increment 2).
export interface DocumentLayout {
  pages: Page[];
  regions: Region[];
  // Raw provider JSON, kept so the tiering step (Increment 2) can read extra
  // signals and so Headroom has the payload to compress before the LLM call.
  raw: unknown;
}

// The seam. Swap implementations (Azure now; Google or self-host later) without
// touching callers. analyzeLayout takes the raw PDF bytes.
export interface DocumentAiProvider {
  readonly name: string;
  analyzeLayout(pdf: Buffer): Promise<DocumentLayout>;
}
