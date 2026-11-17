# Phase 1 UAT feedback — build checklist

Source: `VCG Intranet Phase 1 User Accept Test Feedback-2026111617272122.pdf` (Isis Darks, Nov 16 2026).
Order (per PDF): Airtable fixes → sections 2 → 10, **Home last**. HTML files are the source of truth.
Updated Nov 17 2026: ☑ = built in round 1 (not yet reviewed by client).
Status: ☐ todo · ◐ partly done already · ☑ done · ⛔ blocked (reason)

## Missing inputs (blockers)
- ☑ `VCG-Intranet-UAT-Mockup.html` — Home, Departments, Tools
- ☑ `PICS-Master-Card-v2.html` — Operations 7B–7D, Product Roadmap 9B
- ☑ `Productivity-Meeting-Action-Items-Sync.html` — Productivity 8C
- ☑ `Communications-CRM-Hub.html` + `Communications-Data-Map.pdf` — Communications
- ⛔ Tools Library subpage (list of Tool Library records to correct)
- ⛔ ClickUp URLs: Team Hierarchies (Executive / Success / Operations), Resource Hub, SOPs, Manuals

## Airtable — client fixes first (11A "Before build")
- ☐ Team Members › Intranet Role set per person (Admin: Isis; others Team member)
- ☐ Opportunities › name/delete 2 unnamed rows
- ☐ Inbox Sources › Snov.io + Brevo sender addresses, forum URL, delete "Gmail inbox" option
- ☐ Announcements › Type "Deal update" → "Opportunity update"
- ☐ Meetings Master › Meeting Overview filled; "VCG Meeting Prep" tasks moved off Action Items
- ☐ Master Reports › Report Overview filled
- ☐ Employee Resources › Link = ClickUp URL
- ☐ Tool Library › records corrected
- Data quality (any time): Departments Overview empty + Creative/M&S same colour + duplicate columns; Goals ACRYLICS MVP fields; Tasks Planning bad Status/Priority/Stage options; trailing spaces ("Isis Darks ", "In Review ", "Execution "); Roadmaps GTM/Trends sprints "In Review"; SPIDER Build not Active; Meetings Master duplicate columns + Meeting Month duplicate; Contacts Engagement Type

## 2. Global (every page)
- ☑ GL-1 remove top tab bar (Home · Departments · Tools · Team Resources); sidebar is the nav
- ☑ GL-2 remove all platform subtext ("synced from Airtable", "Tasks Planning · due this month…", example-data notes, "Reporting mirrors…") — note: conflicts with our Live badge; keep badge minimal or remove (decide)
- ☑ GL-3 no "Open"/"View" links on cards; whole card is the click target
- ☑ **Every inline edit goes through Dashboard Sync Queue** (Dashboard, Tab/Area, Action, Target Table, Target Record ID, Field Name, Old/New Value, Edited By, Edited At, Status, Applied At, Error, Batch ID) — replaces our direct writes
- ☐ Team Members (Name, Photo, Email, Active Roster, Intranet Role) → signed-in user, avatars, owner pickers, admin vs member
- ☐ Site Map & Architecture (Page Name, Nav Tab, Live URL, Page Status) → sidebar pages + "Soon"

## 3. Home (do LAST) — UAT-Mockup › Home
- ☑ HOME-1 remove tab bar
- ☑ HOME-2 goal cards clickable → Goal Preview (Goal, Type, Active, Department, Owner, Description, Progress, Score, Quarter, Month, Year, Start/End, Monetary Target M/Q/A, Related P.I.C.S, Roadmap Blocks, Related Status Reports, Tasks Planning, Company OKRs, Performance Metrics, Master Plans, Professional Development (Phase 3)) + link to Airtable record; orange "data to correct" note
- ☑ HOME-3 "All active goals" section, 3 at a time, collapse/expand
- ☑ HOME-4 nav blocks: no "Open" links, whole block clickable
- ☑ HOME-5 nav blocks = Departments, Tools, Team Resources, Operations, Productivity, Product, Communications + Soon: ANT Connector, Marketing & Sales, Social Impact, Briefs Hub
- Reads: Goals, Site Map & Architecture, Departments (Name, Color), Announcements (Publish To contains Home)

## 4. Departments — UAT-Mockup › Departments
- ☑ DEPT-1 remove tab bar
- ☑ DEPT-2 remove Open button; helper text → "card opens the Department Wiki"
- ☑ DEPT-3 card opens in-app **Department Wiki**: header stats (budget, heads, members, goals); tabs Hierarchy (chart from Department Head(s) + Team Members, ANT roles dashed; "Dept. Org Chart" attachment; ClickUp Team Hierarchy link) + **edit button to build hierarchy**, Related Dashboards, Related Tools (Tool Registry & Access Log), Related Team Resources (each → ClickUp page; "Page needed"/"Verify" chips), Goals & Work — interim wiki built; full version needs UAT-Mockup HTML
- ☑ DEPT-4 "Airtable field map" tab: all 71 Departments columns → wiki placement
- ☑ DEPT-5 Professional Development = Phase 3 placeholder
- ☑ DEPT-6 "Media" → "PR & Media"; add Finance, Legal & Compliance, HR, Production/Fabrication, External (we hide External today — must show)
- ☑ DEPT-7 colour tags/metrics with Departments › Department Color
- Reads: Departments (all), Team Members (Role, Department, Reports To, Direct Reports, Photo), Employee Resources, Team Workflows & Strategic Frameworks, Tool Library, P.I.C.S / Master Plans / Briefs

## 5. Tools — UAT-Mockup › Tools
- ☑ TOOL-1 remove tab bar
- ☑ TOOL-2 logos from Tool Logo
- ☑ TOOL-3 card opens Tool URL in new tab (check whole-card click)
- ☑ TOOL-4 every Tool Library tool; card text = **Product Description** (we use Description — switch); department chips; department filter dropdown; "Fix in Airtable" chip where data missing

## 6. Team Resources — screenshot only
- ☑ TR-1 remove tab bar
- ☑ TR-2 tiles link to ClickUp Resource Hub (SOPs, Manuals) instead of "No link yet" — uses Employee Resources › Link; needs ClickUp URLs
- ☑ TR-3 Professional Development labelled "Phase 3"

## 7. Operations /pics
### 7A top of P.I.C.S tab
- ☑ OPS-1 P.I.C.S Mix + 3 activity cards on one row
- ☑ OPS-2 activity cards clickable → list shows underneath (Active P.I.C.S / Open checklist / Upcoming meetings)
- ☑ OPS-3 Stages below that row, full width, records directly under
- ☑ OPS-4 remove "Execution & Implementation" stage block
- ☑ OPS-5 every type and stage shows records (live data; no example records in prod)
### 7B–7C master card (PICS-Master-Card-v2.html) — wire via its AIRTABLE object shape; hierarchy from P.I.C.S Tag (-S01 sprint, -S01-B1 task, -S01-B1-ST01 subtask, -MTG/-CHK/-DEP meetings, -M1 milestone)
- ☑ OPS-6 type tabs with counts
- ☑ OPS-7 card front: type chip colours, Hierarchy, P.I.C.S Tag, Stage, dates + days left, 2-line Overview, departments, timeline, done % + overdue/due-soon chips, avatars, ⋯, OPEN
- ☑ OPS-8 remove Tasks/Checklist/Meetings/Phases blocks from front
- ☑ OPS-9 ⋯ menu: Share P.I.C.S…, Copy view-only link, Copy summary, Open in Airtable
- ☑ OPS-10 full card header: plain ×, chips, info tiles + Overview tile, "Child of" is a link
- ☑ OPS-11 tree (≈4 rows, scroll, collapse, re-scope on click) beside 8 KPIs (Related P.I.C.S · Phases · Tasks · Checklist · Meetings · Done · Overdue · Coming up)
- ☑ OPS-12 elapsed bar + green Work completed bar, "on pace / behind by n pts"
- ☑ OPS-13 milestones timeline in lanes, hover full name, legend Done/Upcoming/Late/Today
- ☑ OPS-14 "Phase Activity" rename; grey blocks, phase colour tag + bar (1 blue … 10 blue)
- ☑ OPS-15 key T / ST / M / S / MT letter badges
- ☑ OPS-16 each phase → Milestones → Sprints (→ blocks, subtasks) → Tasks → Meetings; no separate Meetings dropdown
- ☑ OPS-17 roadmap row → read-only record by type, breadcrumbs, ← Back; ✎ → full P.I.C.S Roadmaps editor (every column + linked Tasks Planning tasks); Cancel / Save & resync
- ☑ OPS-18 roadmap heatmap week → popup with type filters
- ☑ OPS-19 checklist heatmap week → popup (Due this week / Late / Done / Blocked); "+ Add checklist item" in header
- ☑ OPS-20 checklist drawer: KPI tiles, working checkboxes, status pill, Edit (Checklist Item Name, Number, Item Type, Deliverable (Asset) Type, Due Date, Status, Owner, Reviewer, General Notes, OPANT Notes); Approved = done
- ☑ OPS-21 Feedback & review rounds: open first + Show all; round record (17 columns), Add feedback composer (Feedback/Decision/Action item), attach file, ✎
- ◐ OPS-22 Share dialog (invite, role, sections, Restricted/Anyone, expiry, copy link/summary, Print/PDF, Email) → POST /api/share — copy/print/email work; invites + persistent share links need storage
- ☑ OPS-23 bug fixes: checkboxes editable, heatmap filters not hides, correct overdue, popup label overlap/Task filter, single status control
- ☑ OPS-24 same component on department dashboards via `#dept=<Department>`
- Write hooks: saveRoadmapItem/Draft → P.I.C.S Roadmaps · saveTask → Tasks Planning · saveChecklistItem → P.I.C.S Checklist · saveFeedback → Feedback & Review Rounds
### 7E Reports tab
- ☑ OPS-25 same card design as Productivity › Reports, filtered to Operations
- ☑ OPS-26 Report Overview above Related Department(s)
- ☑ OPS-27 remove "Reporting mirrors…" subtext

## 8. Productivity
- ☑ PROD-1 remove the pipeline note
- ☑ PROD-2 remove platform subtext
- ☑ PROD-3 remove "View full details →"; card is click target
- ☑ PROD-4 remove popup subtitle
- ☑ PROD-5 colour department tags
- ☑ PROD-6 Meeting Overview above tags (hide if empty)
- ☑ PROD-7 Action items section + count (Meetings Master › Action Items → Tasks Planning)
- ☑ PROD-8 ⟳ Sync from recap (ticks Sync Action Items; SUCANT creates tasks; 4 steps + result line; NEW; no duplicates; grey before recap)
- ☑ PROD-9 Sync to roadmap dropdown → Meetings Master › Related P.I.C.S Roadmap + each task's Related Roadmap
- ☑ PROD-10 + Add action item form
- ☑ PROD-11 edit / tick = Completed / remove (unlink vs delete task)
- ☑ PROD-12 auto-save footer "Saving…" → "Synced to Tasks Planning · time"
- ☑ PROD-13 schedule cards: remove "View", card clickable
- ☑ PROD-14 week-number search on Team schedules (we added Prev/Next; add typed week #)
- ☑ PROD-15 same week filter on Checklist activity
- ☑ PROD-16 report card = reference design; add Report Overview above departments
- ☑ PROD-17 remove record-count subtext

## 9. Product
- ☑ PRD-1 remove example-data badge/subtext (live now; remove remaining badge text)
- ☑ PRD-2 remove Launch tab
- ☑ PRD-3 remove example-data banner (also our "Connected to Airtable" banner)
- ☑ PRD-4 remove tab intro lines
- ☑ PRD-5 remove "What is Customer LTV?" block
- ☑ PRD-6 Roadmap tab = P.I.C.S master component, `dept=Product`
- ☑ PRD-7 remove example records/hard-coded chips (live mode already)
- ☑ PRD-8 every P.I.C.S with Related Department(s) contains Product

## 10. Communications → CRM (Communications-CRM-Hub.html)
Tabs: Inbox · Contacts · Pipelines · Campaigns · Insights · Updates. Build order: Inbox → Contacts → Pipelines → Campaigns → Insights → Updates → header/roles/notifications → connections.
- ☑ COM-1 remove subtext; COM tags hidden toggle
- ☑ COM-2 six tabs with counts, title "Communications", spacing 28/24px
- ☑ COM-3 global search (messages, contacts, companies, opportunities); + New menu
- ☑ COM-4 inbox status cards · COM-5 24h promise chip, follow-up task, snooze, close
- ☑ COM-6 left rail views + Inboxes & sites grouped · COM-7 Send from, templates, "Write it for me"
- ☑ COM-8 Contacts People/Companies/Contractors · COM-9 contact drawer · COM-10 views bar, lifecycle stages, duplicate merge · COM-11 + New view filter panel → Saved Views
- ☑ COM-12 pipeline tabs · COM-13 stage strip + opportunity card · COM-14 opportunity drawer · COM-15 Board/List/Forecast, Lost reason, Won → Updates + Slack #wins
- ☑ COM-16 Insights KPIs/charts · COM-17 "Needs your attention" · COM-34 no status cards on Insights
- ☑ COM-18 Updates feed · COM-19 admin composer (Publish To, preview, Deploy)
- ◐ COM-20 new tables (Companies, Opportunities, Pipelines, Pipeline Stages, Activities, Chat Sessions/Messages, Session Page Views, Saved Views, Notification Rules, Alerts, Inbox Sources, Email Campaigns, Campaign Activity) — tables exist; admin gating waits for sign-in
- ☑ COM-21/22/23 chatbot thread, Site journey tab, 24h hand-off countdown
- ◐ COM-24 bell + notification settings + Slack  — bell + settings; no Slack delivery (key needed)· COM-26 admin vs member from Intranet Role
- ☑ COM-25 editable chip cards · COM-27 tasks everywhere → Tasks Planning · COM-28 Nail Networks partnerships + MTA "Start outreach"
- ☑ COM-29 contacts sync/group-by · COM-30 multiple inboxes/sites, community forum, Answer Library · COM-31 reader tabs
- ☑ COM-32 Campaigns tab (Snov.io + Brevo) · COM-33 Contact info / Opportunity tabs ("Opportunity" replaces "Deal") · COM-35 shared stage set · COM-36 channel column/filter
- Connections (backend keys): Email Intake Scan (+isis@vcg.media), Snov.io API, Brevo API, site-form/chatbot/forum webhooks, Slack channels
