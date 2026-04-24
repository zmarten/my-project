// =============================================================================
// Open Brain: Zod Schemas for Tool Input Validation
// =============================================================================

import { z } from "zod";
import { THOUGHT_TYPES } from "../types.js";

export const CaptureThoughtSchema = z
  .object({
    text: z
      .string()
      .min(1, "Thought text cannot be empty")
      .max(10000, "Thought text must be under 10,000 characters")
      .describe("The raw thought, note, decision, or observation to capture"),
    source: z
      .string()
      .trim()
      .min(1, "Source cannot be empty")
      .default("mcp")
      .describe(
        "Where this thought is being captured from (e.g., 'mcp', 'claude', 'chatgpt', 'slack')"
      ),
  })
  .strict();

export const SemanticSearchSchema = z
  .object({
    query: z
      .string()
      .min(1, "Search query cannot be empty")
      .max(1000, "Search query must be under 1,000 characters")
      .describe(
        "Natural language search query — searches by meaning, not just keywords"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Maximum number of results to return (default: 10)"),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.4)
      .describe(
        "Minimum similarity score (0-1). Lower = more results but less relevant. Default 0.4"
      ),
  })
  .strict();

export const ListRecentSchema = z
  .object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Maximum number of thoughts to return (default: 20)"),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Pagination offset (default: 0)"),
    thought_type: z
      .enum(THOUGHT_TYPES)
      .optional()
      .describe(
        "Filter by type: decision, person_note, insight, meeting, project, general"
      ),
    topic: z
      .string()
      .trim()
      .min(1, "Topic cannot be empty")
      .optional()
      .describe("Filter by topic (exact match on the topics array)"),
    person: z
      .string()
      .trim()
      .min(1, "Person cannot be empty")
      .optional()
      .describe("Filter by person mentioned (exact match on the people array)"),
  })
  .strict();

export const ArchiveThoughtSchema = z
  .object({
    id: z
      .string()
      .uuid("Must be a valid thought UUID")
      .describe("The UUID of the thought to archive"),
  })
  .strict();

export type CaptureThoughtInput = z.infer<typeof CaptureThoughtSchema>;
export type SemanticSearchInput = z.infer<typeof SemanticSearchSchema>;
export type ListRecentInput = z.infer<typeof ListRecentSchema>;
export type ArchiveThoughtInput = z.infer<typeof ArchiveThoughtSchema>;
