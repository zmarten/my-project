# Command Center -- Deployment Guide

This document covers the full deployment pipeline for the Command Center app:
Vercel hosting, GitHub Actions CI, cron jobs, and environment configuration.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Vercel Project Setup](#vercel-project-setup)
4. [Environment Variables](#environment-variables)
5. [GitHub Actions CI Pipeline](#github-actions-ci-pipeline)
6. [Cron Job (Daily Brief)](#cron-job-daily-brief)
7. [Custom Domain](#custom-domain)
8. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)

---

## Architecture Overview

```
GitHub (master branch)
    |
    |--> GitHub Actions CI (lint, typecheck, build)
    |        |
    |        |--> PASS --> Vercel auto-deploys from master
    |        |--> FAIL --> Block merge / notify
    |
    |--> Vercel
             |
             |--> Production deploy (master branch)
             |--> Preview deploys (pull requests)
             |--> Cron: /api/brief/cron at 6 AM MT daily
```

**Stack:** Next.js 14 (App Router) | Supabase | Google APIs | Anthropic Claude | NewsAPI

---

## Prerequisites

Before starting, you need accounts and credentials for:

- **GitHub** -- repository hosting (monorepo at the root, app in `projects/command-center/`)
- **Vercel** -- hosting and serverless deployment (free Hobby tier works)
- **Supabase** -- authentication, database, and Row Level Security
- **Google Cloud Console** -- OAuth credentials for Calendar and Gmail APIs
- **Anthropic** -- API key for Claude (task parsing)
- **NewsAPI** -- API key for daily brief news aggregation

---

## Vercel Project Setup

### Step 1: Connect the Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** and select your GitHub repo
3. Under **Configure Project**, set:
   - **Framework Preset:** Next.js
   - **Root Directory:** `projects/command-center`
4. Click **Deploy**

Vercel will detect the `vercel.json` configuration and use it automatically.

### Step 2: Configure the Root Directory

This is critical because the app lives in a monorepo subdirectory.

In the Vercel dashboard for your project:
1. Go to **Settings** > **General**
2. Under **Root Directory**, enter: `projects/command-center`
3. Save

### Step 3: Set Up Git Integration

Vercel should auto-detect pushes, but verify:
1. Go to **Settings** > **Git**
2. Confirm **Production Branch** is set to `master`
3. Under **Ignored Build Step**, you can optionally use this command to skip
   builds when no command-center files changed:

   ```
   git diff --quiet HEAD^ HEAD -- projects/command-center/
   ```

   If the command exits with code 0 (no changes), Vercel skips the build.

---

## Environment Variables

Set these in the Vercel dashboard under **Settings** > **Environment Variables**.

All variables should be set for **Production**, **Preview**, and **Development**
environments unless noted otherwise.

| Variable                        | Description                            | Where to Get It                          |
| ------------------------------- | -------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                   | Supabase Dashboard > Settings > API      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key          | Supabase Dashboard > Settings > API      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (secret)     | Supabase Dashboard > Settings > API      |
| `GOOGLE_CLIENT_ID`              | Google OAuth 2.0 client ID             | Google Cloud Console > Credentials       |
| `GOOGLE_CLIENT_SECRET`          | Google OAuth 2.0 client secret         | Google Cloud Console > Credentials       |
| `ANTHROPIC_API_KEY`             | Anthropic Claude API key               | console.anthropic.com > API Keys         |
| `NEWS_API_KEY`                  | NewsAPI key                            | newsapi.org > Account                    |
| `CRON_SECRET`                   | Bearer token for cron endpoint auth    | Generate: `openssl rand -base64 32`      |
| `NEXT_PUBLIC_SITE_URL`          | Production URL of the deployed app     | Your Vercel domain (e.g., `https://command-center.vercel.app`) |

### Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Never expose it client-side.
- `CRON_SECRET` protects the `/api/brief/cron` endpoint from unauthorized access.
  Generate a strong random value and keep it secret.
- Variables prefixed with `NEXT_PUBLIC_` are embedded in the client bundle and
  visible to users. Only use this prefix for values that are safe to expose.

### Generating CRON_SECRET

Run this locally and paste the output into Vercel:

```bash
openssl rand -base64 32
```

---

## GitHub Actions CI Pipeline

The CI pipeline lives at `.github/workflows/command-center-ci.yml` in the
monorepo root. It runs three jobs:

### Pipeline Stages

```
Push to master or PR --> Lint (ESLint) ---\
                         TypeCheck (tsc) --+--> Build (next build)
```

1. **Lint** -- Runs `next lint` with the ESLint configuration
2. **Type Check** -- Runs `tsc --noEmit` to catch TypeScript errors
3. **Build** -- Runs `next build` with stub environment variables to verify
   the production build succeeds

### Trigger Conditions

The pipeline ONLY runs when files under `projects/command-center/` or the
workflow file itself are changed. This prevents unnecessary CI runs when other
projects in the monorepo are modified.

### Concurrency

If you push multiple commits quickly, in-progress runs for the same branch are
automatically cancelled to save CI minutes.

### Build Environment Variables

The build job uses placeholder values for `NEXT_PUBLIC_*` variables. These stubs
let the Next.js build complete without real secrets. Vercel injects the real
values at actual deploy time.

### Requiring CI to Pass Before Merge

To enforce the pipeline on pull requests:

1. Go to GitHub repo **Settings** > **Branches**
2. Add a branch protection rule for `master`
3. Enable **Require status checks to pass before merging**
4. Select these required checks:
   - `Lint`
   - `Type Check`
   - `Build`

---

## Cron Job (Daily Brief)

The daily brief cron generates personalized morning briefings for all users
with active Google sessions. It is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/brief/cron",
      "schedule": "0 13 * * *"
    }
  ]
}
```

### Schedule

- **Cron expression:** `0 13 * * *` (1:00 PM UTC daily)
- **Mountain Standard Time (MST):** 6:00 AM (November through March)
- **Mountain Daylight Time (MDT):** 7:00 AM (March through November)

Vercel cron schedules use UTC. Since Mountain Time shifts between MST (UTC-7)
and MDT (UTC-6), the local delivery time shifts by one hour across DST
boundaries. If you prefer a consistent 6 AM delivery year-round, you would
need to update the schedule twice a year:
- MST (winter): `0 13 * * *`
- MDT (summer): `0 12 * * *`

### How It Works

1. Vercel calls `GET /api/brief/cron` with a bearer token
2. The endpoint verifies `Authorization: Bearer <CRON_SECRET>`
3. It queries Supabase for all users with active Google provider tokens
4. For each user, it gathers calendar events, emails, tasks, and news
5. Claude synthesizes a personalized brief
6. The brief is upserted into the `daily_briefs` table

### Vercel Cron Limitations

- **Hobby plan:** Cron jobs run once per day (1 cron job allowed)
- **Pro plan:** Up to 40 cron jobs, minimum 1-minute interval
- Cron jobs are automatically authenticated by Vercel (it sends the
  `Authorization: Bearer <CRON_SECRET>` header)

### Testing the Cron Endpoint Locally

```bash
curl -X GET http://localhost:3000/api/brief/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET_VALUE"
```

---

## Custom Domain

### Adding a Custom Domain

1. Go to Vercel project **Settings** > **Domains**
2. Enter your domain (e.g., `command.yourdomain.com`)
3. Vercel provides DNS records to add at your registrar:
   - **CNAME:** point `command` to `cname.vercel-dns.com`
   - Or **A record:** point to Vercel's IP addresses
4. Wait for DNS propagation (usually under 10 minutes)
5. Vercel automatically provisions an SSL certificate

### Update Environment After Domain Setup

After adding a custom domain, update these values:

1. **Vercel:** Set `NEXT_PUBLIC_SITE_URL` to `https://command.yourdomain.com`
2. **Supabase:** Add the domain to your Supabase project's allowed redirect URLs
   (Authentication > URL Configuration > Redirect URLs)
3. **Google Cloud Console:** Add the domain to your OAuth consent screen's
   authorized redirect URIs:
   - `https://command.yourdomain.com/auth/callback`
   - Also add it to authorized JavaScript origins

---

## Monitoring and Troubleshooting

### Vercel Dashboard

- **Deployments tab:** View build logs, deployment status, and rollback history
- **Functions tab:** Monitor serverless function invocations, errors, and duration
- **Logs tab:** Real-time and historical function logs (filter by `/api/brief/cron`)
- **Analytics tab:** Core Web Vitals and traffic metrics (Pro plan)

### Common Issues

#### Build fails in CI but works locally

The CI build uses stub environment variables. If the build accesses a secret
at build time (not just runtime), you may need to add it to the CI workflow's
`env` block with a stub value. Check the build output for the specific error.

#### Cron job returns 401 Unauthorized

Verify that `CRON_SECRET` is set in Vercel environment variables and matches
what the endpoint expects. Vercel sends the secret automatically for cron
invocations -- you do not configure the header manually.

#### Preview deploys fail

Preview deploys use the same environment variables as production unless you
set environment-specific overrides. Check that all required variables are set
for the "Preview" environment in Vercel.

#### TypeScript errors in CI

The CI runs `tsc --noEmit` with strict mode. If you add new code locally,
run `npx tsc --noEmit` before pushing to catch errors early.

### Rollback

If a production deploy causes issues:

1. Go to Vercel **Deployments** tab
2. Find the last known good deployment
3. Click the three-dot menu and select **Promote to Production**

This is instant and does not require a rebuild.
