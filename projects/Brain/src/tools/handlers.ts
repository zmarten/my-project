// =============================================================================
// Open Brain: Tool Implementations
// =============================================================================

import { processThought, generateEmbedding } from "../services/embedding.js";
import {
  insertThought,
  semanticSearch,
  listRecent,
  getStats,
  archiveThought,
} from "../services/supabase.js";
import {
  formatCaptureConfirmation,
  formatSearchResults,
  formatRecentList,
  formatStats,
} from "../services/formatting.js";
import type {
  CaptureThoughtInput,
  SemanticSearchInput,
  ListRecentInput,
  ArchiveThoughtInput,
} from "../schemas/inputs.js";

// -----------------------------------------------------------------------------
// brain_capture — Store a thought with embedding + metadata
// -----------------------------------------------------------------------------
export async function handleCapture(
  params: CaptureThoughtInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    // Process embedding + metadata in parallel
    const { embedding, metadata } = await processThought(params.text);

    // Insert into database
    const thought = await insertThought(
      params.text,
      embedding,
      metadata,
      params.source
    );

    return {
      content: [
        {
          type: "text",
          text: formatCaptureConfirmation(thought, metadata),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text",
          text: `Error capturing thought: ${message}. Check that your OPENAI_API_KEY and Supabase credentials are set correctly.`,
        },
      ],
    };
  }
}

// -----------------------------------------------------------------------------
// brain_search — Semantic similarity search
// -----------------------------------------------------------------------------
export async function handleSearch(
  params: SemanticSearchInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const queryEmbedding = await generateEmbedding(params.query);
    const matches = await semanticSearch(
      queryEmbedding,
      params.threshold,
      params.limit
    );

    return {
      content: [
        {
          type: "text",
          text: formatSearchResults(matches),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text",
          text: `Error searching thoughts: ${message}`,
        },
      ],
    };
  }
}

// -----------------------------------------------------------------------------
// brain_list_recent — Browse recent thoughts with optional filters
// -----------------------------------------------------------------------------
export async function handleListRecent(
  params: ListRecentInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const result = await listRecent(
      params.limit,
      params.offset,
      params.thought_type,
      params.topic,
      params.person
    );

    return {
      content: [
        {
          type: "text",
          text: formatRecentList(result),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text",
          text: `Error listing thoughts: ${message}`,
        },
      ],
    };
  }
}

// -----------------------------------------------------------------------------
// brain_stats — Overview of your Open Brain
// -----------------------------------------------------------------------------
export async function handleStats(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  try {
    const stats = await getStats();

    return {
      content: [
        {
          type: "text",
          text: formatStats(stats),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text",
          text: `Error getting stats: ${message}`,
        },
      ],
    };
  }
}

// -----------------------------------------------------------------------------
// brain_archive — Soft-delete a thought
// -----------------------------------------------------------------------------
export async function handleArchive(
  params: ArchiveThoughtInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    await archiveThought(params.id);

    return {
      content: [
        {
          type: "text",
          text: `Thought \`${params.id}\` archived successfully.`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text",
          text: `Error archiving thought: ${message}`,
        },
      ],
    };
  }
}
