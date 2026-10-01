# VCG Intranet

Next.js rebuild of the two VCG dashboards (`VCG_PICS_Operations.html` and `VCG_Productivity_Center.html`) in one app.

| Route | What it shows |
|---|---|
| `/` | Home overview: MVP build progress, this week's meetings, P.I.C.S by type, roadmap status by phase, active roster |
| `/pics` | P.I.C.S Operations: type mix, stage filter, record cards → roadmap detail (phases, meetings, heatmaps, review rounds, editable week items), calendar |
| `/productivity` | Productivity Center: task stats, team capacity (distribution, load heatmap, availability), schedules, checklists (6-status model, submit), reports (Master Reports), checklist summaries (review/approve) |

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Data

The data is a snapshot of the Airtable base **VCG Intranet** (`appLH1D7ME6mU1zgE`), taken from the original HTML files:

- `lib/pics-records.ts`: P.I.C.S records, roadmap rows, meetings, review rounds, checklist
- `lib/productivity-data.ts`: Team Members, Tasks Planning counts, Weekly Schedules, Task Checklists, Meetings Master, Master Reports

Edits made in the UI stay in the browser session. To go live:

1. Create an Airtable Personal Access Token (`data.records:read`, `data.records:write`, `schema.bases:read`) with access to the base.
2. Put it in `.env.local` as `AIRTABLE_TOKEN=...`. **Never expose it to the browser.**
3. Add route handlers (e.g. `app/api/pics/route.ts`) that call Airtable on the server, then swap the seed imports for fetches to those routes.

## Structure

```
app/                  routes + layout + design tokens (globals.css)
components/AppShell   icon rail, top bar, profile side panel
components/ui         toast, modal, avatar, pills, select, collapsible
components/charts     donut, grouped bars, stat tile, validated palette
components/pics       P.I.C.S Operations page, record detail, calendar
components/productivity  Productivity Center page, capacity, modals
lib/                  types, utils, seed data
```
