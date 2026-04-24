// =============================================================================
// Open Brain: Constants
// =============================================================================

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const METADATA_MODEL = "gpt-4o-mini"; // cheap + fast for extraction
export const DEFAULT_MATCH_THRESHOLD = 0.4;
export const DEFAULT_MATCH_COUNT = 10;
export const DEFAULT_RECENT_LIMIT = 20;
export const MAX_RECENT_LIMIT = 100;
export const CHARACTER_LIMIT = 50000;

export const METADATA_EXTRACTION_PROMPT = `You are a metadata extraction engine for a personal knowledge system.
Given a raw thought or note, extract structured metadata. Respond ONLY with valid JSON, no markdown fences.

Schema:
{
  "thought_type": one of ["decision", "person_note", "insight", "meeting", "project", "general"],
  "people": string[] of people mentioned by name (empty array if none),
  "topics": string[] of 1-5 key topics/themes (always include at least one),
  "action_items": string[] of any action items or todos found (empty array if none),
  "summary": a single concise sentence summarizing the thought
}

Rules:
- "decision" = the user made or is considering a specific choice
- "person_note" = primarily about a specific person or relationship
- "insight" = a realization, lesson learned, or interesting observation
- "meeting" = notes from a meeting or conversation
- "project" = about a specific project, task, or work effort
- "general" = doesn't fit the above categories
- Extract actual names for "people", not roles
- Keep topics to 1-5 short phrases
- Summary should be one sentence, max 30 words`;
