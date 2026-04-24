// =============================================================================
// Open Brain: Metadata Extraction Validation
// =============================================================================

import { z } from "zod";
import { THOUGHT_TYPES } from "../types.js";

function normalizeStringList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export const ExtractedMetadataSchema = z
  .object({
    thought_type: z.enum(THOUGHT_TYPES),
    people: z.array(z.string()).default([]),
    topics: z.array(z.string()).default(["uncategorized"]),
    action_items: z.array(z.string()).default([]),
    summary: z.string().trim().min(1).max(200),
  })
  .transform((value) => ({
    thought_type: value.thought_type,
    people: normalizeStringList(value.people),
    topics: normalizeStringList(value.topics).slice(0, 5),
    action_items: normalizeStringList(value.action_items),
    summary: value.summary.trim(),
  }));
