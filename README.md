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

Every page currently runs on a snapshot or on example data. Edits stay in the browser session, and the pages say so.

- Home, P.I.C.S, Productivity: snapshots of the Airtable base **VCG Intranet** (`appLH1D7ME6mU1zgE`), stored in `lib/*-data.ts`, `lib/pics-*.ts` and `lib/productivity-*.ts`.
- Product, Communications: the client's seeded example data (`lib/product-data.ts`, `lib/comms-data.ts`). There is also a live mode that calls these endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/product/data`, `GET /api/comms/data` | `{ok, data, syncedAt, warnings, missing}` |
| `GET /api/product/site` | `{site:{status, http, ms, checkedAt, ssl, deployments, uptime, vitals, errorRate}}` |
| `POST /api/product/write` | `{table, recordId, fields}`, `{table, create:true, fields}`, or `{action:'prantSweep'\|'dismissFix'\|'assignFix', …}` |
| `POST /api/product/deploy` | `{action:'redeploy'\|'promote'\|'rollback', deploymentId}` |
| `POST /api/chat` | `{ant, message, log}` → `{reply}` (Claude, AI assistant) |

Live mode stays off until the endpoints exist. To turn it on, set `NEXT_PUBLIC_VCG_LIVE=1` (same-origin routes) or `NEXT_PUBLIC_VCG_API_BASE=<url>`.

### Going live (Phase 1)
1. Create an Airtable Personal Access Token (`data.records:read`, `data.records:write`, `schema.bases:read`) for the base, and an Anthropic API key for the chat.
2. Put them in `.env.local` as `AIRTABLE_TOKEN=…` and `ANTHROPIC_API_KEY=…`. **Never expose them to the browser.**
3. Add route handlers under `app/api/…` that call Airtable and Claude on the server, then swap each page's seed imports for those routes.

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
