# Open Brain — agent instructions

This repo runs Nate B. Jones' **Open Brain (OB1)** server as a Supabase Edge Function. Personal knowledge store; every MCP-compatible client talks to it over HTTP.

## Architecture (post-rip-and-replace, 2026-05-13)

- **Runtime:** Deno on Supabase Edge Functions
- **Transport:** StreamableHTTP (Hono) — not stdio
- **DB:** Supabase Postgres (project `zjacstloskeynbblhgno`) — `public.thoughts` table, pgvector HNSW index, `match_thoughts` (4-arg) RPC, `upsert_thought` with SHA256 content fingerprint dedup
- **LLM gateway:** Direct OpenAI (divergence from upstream OB1 which uses OpenRouter — see `server/index.ts` lines 11–16)
- **Auth:** `x-brain-key` header (custom MCP_ACCESS_KEY); `verify_jwt=false` on the function
- **URL:** `https://zjacstloskeynbblhgno.supabase.co/functions/v1/open-brain`
- **Legacy data:** preserved in DB as `public.thoughts_legacy_2026_05_13` (21 rows from the local-stdio era)

## Layout

```
Brain/
├── server/
│   ├── index.ts      # OB1 server, OpenAI-base-URL variant
│   └── deno.json     # npm import map (Hono, MCP SDK, supabase-js, zod)
├── CLAUDE.md         # this file
├── LICENSE.md        # FSL-1.1-MIT (from OB1)
└── README.md         # human setup notes
```

## Exposed MCP tools

- `capture_thought` — embed + extract metadata + upsert
- `search_thoughts` — semantic search via `match_thoughts`
- `list_thoughts` — filter by type/topic/person/days
- `thought_stats` — totals, top topics, top people
- `search` / `fetch` — ChatGPT-compatibility read-only pair

## Deploying changes

`server/` files are deployed to the `open-brain` Edge Function. The local copy is the source of truth; commit before deploying.

```
# Deploy via Supabase MCP (preferred from agents):
mcp__claude_ai_Supabase__deploy_edge_function
  project_id: zjacstloskeynbblhgno
  name: open-brain
  entrypoint_path: index.ts
  verify_jwt: false
  files: [index.ts, deno.json]
```

## Required Edge Function secrets

Set at https://supabase.com/dashboard/project/zjacstloskeynbblhgno/functions/open-brain/secrets

- `OPENAI_API_KEY` — for `text-embedding-3-small` + `gpt-4o-mini`
- `MCP_ACCESS_KEY` — must match `x-brain-key` clients send

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the Edge runtime — do NOT set them manually.

## Client wiring

`~/.claude.json` registers `open-brain` as `type: "http"` with the function URL and `x-brain-key` header. Restart Claude Code after editing.
