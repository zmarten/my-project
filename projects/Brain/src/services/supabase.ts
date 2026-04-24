// =============================================================================
// Open Brain: Supabase Service
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Thought, ThoughtMatch, ThoughtStats, PaginatedResult, ExtractedMetadata } from "../types.js";
import { DEFAULT_MATCH_THRESHOLD, DEFAULT_MATCH_COUNT } from "../constants.js";

let supabase: SupabaseClient;

export function initSupabase(): void {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
      "Set these in your .env file or environment."
    );
  }

  supabase = createClient(url, key);
}

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase not initialized. Call initSupabase() first.");
  }
  return supabase;
}

// -----------------------------------------------------------------------------
// Insert a thought
// -----------------------------------------------------------------------------
export async function insertThought(
  rawText: string,
  embedding: number[],
  metadata: ExtractedMetadata,
  source: string = "mcp"
): Promise<Thought> {
  const db = getSupabase();

  const { data, error } = await db
    .from("thoughts")
    .insert({
      raw_text: rawText,
      embedding: embedding,
      thought_type: metadata.thought_type,
      people: metadata.people,
      topics: metadata.topics,
      action_items: metadata.action_items,
      summary: metadata.summary,
      source,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert thought: ${error.message}`);
  }

  return data as Thought;
}

// -----------------------------------------------------------------------------
// Semantic search using the match_thoughts RPC function
// -----------------------------------------------------------------------------
export async function semanticSearch(
  queryEmbedding: number[],
  matchThreshold: number = DEFAULT_MATCH_THRESHOLD,
  matchCount: number = DEFAULT_MATCH_COUNT
): Promise<ThoughtMatch[]> {
  const db = getSupabase();

  const { data, error } = await db.rpc("match_thoughts", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`Semantic search failed: ${error.message}`);
  }

  return (data || []) as ThoughtMatch[];
}

// -----------------------------------------------------------------------------
// List recent thoughts
// -----------------------------------------------------------------------------
export async function listRecent(
  limit: number = 20,
  offset: number = 0,
  thoughtType?: string,
  topic?: string,
  person?: string
): Promise<PaginatedResult<Thought>> {
  const db = getSupabase();

  let query = db
    .from("thoughts")
    .select("*", { count: "exact" })
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (thoughtType) {
    query = query.eq("thought_type", thoughtType);
  }
  if (topic) {
    query = query.contains("topics", [topic]);
  }
  if (person) {
    query = query.contains("people", [person]);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list thoughts: ${error.message}`);
  }

  const total = count || 0;
  const items = (data || []) as Thought[];

  return {
    total,
    count: items.length,
    offset,
    items,
    has_more: total > offset + items.length,
    ...(total > offset + items.length
      ? { next_offset: offset + items.length }
      : {}),
  };
}

// -----------------------------------------------------------------------------
// Get stats via the thought_stats RPC function
// -----------------------------------------------------------------------------
export async function getStats(): Promise<ThoughtStats> {
  const db = getSupabase();

  const { data, error } = await db.rpc("thought_stats");

  if (error) {
    throw new Error(`Failed to get stats: ${error.message}`);
  }

  return data as ThoughtStats;
}

// -----------------------------------------------------------------------------
// Delete (archive) a thought
// -----------------------------------------------------------------------------
export async function archiveThought(id: string): Promise<void> {
  const db = getSupabase();

  const { data: existing, error: existingError } = await db
    .from("thoughts")
    .select("id, archived")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to load thought before archive: ${existingError.message}`
    );
  }

  if (!existing) {
    throw new Error(`No thought found with id ${id}`);
  }

  if (existing.archived) {
    return;
  }

  const { error } = await db
    .from("thoughts")
    .update({ archived: true })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to archive thought: ${error.message}`);
  }
}
