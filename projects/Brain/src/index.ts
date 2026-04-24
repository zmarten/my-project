import "dotenv/config";

// =============================================================================
// Open Brain MCP Server
// An agent-readable personal knowledge system
// Postgres + pgvector + Supabase + OpenAI embeddings, exposed via MCP
// =============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { initSupabase } from "./services/supabase.js";
import { initOpenAI } from "./services/embedding.js";
import {
  CaptureThoughtSchema,
  SemanticSearchSchema,
  ListRecentSchema,
  ArchiveThoughtSchema,
} from "./schemas/inputs.js";
import {
  handleCapture,
  handleSearch,
  handleListRecent,
  handleStats,
  handleArchive,
} from "./tools/handlers.js";

// -----------------------------------------------------------------------------
// Initialize services
// -----------------------------------------------------------------------------
try {
  initSupabase();
  initOpenAI();
} catch (err) {
  console.error("Initialization error:", err);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Create MCP Server
// -----------------------------------------------------------------------------
const server = new McpServer({
  name: "open-brain-mcp-server",
  version: "1.0.0",
});

// -----------------------------------------------------------------------------
// Tool: brain_capture
// -----------------------------------------------------------------------------
server.registerTool(
  "brain_capture",
  {
    title: "Capture Thought",
    description: `Store a thought, note, decision, or observation in your Open Brain.

The thought is processed in parallel: a vector embedding is generated for semantic search, and an LLM extracts metadata (type, people, topics, action items, summary).

Args:
  - text (string): The raw thought to capture (1-10,000 chars)
  - source (string): Where it's captured from, e.g. 'claude', 'chatgpt', 'slack' (default: 'mcp')

Returns:
  Confirmation with extracted metadata showing what was captured and how it was classified.

Examples:
  - "Had a call with Sarah — she's considering leaving her job to start consulting"
  - "Decision: going to use Supabase instead of raw Postgres for the open brain project"
  - "Insight: the real bottleneck in AI productivity isn't model quality, it's context transfer"`,
    inputSchema: CaptureThoughtSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async (params) => handleCapture(params)
);

// -----------------------------------------------------------------------------
// Tool: brain_search
// -----------------------------------------------------------------------------
server.registerTool(
  "brain_search",
  {
    title: "Semantic Search",
    description: `Search your Open Brain by meaning, not just keywords.

Uses vector similarity to find thoughts related to your query — even if you never used the same words. For example, searching "career changes" will find a note about "considering moving into consulting."

Args:
  - query (string): Natural language search query (1-1,000 chars)
  - limit (number): Max results, 1-50 (default: 10)
  - threshold (number): Minimum similarity 0-1 (default: 0.4, lower = more results)

Returns:
  Ranked list of matching thoughts with similarity scores, metadata, and original text.

Examples:
  - "What was I thinking about career transitions?"
  - "Notes about conversations with Sarah"
  - "Decisions I made about the hunting app project"
  - "Insights about AI productivity"`,
    inputSchema: SemanticSearchSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params) => handleSearch(params)
);

// -----------------------------------------------------------------------------
// Tool: brain_list_recent
// -----------------------------------------------------------------------------
server.registerTool(
  "brain_list_recent",
  {
    title: "List Recent Thoughts",
    description: `Browse your most recent thoughts with optional filters.

Lists thoughts in reverse chronological order. Can filter by type, topic, or person mentioned.

Args:
  - limit (number): Max results, 1-100 (default: 20)
  - offset (number): Pagination offset (default: 0)
  - thought_type (string, optional): Filter by type — decision, person_note, insight, meeting, project, general
  - topic (string, optional): Filter by topic
  - person (string, optional): Filter by person mentioned

Returns:
  Paginated list of thoughts with metadata. Includes total count and pagination info.

Examples:
  - List all recent: no filters
  - Recent decisions: thought_type="decision"
  - Notes about a person: person="Sarah"
  - Project-related: topic="open brain"`,
    inputSchema: ListRecentSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params) => handleListRecent(params)
);

// -----------------------------------------------------------------------------
// Tool: brain_stats
// -----------------------------------------------------------------------------
server.registerTool(
  "brain_stats",
  {
    title: "Brain Stats",
    description: `Get an overview of your Open Brain — total thoughts, activity this week/month, top topics, top people, and breakdown by type.

No arguments required.

Returns:
  Summary statistics including thought counts, top topics, top people mentioned, and type distribution.`,
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async () => handleStats()
);

// -----------------------------------------------------------------------------
// Tool: brain_archive
// -----------------------------------------------------------------------------
server.registerTool(
  "brain_archive",
  {
    title: "Archive Thought",
    description: `Soft-delete a thought by marking it as archived. Archived thoughts won't appear in searches or listings but aren't permanently deleted.

Args:
  - id (string): The UUID of the thought to archive

Returns:
  Confirmation of archival.`,
    inputSchema: ArchiveThoughtSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => handleArchive(params)
);

// -----------------------------------------------------------------------------
// Start the server (stdio transport for local use with Claude, Cursor, etc.)
// -----------------------------------------------------------------------------
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Open Brain MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
