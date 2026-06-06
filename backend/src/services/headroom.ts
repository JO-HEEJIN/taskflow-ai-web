// Headroom token-measurement seam.
//
// Headroom (github.com/chopratejas/headroom) compresses payloads sent to the LLM.
// In the study pipeline the payload it will compress is the Document AI JSON and
// the chapter text sent to the tiering model. That LLM call arrives in Increment 2,
// so for now this module only measures and logs token sizes, giving us the
// before/after baseline the SDP asks for. When the tiering call lands, the
// compression step is wired here (in-process headroom-ai, pinned version) and the
// "after" number becomes real instead of equal to "before".

// Rough token estimate (about 4 characters per token). Good enough for logging
// payload sizes; not a billing-accurate count.
export function estimateTokens(payload: unknown): number {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return Math.ceil(text.length / 4);
}

// Log the size of a payload that will eventually flow through Headroom.
// `afterTokens` is omitted until real compression is wired in Increment 2.
export function logPayloadTokens(label: string, payload: unknown, afterTokens?: number): void {
  const before = estimateTokens(payload);
  if (afterTokens === undefined) {
    console.log(`[headroom] ${label}: ~${before} tokens (compression not yet wired; Increment 2)`);
  } else {
    const saved = before > 0 ? Math.round((1 - afterTokens / before) * 100) : 0;
    console.log(`[headroom] ${label}: ~${before} -> ~${afterTokens} tokens (${saved}% smaller)`);
  }
}
