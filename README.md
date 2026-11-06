# VCG Intranet

One Next.js app for the VCG Intranet dashboards. Each page is converted from a client-provided HTML file, keeps all of its functions, and uses one shared design and sidebar.

| Route | Dashboard | Source file |
|---|---|---|
| `/` · `/departments` · `/tools` · `/resources` | Home Command | `VCG_Home_Command (4).html` |
| `/pics` (`?open=<picsId>` deep link) | Operations — P.I.C.S | `VCG_PICS_Operations (4).html` |
| `/productivity` | Productivity Center | `VCG_Productivity_Center (3).html` |
| `/product` | Product | `VCG_Product_Dashboard (2).html` |
| `/communications` | Communications | `VCG_Communications_Dashboard (2).html` |

Pages the client hasn't sent yet (ANT Connector, Marketing & Sales, Social Impact, Briefs Hub, DAM, Automations) are listed in the sidebar as "Soon".

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Data

Every page reads the Airtable base **VCG Intranet** (`appLH1D7ME6mU1zgE`) on the server and saves edits back to it. Reads are cached for 60 seconds per table. If Airtable can't be reached, the page falls back to the bundled snapshot (`lib/*-data.ts`, `lib/pics-records.ts`, …) and its badge says "Snapshot data" instead of "Live from Airtable".

`.env.local` (server only, git-ignored):

```
AIRTABLE_TOKEN=pat…            # scopes: data.records:read, data.records:write, schema.bases:read
AIRTABLE_BASE_ID=appLH1D7ME6mU1zgE
ANTHROPIC_API_KEY=sk-ant-…     # optional: AI chat (/api/chat). Without it the route returns 503.
```

| Page | Loader | Write routes |
|---|---|---|
| Home | `lib/home-live.ts` | none (read-only) |
| P.I.C.S | `lib/pics-live.ts` | `/api/pics`, `/api/pics/[id]`, `/api/pics/checklist[/id]`, `/api/pics/roadmap[/id]`, `/api/pics/reports` |
| Productivity | `lib/productivity-live.ts` | `/api/productivity/{tasks,checklists,meetings,reports}/[id]` |
| Product, Communications | `lib/product-live.server.ts` (`/api/product/data`, `/api/comms/data`) | `/api/product/write` |

Shared client: `lib/airtable.server.ts`. Every write passes an explicit allow-list of fields, and select values must be existing Airtable choices (no new options are created).

Not wired yet: Vercel deployments/redeploy on Product (`/api/product/deploy` returns 501 until a Vercel token is added), Google Calendar.

**Before deploying:** there is no login yet, and the write routes change real Airtable data. Add authentication first.

## Structure

```
app/                         routes, layout, design tokens (globals.css)
components/AppShell.tsx      sidebar, top bar with search (⌘K), footer, side panel
components/ui.tsx            toast, modal (nesting-safe), avatar, pills, select, collapsible
components/charts.tsx        donut, grouped bars, stat tile, validated palettes
components/home/             Home Command
components/pics/             P.I.C.S Operations (board, detail, calendar, forms, reports, report-build chat)
components/productivity/     Productivity Center (pipeline, schedules, team capacity, reports, summaries)
components/product-suite/    shared Product/Communications engine (state, data layer, charts, drawers, views)
components/product/          Product page
components/communications/   Communications page (inbox, insights, updates)
lib/                         types, utils, data and logic per dashboard
```
