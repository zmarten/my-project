# Open Brain

An agent-readable personal knowledge store. Thoughts go into Supabase (Postgres + pgvector); any MCP-compatible client (Claude Desktop, Claude Code, Cursor, ChatGPT, …) reads and writes them through a Supabase Edge Function over HTTP.

> Derived from [Open Brain (OB1)](https://github.com/NateBJones-Projects/OB1) by [Nate B. Jones](https://natesnewsletter.substack.com/). Licensed FSL-1.1-MIT — see `LICENSE.md`.

**Divergence from upstream:** this fork talks to OpenAI directly (`https://api.openai.com/v1`) instead of OpenRouter, so no separate gateway account is needed. Everything else (tool shapes, schema, auth model) matches OB1.

---

## Architecture

```
Any MCP client
    │  HTTPS  (x-brain-key header)
    ▼
Supabase Edge Function: open-brain
    │  fan-out
    ├─ OpenAI text-embedding-3-small  → 1536-dim vector
    └─ OpenAI gpt-4o-mini             → metadata JSON
    ▼
Supabase Postgres
    public.thoughts (content, embedding vector(1536), metadata jsonb, …)
    + match_thoughts(query_embedding, threshold, count, filter jsonb)
    + upsert_thought(content, payload) — SHA256-fingerprint dedup
```

Function URL: `https://zjacstloskeynbblhgno.supabase.co/functions/v1/open-brain`

---

## MCP tools

- `capture_thought(content)` — embed + extract people/topics/actions + upsert
- `search_thoughts(query, limit?, threshold?)` — semantic search
- `list_thoughts(limit?, type?, topic?, person?, days?)` — filtered recents
- `thought_stats()` — totals, top topics, top people, type breakdown
- `search(query)` / `fetch(id)` — ChatGPT-compatible read-only pair

---

## Setup

### 1. Apply the schema

Already done in project `zjacstloskeynbblhgno`. To reproduce in a new Supabase project, run the SQL blocks from [docs/01-getting-started.md](https://github.com/NateBJones-Projects/OB1/blob/main/docs/01-getting-started.md#step-2-set-up-the-database):

- pgvector extension
- `thoughts` table + HNSW/GIN/created_at indexes
- `update_updated_at` trigger
- `match_thoughts` (4-arg) function
- `content_fingerprint` column + `upsert_thought` function
- service_role grants

Note: this repo's deployed setup keeps RLS **disabled** on `public.thoughts` because the Edge Function's `x-brain-key` gate is the real auth boundary, and the Supabase JS client here uses a JWT whose `role` claim is `anon`, not `service_role` (the OB1 RLS policy `auth.role()='service_role'` would block every request). If you switch to a real service_role JWT, re-enable RLS and the policy.

### 2. Deploy the Edge Function

```
# from this repo, using the Supabase MCP:
deploy_edge_function project_id=zjacstloskeynbblhgno \
                     name=open-brain \
                     entrypoint_path=index.ts \
                     verify_jwt=false \
                     files=[server/index.ts, server/deno.json]
```

### 3. Set secrets

At https://supabase.com/dashboard/project/zjacstloskeynbblhgno/functions/open-brain/secrets:

| Secret | Value |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI key with embeddings + chat access |
| `MCP_ACCESS_KEY` | Random 32-byte hex; what clients send as `x-brain-key` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the Edge runtime — do NOT set them manually.

### 4. Wire a client

Claude Code / Claude Desktop `~/.claude.json`:

```json
{
  "mcpServers": {
    "open-brain": {
      "type": "http",
      "url": "https://zjacstloskeynbblhgno.supabase.co/functions/v1/open-brain",
      "headers": { "x-brain-key": "<MCP_ACCESS_KEY>" }
    }
  }
}
```

Restart the client. The new MCP tools (`capture_thought`, `search_thoughts`, …) will appear.

---

## Files

- `server/index.ts` — the Edge Function (OB1 upstream + OpenAI-base-URL substitution)
- `server/deno.json` — Deno import map for npm dependencies
- `CLAUDE.md` — agent instructions for working in this repo
- `LICENSE.md` — FSL-1.1-MIT

---

## Migration history (2026-05-13)

This repo used to be a local Node + stdio server. On 2026-05-13 it was ripped out and replaced with the OB1 Edge Function flavor, because the stdio server had been silently failing for weeks (Supabase project had paused; `brain_capture` calls were erroring with no surfacing). 21 legacy `thoughts` rows were reshaped from `(raw_text, thought_type, people[], topics[], action_items[], source, summary, archived)` into OB1's `(content, metadata jsonb)` shape in a single in-DB migration that preserved every embedding. The legacy table lives on as `public.thoughts_legacy_2026_05_13` for rollback.
