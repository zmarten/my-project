// =============================================================================
// Open Brain: Type Definitions
// =============================================================================

export interface Thought {
  id: string;
  created_at: string;
  raw_text: string;
  embedding?: number[];
  thought_type: ThoughtType;
  people: string[];
  topics: string[];
  action_items: string[];
  source: string;
  summary: string | null;
  archived: boolean;
}

export const THOUGHT_TYPES = [
  "decision",
  "person_note",
  "insight",
  "meeting",
  "project",
  "general",
] as const;

export type ThoughtType = (typeof THOUGHT_TYPES)[number];

export interface ExtractedMetadata {
  thought_type: ThoughtType;
  people: string[];
  topics: string[];
  action_items: string[];
  summary: string;
}

export interface ThoughtMatch {
  id: string;
  raw_text: string;
  summary: string | null;
  thought_type: string;
  people: string[];
  topics: string[];
  action_items: string[];
  source: string;
  created_at: string;
  similarity: number;
}

export interface ThoughtStats {
  total_thoughts: number;
  thoughts_this_week: number;
  thoughts_this_month: number;
  top_topics: Array<{ topic: string; count: number }> | null;
  top_people: Array<{ person: string; count: number }> | null;
  by_type: Array<{ thought_type: string; count: number }> | null;
  oldest_thought: string | null;
  newest_thought: string | null;
}

export interface PaginatedResult<T> {
  total: number;
  count: number;
  offset: number;
  items: T[];
  has_more: boolean;
  next_offset?: number;
}
