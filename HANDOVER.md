# VCG Intranet — Handover

_Last updated: 26 Nov 2026 · Phase 1_

## 1. Where it stands

**Phase 1 is built and working on live Airtable data.** All 10 pages load and save real data. The work that is left is mostly client-side: keys, deployment settings and Airtable data cleanup.

| Area | Status |
|---|---|
| UAT feedback (Phase 1 PDF) | **91 of 106 items done** (~86%). 3 partly done, 10 waiting on Airtable data fixes, 2 blocked on client info. See [UAT-PHASE1-CHECKLIST.md](UAT-PHASE1-CHECKLIST.md) |
| Client hand-off files (Master Card v2, Action Items sync, Comms CRM, UAT mockup) | Built |
| Phone / tablet / laptop layout | Checked on every page and tab. Nothing scrolls sideways, and long lists use "Show all" |
| Login | Built (shared team password). **Off until `SITE_PASSWORD` is set** |
| AI (ANT chat, P.I.C.S ✦) | Built and capped. **Not answering yet: the Anthropic account has no credits** |
| Live deployment | **Not live with data yet.** The keys still need to be added in Vercel |

## 2. Pages

| Page | Route | What it does | Airtable |
|---|---|---|---|
| Home | `/` | Goals, KPIs, announcements, department wiki | read + edit Reports To |
| Departments | `/departments` | Department cards → wiki (hierarchy, tools, resources) | read + write |
| Tools / Team Resources | `/tools`, `/resources` | Tool Library and resources, with search | read |
| P.I.C.S Operations | `/pics` | Mix, stages, checklists, meetings, Reports, Master Card v2 | read + write |
| Productivity Center | `/productivity` | Meetings pipeline, calendars, schedules, action items | read + write |
| Product | `/product` | Customers, Roadmap (Master Card), Website, Features | read + write |
| Communications CRM | `/communications` | Inbox, Contacts, Pipelines, Campaigns, Insights, Updates | read + write |
| ANT Connector | `/ant` | ANT directory, requests, quick assists, Claude chat | read + write + Claude |
| Social Impact | `/social-impact` | SDG alignment, greater-good KPIs, scrapers | read + write |
| Sign in | `/login` | Team password (only when `SITE_PASSWORD` is set) | — |

Every write is logged to the Airtable **Dashboard Sync Queue** table: a Pending row, then Applied or Failed, with old → new values.

## 3. Setup

Stack: Next.js 16 (App Router; middleware is called `proxy.ts` in this version), React 19, Tailwind v4, TypeScript. No database: Airtable is the only data store.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Environment variables (`.env.local` locally, **Vercel → Settings → Environment Variables** in production; never prefix them with `NEXT_PUBLIC_`):

| Variable | Needed | Purpose |
|---|---|---|
| `AIRTABLE_TOKEN` | yes | PAT with `data.records:read`, `data.records:write`, `schema.bases:read`, limited to the VCG Intranet base |
| `AIRTABLE_BASE_ID` | yes | `appLH1D7ME6mU1zgE` |
| `SITE_PASSWORD` | strongly recommended | Team password; every page and API needs it |
| `ANTHROPIC_API_KEY` | for AI | ANT chat and P.I.C.S ✦ |
| `CLAUDE_MAX_OUTPUT_TOKENS` | optional | Reply cap, default 1024 |
| `CLAUDE_DAILY_LIMIT` | optional | AI calls per day, default 100 |
| `APIFY_TOKEN` | optional | Social Impact scrapers (returns 503 without it) |

After changing variables in Vercel, **redeploy**.

## 4. Key code

- `lib/airtable.server.ts`: the one Airtable client. 60s cache, at most 3 requests at once, back-off on rate limits, allow-listed writes, Sync Queue logging.
- `lib/*-live.ts`: one loader per dashboard. Each falls back to a snapshot if Airtable fails.
- `lib/ant-claude.server.ts`: Claude calls (model `claude-sonnet-5-5`) with token and daily caps.
- `components/pics-card/engine.ts`: the client's Master Card v2 HTML engine, ported as-is and run in a shadow root.
- `proxy.ts` + `lib/site-auth.ts` + `app/api/login`: the password gate.

**Field names matter:** the code reads Airtable fields by name. If someone renames a field or a dropdown option in Airtable, that part of the dashboard stops loading until the code is updated. This has already happened twice: "Report Type" → "Type" and "Delivery Link" → "Report Link".

## 5. What's left

### Needed from the client
1. **Vercel:** add the environment variables above and redeploy.
2. **Anthropic:** add credits and set a monthly spend limit.
3. **Security:** rotate the Airtable token (it was shared in chat) and limit it to this base.
4. **Airtable data cleanup** (shows directly on the dashboards):
   - 328 overdue checklist items: mark the finished ones Done or update their dates.
   - No P.I.C.S has type "Milestone", so Milestone shows 0.
   - 157 tasks have no roadmap link, and 137 have a wrong week.
   - Duplicate "Isis Darks" in Team Members; nobody has an "Intranet Role" set.
   - The items marked ☐ in the UAT checklist: Opportunities, Inbox Sources, Announcements, Meetings Master, Master Reports, Employee Resources, Tool Library, Site Map.
5. **Blocked on client info:** ClickUp URLs (team hierarchies, Resource Hub, SOPs, manuals) and Tool Library corrections.
6. **Keys for remaining features:** Brevo or Slack for Share invites and notifications (COM-24, OPS-22); Snov.io and Brevo for CRM inboxes (COM-20); Apify for the scrapers.
7. **ANT brains:** EXANT is empty and about 25 ANTs are thin; 4 have no Hierarchy.

### Developer next steps
- Once the keys arrive, connect Share invites and Slack/Brevo notifications.
- Use Team Members (email, Intranet Role) for per-person accounts and admin vs member access. Today it's one shared password.
- Phase 2 dashboards (Marketing & Sales etc., shown as "Soon" in the sidebar).

## 6. History

| Commit | Change |
|---|---|
| `95c82f9` | Built from client hand-off files: Master Card v2, Action Items sync, Department Wiki, Comms CRM |
| `16650f0` | ANT Connector + Social Impact; P.I.C.S finished |
| `db09b31` | Profile card moved into the ⚙ settings menu |
| `85a1c43` | Claude usage caps |
| `cba8dd3` · `c327fea` · `01dea3d` | Layout and responsive cleanup across all pages |
| `315a347` | Shared-password sign-in |
