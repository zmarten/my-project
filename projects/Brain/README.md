# Open Brain MCP Server

An agent-readable personal knowledge system. Store your thoughts in a Postgres database with vector embeddings, and query them from **any** MCP-compatible AI client — Claude, ChatGPT, Cursor, Claude Code, VS Code, and whatever ships next.

**Architecture:** Supabase (Postgres + pgvector) → OpenAI embeddings → MCP server → Any AI client

**Cost:** ~$0.10–0.30/month on free tiers for ~20 thoughts/day.

---

## What It Does

- **Capture** a thought → generates a vector embedding + extracts metadata (type, people, topics, action items, summary) in parallel
- **Semantic search** → finds thoughts by meaning, not keywords ("career changes" finds notes about "considering consulting")
- **List recent** → browse with filters by type, topic, or person
- **Stats** → see your thinking patterns (top topics, people, activity)
- **Archive** → soft-delete thoughts you no longer need

---

## Setup (30–45 minutes)

### 1. Create a Supabase Project (Free Tier)

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project — pick any name (e.g., "open-brain"), choose a region close to you
3. Wait for the project to finish provisioning (~2 min)
4. Go to **SQL Editor** in the left sidebar
5. Paste the entire contents of `setup.sql` and click **Run**
6. Go to **Settings → API** and copy:
   - Your **Project URL** (looks like `https://abcxyz.supabase.co`)
   - Your **service_role key** (the secret one, NOT the anon key)

### 2. Get an OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new key (you'll need a few dollars of credit for embeddings)
3. Copy the key

### 3. Install & Configure

```bash
# Clone or copy this project
cd open-brain-mcp-server

# Install dependencies
npm install
```

Create your `.env` file:

```bash
cp .env.example .env
```

```powershell
Copy-Item .env.example .env
```

Edit `.env` with your actual values:
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
```

### 4. Build

```bash
npm run build
```

### 5. Start the Server

The server auto-loads environment variables from `.env` during local runs.

```bash
npm start
```

### 6. Connect to Your AI Clients

#### Claude Desktop / Claude Code

Add to your Claude MCP config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "open-brain": {
      "command": "node",
      "args": ["/full/path/to/open-brain-mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project-id.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json` in your home directory or project:

```json
{
  "mcpServers": {
    "open-brain": {
      "command": "node",
      "args": ["/full/path/to/open-brain-mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project-id.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}
```

#### Claude Code (CLI)

```bash
claude mcp add open-brain -- node /full/path/to/open-brain-mcp-server/dist/index.js
```

You'll need to set the env vars in your shell profile or pass them inline.

---

## Tools Reference

### `brain_capture`
Store a thought with auto-generated embedding and metadata.

```
text: "Had a call with Sarah — she's thinking about leaving her job for consulting"
source: "claude" (optional, defaults to "mcp")
```

### `brain_search`
Find thoughts by meaning using semantic similarity.

```
query: "career transitions"
limit: 10 (optional)
threshold: 0.4 (optional, lower = more results)
```

### `brain_list_recent`
Browse recent thoughts with optional filters.

```
limit: 20 (optional)
offset: 0 (optional)
thought_type: "decision" (optional)
topic: "AI" (optional)
person: "Sarah" (optional)
```

### `brain_stats`
Get an overview of your brain — totals, top topics, top people, breakdown by type.

### `brain_archive`
Soft-delete a thought by UUID.

```
id: "uuid-here"
```

---

## Migration: Import Your Existing AI Memories

After setup, run this prompt in Claude (or ChatGPT) to migrate your existing memories:

> "I've set up an Open Brain system. I want to migrate everything you know about me into it. Go through your memories about me — my role, projects, key people, decisions, preferences, constraints — and for each one, use the brain_capture tool to save it. Tag the source as 'migration'. Be thorough."

Then do the same in ChatGPT if you have memories there.

---

## Quick Capture Templates

Use these patterns for clean metadata extraction:

**Decision:** "Decision: [what you decided] because [reasoning]. Alternatives considered: [options]"

**Person note:** "Person note about [Name]: [observation]. Context: [situation]"

**Insight:** "Insight: [realization]. This matters because [why]"

**Meeting debrief:** "Meeting with [people] about [topic]. Key points: [points]. Action items: [items]"

**Project update:** "Project [name] update: [status]. Next steps: [steps]. Blockers: [blockers]"

---

## Weekly Review Prompt

Run this on Fridays:

> "Pull my brain_stats and brain_list_recent for this week. Cluster my thoughts by topic, surface any unresolved action items, identify patterns across the week, and flag connections I might have missed. What gaps am I not tracking?"

---

## Architecture

```
You (any AI client)
    ↓ MCP (stdio)
Open Brain MCP Server
    ↓ parallel
    ├─ OpenAI text-embedding-3-small → vector embedding
    └─ OpenAI gpt-4o-mini → metadata extraction
    ↓
Supabase Postgres + pgvector
    └─ thoughts table (raw_text, embedding, metadata, timestamps)
```

One brain. Every AI. Your data. ~$0.10/month.
