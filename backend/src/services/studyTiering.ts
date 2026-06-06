import { Region } from '../types/study';

// Layer 1 saliency, v1: structural signals only. No LLM "importance" guessing
// (per SDP section 4). Tiers express the memorization hierarchy:
//   Tier 1 = anchor (memorize first): headings (skeleton), figure/table captions
//            (the recall anchor for the figure/table), and definitions/key terms.
//   Tier 2 = supporting: chapter/section summaries and end-of-chapter review
//            questions (these directly indicate exam targets).
//   Tier 3 = full prose, figures, and tables.

type Tier = 1 | 2 | 3;

// Structural text signals (English and Korean).
const DEFINITION_RE = /(is defined as|defined as|refers to|is called|we define|정의|이란|라고 한다|라 한다)/i;
const TERM_COLON_RE = /^[^:]{2,40}:\s+\S/; // "Term: explanation"
const SUMMARY_RE = /(in summary|^summary\b|key points?|key takeaways?|요약|핵심 ?정리)/i;
const REVIEW_Q_RE = /(review questions?|^exercises?\b|practice questions?|연습 ?문제|복습 ?문제)/i;
const QUESTION_RE = /\?\s*$/;

function tierForText(content: string): Tier {
  const t = content.trim();
  if (REVIEW_Q_RE.test(t) || QUESTION_RE.test(t)) return 2; // exam-target indicators
  if (DEFINITION_RE.test(t) || TERM_COLON_RE.test(t)) return 1; // definitions are anchors
  if (SUMMARY_RE.test(t)) return 2;
  return 3;
}

// Assign a tier to every region from structural signals alone. Pure and
// deterministic so the same book always tiers the same way.
export function assignTiers(regions: Region[]): Region[] {
  return regions.map((r): Region => {
    let tier: Tier;
    switch (r.type) {
      case 'heading':
        tier = 1; // section skeleton, the anchors
        break;
      case 'caption':
        tier = 1; // caption is the anchor for figure/table recall
        break;
      case 'figure':
      case 'table':
        tier = 3; // full figure/table; recalled from its caption/header
        break;
      case 'text':
      default:
        tier = tierForText(r.content);
        break;
    }
    return { ...r, tier, tierSource: 'structural' };
  });
}

// Per-user re-weighting seam (Layer 1, SDP): regions a user repeatedly fails
// should rise in tier over time. v1 is a no-op pass-through; the real version
// reads per-user failure stats produced by the Layer 3 scheduler (later increment)
// and would mark tierSource 'reweighted'.
export function reweightTiers(regions: Region[], _failCountByRegionId?: Record<string, number>): Region[] {
  return regions;
}

// Past-exam mapping seam (premium, later phase): a pluggable weight function that
// would override structural tiers with real exam-frequency data and set
// tierSource 'past-exam'. Not built in v1.
//
// Note on Headroom: when an optional LLM term-extraction step is added here to
// pull anchor keywords out of Tier 1/2 text, that LLM call is the payload to wrap
// with in-process Headroom (see services/headroom.ts). v1 tiering makes no LLM
// call, so Headroom stays measurement-only for now.
