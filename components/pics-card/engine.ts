/* eslint-disable */
// @ts-nocheck
/* P.I.C.S MASTER CARD v2 — rendering/interaction engine ported verbatim from PICS-Master-Card-v2.html
   (UPD-01 → UPD-28). It runs inside a shadow root so its CSS can't leak into (or be broken by) the app.
   Differences from the prototype, all marked [APP]:
   - `document` is a shim scoped to the shadow root; data comes from opts.data (live Airtable or snapshot)
   - the write hooks (saveRoadmapItem/saveRoadmapDraft/saveTask/saveChecklistItem/saveFeedback/sharePics) call opts.persist
   - dept / extra filters / deep link / select options come from opts */
import { CARD_CSS, CARD_MARKUP } from "./engine-assets";
import type { CardEngineOptions, CardEngineHandle } from "./types";

export function mountPicsCard(host: HTMLElement, opts: CardEngineOptions): CardEngineHandle {
  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
  shadow.innerHTML = `<style>${CARD_CSS}
.pc-embedded .wrap{max-width:none;padding:0}.pc-embedded #pageTitle,.pc-embedded .wrap>.sub{display:none}${opts.devTools ? "" : ".devbar{display:none}"}</style><div class="pc-body${opts.devTools ? "" : " hide-upd"}${opts.embedded ? " pc-embedded" : ""}">${CARD_MARKUP}</div>`;
  const realDoc = window.document;
  const bodyEl = shadow.querySelector(".pc-body");
  const listeners = [];
  const document = {
    querySelector: (s) => shadow.querySelector(s),
    getElementById: (id) => shadow.getElementById(id),
    addEventListener: (type, fn, cap) => { shadow.addEventListener(type, fn, cap); listeners.push([type, fn, cap]); },
    body: { style: realDoc.body.style, classList: bodyEl.classList },
  };
  const AIRTABLE = opts.data;
  const REQUESTS = [];
  let destroyed = false;
  /* =====================================================================
     DATA LAYER — populated from the Airtable VCG Intranet (base appLH1D7ME6mU1zgE)
     AIRTABLE (above) is a snapshot pulled Nov 3, 2026 from:
       P.I.C.S (tblbiIHxN97iyltFY) · P.I.C.S Roadmaps (tblTo1C185aBEIshk) · Tasks Planning (tblyOuPIvgifN4OOQ)
       P.I.C.S Checklist (tbl8Nm9AL749eBLZC) · Feedback & Review Rounds (tblh2CY3dxTaXlUfm)
     DEV: replace AIRTABLE with the /api/pics/* responses in the same shape and call loadAirtable().
     ===================================================================== */
  let TODAY = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();
  const D = s => new Date(s + 'T00:00:00');
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; // local, timezone-safe
  const addDays = (s,n) => { const d = D(s); d.setDate(d.getDate()+n); return iso(d); };
  const fmt = s => s ? D(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';
  const fmtY = s => s ? D(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const fmtLong = s => D(s).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const isoWeek = s => { const d = D(s); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-day); const y0 = new Date(Date.UTC(t.getUTCFullYear(),0,1)); return Math.ceil(((t-y0)/864e5+1)/7); };
  const monthKey = s => D(s).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const monthName = s => D(s).toLocaleDateString('en-US',{month:'long'});
  const quarterOf = s => 'Q'+(Math.floor(D(s).getMonth()/3)+1);
  const plural = (n,w) => n + ' ' + w + (n===1?'':'s');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const initials = n => String(n||'').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const PHASE_COLOR = { /* Airtable Phase select colors: blueLight2, cyanLight2, tealLight2, greenLight2, yellowLight2, orangeLight2, redLight2, purpleLight1, pinkBright, blueLight1 */
    'Phase 1':['#e0eaff','#2f5bd3'], 'Phase 2':['#dcf4fd','#0b7aa3'], 'Phase 3':['#d5f7ee','#0d8a72'], 'Phase 4':['#e0f8d8','#2f8a19'], 'Phase 5':['#fff1c7','#a87300'],
    'Phase 6':['#ffe7db','#c4501a'], 'Phase 7':['#ffe0e8','#c41f4b'], 'Phase 8':['#ece2ff','#6b3fd1'], 'Phase 9':['#ffe0f4','#c0168b'], 'Phase 10':['#d6e6ff','#1f4fb8'] };
  const phStyle = n => { const c = PHASE_COLOR[n] || ['#eef0f5','#4a4f5c']; return `--pc:${c[0]};--pt:${c[1]}`; };
  const phTag = n => `<span class="ph-tag" style="${phStyle(n)}">${esc(n)}</span>`;
  const kindOf = t => t==='Sprint'?'sprint': t==='Milestone'?'milestone': t==='Meeting'?'meeting':'task';

  /* Airtable select options (schema, Nov 3 2026) */
  const OPT = {
    roadmapType: ['Discovery','Initiation','Task','Subtask','Sprint','Milestone','Feedback & Review','Closed','Meeting'],      // fld3OQAOgZQl5g6ZP
    phase: ['Phase 1','Phase 2','Phase 3','Phase 4','Phase 5','Phase 6','Phase 7','Phase 8','Phase 9','Phase 10'],          // fldhJzEOVmjN3OPMw
    stage: ['Not Started','Discovery','Strategy & Negotiation','Facilitation & Negotiation','Execution','Implementation','Launch','Engagement & Measurement','Assessment','Closed','Paused','Ongoing'], // fldlA3cpvYSReuOVn
    status: ['Not Started','Planning','In Progress','At Risk','Delayed','In Review','Completed','Cancelled'],                // fldMVHS5ztNrhnwFi
    tagStatus: ['Tagged','Needs Review','Archived'],
    depts: ['Executive','Success','Operations','Product','Marketing & Sales','Creative','PR & Media','Social Impact','Production/Fabrication','Legal & Compliance','Finance','HR','External'],
    team: [],                                                                                                               // filled from data
    taskType: ['Task','Action Item','Milestone','Roadmap','Professional Development','Meeting'],
    taskStatus: ['Not Started','Planning','In Progress','Delayed','Overdue','At Risk','In Review','Completed','Not Completed'],
    priority: ['High','Medium','Low','Closed','Paused'],
    clStatus: ['Not Started','In Progress','In Review','Blocked','Approved','Rejected','Completed'],                         // fldN0OXB6xhKP57Zx
    clItemType: ['Task','Deliverable'],                                                                                     // fldmV66OHFncsWLSd
    clAsset: ['Web','Report','Document','Video','Image','Multimedia','Feature','Code'],                                      // flddzG2oFJcDBCuxA
  };

  let PICS = [], ROADMAP = [], TASKS = [], CHECKLISTS = [], CITEMS = [], FEEDBACK = [];
  let rid = 0, tid = 0, cid = 0;
  const short = t => String(t||'').replace(/^.*?\bP\d+\s+(?:S\d+|M\d+|B\d+)(?: Sprint)?:\s*/,'').trim();   // "GTM Campaign P2 M1: Campaign Shoot Complete" → "Campaign Shoot Complete"   // "MVP Build P1 S01: Home Page Build" → "Home Page Build"
  const levelOf = r => r.rType==='Sprint' ? 'sprint' : r.rType==='Milestone' ? 'milestone' : r.rType==='Meeting' ? 'meeting' : /-ST\d+$/.test(r.tag) ? 'subtask' : 'block';

  function loadAirtable(A){
    const trim = a => (a||[]).map(x=>String(x).trim()).filter(Boolean);
    PICS = A.pics.map(p => ({...p, leads: trim(p.leads)}));
    const fbById = Object.fromEntries(A.feedback.map(f => [f.id, f]));
    ROADMAP = A.roadmap.map(r => ({
      id: r.id, pics: r.pics, rType: r.rType||'Task', kind: kindOf(r.rType), title: r.title, start: r.start||r.date, date: r.date||r.start,
      status: (r.status||'Not Started').trim(), stage: (r.stage||'Not Started').trim(), phase: r.phase||'Phase 1',
      tag: r.tag, tagStatus: r.tagStatus, sprintNo: r.sprintNo, relPics: trim(r.relPics), depts: trim(r.depts), assignee: trim(r.assignee),
      deliverables: trim(r.deliverables), briefs: trim(r.briefs), goals: trim(r.goals), reports: trim(r.reports),
      feedback: r.feedbackIds.map(id => fbById[id]?.title).filter(Boolean), feedbackIds: r.feedbackIds,
      checklistItemIds: r.checklistIds, tasks: r.taskIds.slice(), dependencies: r.dependencies||'', notes: r.notes||'', syncFlag: !!r.syncFlag, sync: 'Synced',
    }));
    ROADMAP.forEach(r => { r.level = levelOf(r); r.short = short(r.title); });
    // hierarchy from P.I.C.S Tag: ACR-MVP-S01 › ACR-MVP-S01-B1 › ACR-MVP-S01-B1-ST01 ; meetings ACR-MVP-S01-MTG/CHK/DEP
    const byTag = Object.fromEntries(ROADMAP.map(r => [r.tag, r]));
    ROADMAP.forEach(r => {
      const m = r.tag.match(/^(.*-S\d+)(-.+)?$/);
      r.sprintTag = m ? m[1] : null;
      r.parentId = r.level==='subtask' ? byTag[r.tag.replace(/-ST\d+$/,'')]?.id : (r.level==='block'||r.level==='meeting') ? byTag[r.sprintTag]?.id : null;
      if (r.level==='meeting') { r.meetingKind = /-CHK$/.test(r.tag) ? 'Check-in' : /-DEP$/.test(r.tag) ? 'Deployment Review' : 'Sprint Review'; const n = (r.tag.match(/-S(\d+)-/)||[])[1]; if (n) r.short = `Sprint ${n} ${r.meetingKind}`; }
    });
    TASKS = A.tasks.map(t => { const all = trim(t.assignee); return {...t, assignee: all.find(a=>a!=='External') || all[0] || '', assigneeAll: all, status: t.status||'Not Started'}; });
    // P.I.C.S Checklist items are grouped into one checklist per Related Roadmap block
    CITEMS = A.checklist.map(c => ({...c, checklist: 'cl-' + (c.roadmapIds[0] || 'none'), owner: trim(c.owner), reviewer: trim(c.reviewer)}));
    const groups = {};
    CITEMS.forEach(i => { if (!groups[i.checklist]) { const r = ROADMAP.find(x => 'cl-'+x.id === i.checklist); groups[i.checklist] = {id: i.checklist, roadmap: r?.id, pics: r?.pics || 'recjFkr8UYbua4e0Y', name: r ? r.short : 'Unlinked checklist items', phase: r?.phase || 'Phase 1', tag: r?.tag}; } });
    CHECKLISTS = Object.values(groups);
    ROADMAP.forEach(r => { r.checklists = [...new Set(r.checklistItemIds.map(id => CITEMS.find(i=>i.id===id)?.checklist).filter(Boolean))]; });
    // Feedback rounds: attach to the sprint P.I.C.S named in the title (S05 → ACR-MVP-S05), milestones stay on the project
    FEEDBACK = A.feedback.map(f => ({...f, reviewer: trim(f.reviewers).join(', '), link: f.url, file: '',
      notes: f.notes || (ROADMAP.find(r => r.level==='milestone' && r.feedbackIds.includes(f.id))?.notes) || ''}));
    OPT.team = [...new Set([...PICS.flatMap(p=>p.leads), ...ROADMAP.flatMap(r=>r.assignee), ...TASKS.flatMap(t=>t.assigneeAll)])].sort();
  }
  loadAirtable(AIRTABLE);
  /* [APP] live select choices (schema) replace the prototype's hard-coded lists */
  (function applyOptions(o){ if (!o) return; for (const k of Object.keys(OPT)) if (k!=='team' && Array.isArray(o[k]) && o[k].length) OPT[k] = o[k]; })(opts.data.options);
  const CURRENT_USER = opts.userName || 'Dashboard user';
  const VIEW_BASE = opts.viewBase || '/pics';
  const viewLink = (kind, id) => { const pid = kind==='fb' ? (fbById(id)?.pics || '') : id; return `${location.origin}${VIEW_BASE}?open=${encodeURIComponent(pid)}`; };
  const findPics = key => { const k = String(key||'').trim().toLowerCase(); return PICS.find(p=>p.id===key) || PICS.find(p=>(p.tag||'').toLowerCase()===k || p.name.toLowerCase()===k); };
  function byIdRaw(id){ return PICS.find(p=>p.id===id); }

  /* =====================================================================
     LOGIC
     ===================================================================== */
  const $ = s => document.querySelector(s);
  const byId = id => PICS.find(p => p.id === id);
  const children = id => PICS.filter(p => p.parent === id).sort((a,b)=>((a.type==='Sprint')-(b.type==='Sprint')) || String(a.start).localeCompare(String(b.start)));
  const descendants = id => children(id).flatMap(c => [c, ...descendants(c.id)]);
  const scopeIds = id => [id, ...descendants(id).map(p => p.id)];
  const ancestors = id => { const out=[]; let p = byId(id); while (p && p.parent){ p = byId(p.parent); out.unshift(p);} return out; };
  const isDone = s => /^(completed|done|approved)$/i.test(String(s).trim());
  const isLate = (date, status) => !isDone(status) && D(date) < TODAY;               // [UPD-06] overdue = past due AND not complete (date-driven, not only a status flag)
  const isSoon = (date, status) => !isDone(status) && D(date) >= TODAY && (D(date) - TODAY) / 864e5 <= 14;
  const statusChip = s => { s=String(s||'').trim(); const c = isDone(s)?'ok': /risk|block|reject|delay/i.test(s)?'warn': /cancel/i.test(s)?'': /progress|review|assess/i.test(s)?'brand':''; return `<span class="chip ${c}">${esc(s)}</span>`; };
  const kindBadge = (k,n) => { const l = k==='task' ? (n==='ST'?'ST':'T') : k==='milestone' ? 'M' : k==='sprint' ? 'S' : 'MT'; return `<span class="badge k-${k}${l.length>1?' two':''}" title="${l==='ST'?'Subtask':k==='task'?'Task':k[0].toUpperCase()+k.slice(1)}">${l}</span>`; };  // [UPD-26] letters, not numbers/dots
  const kindLabel = k => ({task:'Task',milestone:'Milestone',sprint:'Sprint',meeting:'Meeting'}[k]);
  const heatClass = n => n===0?'h0': n<=2?'h1': n<=5?'h2':'h3';
  const pct = (a,b) => b ? Math.round(a/b*100) : 0;
  const U = id => `<span class="upd">${id}</span>`;

  function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2200); }

  /* Scope helpers — everything in the modal is computed for the selected tree node + its descendants */
  function scopeData(id){
    const ids = scopeIds(id);
    const rm = ROADMAP.filter(r => ids.includes(r.pics));
    const cls = CHECKLISTS.filter(c => ids.includes(c.pics));
    const ci = CITEMS.filter(i => cls.some(c => c.id === i.checklist));
    return {ids, rm, cls, ci};
  }
  function rollup(id){
    const {rm, ci} = scopeData(id);
    const work = rm.filter(r => r.kind !== 'meeting');
    const done = work.filter(r => isDone(r.status)).length;
    const late = work.filter(r => isLate(r.date, r.status)).length + ci.filter(i => isLate(i.due, i.status)).length;
    const soon = rm.filter(r => isSoon(r.date, r.status)).length + ci.filter(i => isSoon(i.due, i.status)).length;
    return {work: work.length, done, late, soon, inside: descendants(id).length, ciDone: ci.filter(i=>isDone(i.status)).length, ciTotal: ci.length, ciLate: ci.filter(i=>isLate(i.due,i.status)).length};
  }

  /* ---------------- GRID CARDS ---------------- */
  let typeFilter = opts.initialType || 'Campaign';
  let EXT_FILTER = opts.filter || null;
  /* [UPD-28] Department dashboards (e.g. /product#roadmap) render this same master component, filtered by P.I.C.S › Related Department(s).
     URL contract: #dept=Product  (or ?dept=Product). Empty = Operations master view (all P.I.C.S). */
  let deptFilter = opts.dept || decodeURIComponent((location.hash.match(/dept=([^&]+)/)||location.search.match(/dept=([^&]+)/)||[])[1]||'');
  const inDept = () => (deptFilter ? PICS.filter(p => p.depts.includes(deptFilter)) : PICS).filter(p => !EXT_FILTER || EXT_FILTER(p));
  function renderTabs(){
    const types = ['Initiative','Campaign','Project','Sprint','BAU','Milestone','All'];
    const n = t => t==='All' ? inDept().length : inDept().filter(p=>p.type===t).length;
    $('#typeTabs').innerHTML = types.map(t => `<button class="${t===typeFilter?'on':''}" data-type="${t}">${t} <span class="muted" style="font-weight:500">${n(t)}</span></button>`).join('');
  }
  function renderGrid(){
    const recs = inDept().filter(p => typeFilter==='All' || p.type===typeFilter);
    $('#grid').innerHTML = recs.length ? recs.map(cardHTML).join('') : `<div class="empty">No ${typeFilter} records.</div>`;
  }
  function cardHTML(p){
    const {rm, cls, ci} = scopeData(p.id);
    const r = rollup(p.id);
    const elapsed = Math.max(0, Math.min(100, pct(TODAY - D(p.start), D(p.end) - D(p.start))));
    const parent = p.parent ? byId(p.parent) : null;
    const kids = children(p.id).length;
    const daysLeft = Math.max(0, Math.round((D(p.end)-TODAY)/864e5));
    const tasks = rm.filter(x=>x.kind!=='meeting').length, meets = rm.filter(x=>x.kind==='meeting').length;
    const phases = new Set(rm.filter(x=>x.kind!=='meeting').map(x=>x.phase)).size;
    const donePct = pct(r.done, r.work);
    return `<article class="rcard">
      <div class="between"><div class="rel">${parent ? `↳ Child of ${esc(parent.name)}` : kids ? `Parent · ${plural(kids,'child record')}` : '&nbsp;'}</div><button type="button" class="x sm" data-menu="${p.id}" title="More: share, copy link, export" aria-label="More actions for ${esc(p.name)}">⋯</button></div>
      <div class="between"><span class="row" style="gap:6px"><span class="chip brand t-${p.type.toLowerCase()}">${p.type}</span>${p.hierarchy?`<span class="chip">${esc(p.hierarchy)}</span>`:''}${p.tag?`<span class="chip mono">${esc(p.tag)}</span>`:''}</span><span class="chip stage">${esc(p.stage)}</span></div>
      <div><h3>${esc(p.name)}</h3><div class="muted" style="font-size:12.5px;margin-top:3px">${fmt(p.start)} → ${fmt(p.end)} · ${daysLeft} days left</div></div>
      ${p.overview?`<p class="ov">${esc(p.overview)}</p>`:''}
      <div class="row">${p.depts.map(d=>`<span class="chip">${esc(d)}</span>`).join('')}</div>
      <div><div class="between" style="font-size:12.5px;margin-bottom:6px"><span class="ink2">Timeline</span><span class="ink2">${elapsed}% elapsed</span></div><div class="bar"><i style="width:${elapsed}%"></i></div></div>
      <div>${U('UPD-10')}<div class="between" style="font-size:12.5px;margin:4px 0 6px"><span class="ink2">${r.done} of ${r.work} roadmap items done</span><b style="color:${donePct>=50?'var(--ok)':'var(--warn)'}">${donePct}%</b></div><div class="bar done ${donePct>=50?'good':''}"><i style="width:${donePct}%"></i></div>
        <div class="mini-chips">${r.late?`<span class="chip bad">! ${r.late} overdue</span>`:`<span class="chip ok">✓ nothing overdue</span>`}${r.soon?`<span class="chip">${r.soon} due soon</span>`:''}</div></div>
      <div class="between"><div class="avatars">${p.leads.slice(0,4).map((l,i)=>`<span class="av ${i%2?'b':''}" title="${esc(l)}">${initials(l)}</span>`).join('')}${p.leads.length>4?`<span class="av">+${p.leads.length-4}</span>`:''}</div><button class="btn dark" data-open="${p.id}">OPEN</button></div>
    </article>`;
  }

  /* ---------------- MODAL ---------------- */
  const S = { root:null, scope:null, odPage:0, cuPage:0, open:new Set(), clWeek:null, clPage:0, clFilter:'All', clShow:true, editing:null };
  function openModal(id){
    S.root = id; S.scope = id; S.treeOpen = null; S.fbAll = false; S.odPage = S.cuPage = S.clPage = 0; S.clWeek = null; S.clFilter='All'; S.clShow = false; S.open = new Set();
    renderModal(); $('#ov').classList.add('open'); $('#mBody').scrollTop = 0; document.body.style.overflow='hidden';
  }
  function renderModal(){
    const root = byId(S.root), sc = byId(S.scope);
    $('#mTitle').textContent = root.name; $('#mMenu').dataset.menu = root.id;
    $('#mChips').innerHTML = `<span class="chip brand t-${root.type.toLowerCase()}">${root.type}</span>${root.hierarchy?`<span class="chip">${esc(root.hierarchy)}</span>`:''}${root.tag?`<span class="chip mono">${esc(root.tag)}</span>`:''}<span class="chip stage">${esc(root.stage)}</span>`;
    const keepScroll = $('#mBody').scrollTop;
    $('#mBody').innerHTML = [secInfo(root), secHierarchy(sc), secTimeline(sc), secMilestones(sc), secRoadmap(sc), secHeat(sc), secFeedback(sc), secChecklists(sc)].join('');
    $('#mBody').scrollTop = keepScroll;
    const t = $('#picsTree'), on = t && t.querySelector('.node.on'); if (on) t.scrollTop = on.offsetTop - t.offsetTop - 6;
  }

  function secInfo(p){
    const parent = p.parent ? byId(p.parent) : null; const kids = children(p.id);
    return `<div class="sec"><div class="tiles">
      <div class="tile"><div class="label">Timeline</div><div class="v">${fmt(p.start)} → ${fmt(p.end)}</div></div>
      <div class="tile"><div class="label">Project leads</div><div class="v">${p.leads.join(', ')}</div></div>
      <div class="tile"><div class="label">Related department(s)</div><div class="v">${p.depts.join(', ')}</div></div>
      <div class="tile"><div class="label">Relationship</div><div class="v">${parent?`Child of <button class="link" data-openp="${parent.id}">${esc(parent.name)}</button>`:''}${parent&&kids.length?'<br>':''}${kids.length?`Parent of ${plural(kids.length,'record')}`:''}${!parent&&!kids.length?'Standalone':''}</div></div>
    </div>${p.overview?`<div class="tile" style="margin-top:12px"><div class="label">Overview</div><p class="rv-p" style="margin-top:6px">${esc(p.overview)}</p></div>`:''}</div>`;
  }

  /* [UPD-01] Hierarchy tree  ·  [UPD-02] KPI tiles + progress by phase */
  function secHierarchy(sc){
    const top = ancestors(S.root)[0] || byId(S.root);
    const rows = [];
    if (!S.treeOpen) S.treeOpen = new Set([...ancestors(S.scope).map(p=>p.id), S.scope, ...ancestors(S.root).map(p=>p.id), S.root]);
    const walk = (p, depth) => { rows.push({p, depth}); if (S.treeOpen.has(p.id)) children(p.id).forEach(c => walk(c, depth+1)); };
    walk(top, 0);
    const tree = rows.map(({p,depth}) => `<button class="node ${p.id===S.scope?'on':''}" data-scope="${p.id}" style="padding-left:${10+depth*18}px">${depth?'<span class="elb">└</span>':''}<span class="t">${p.type}</span><span>${esc(p.name)}</span>${p.id===S.root?'<span class="self">THIS CARD</span>':''}${children(p.id).length?`<span class="caret" data-tree="${p.id}" title="${S.treeOpen.has(p.id)?'Collapse':'Expand'}">${S.treeOpen.has(p.id)?'▾':'▸'} ${children(p.id).length}</span>`:''}</button>`).join('');
    const r = rollup(sc.id);
    const {rm} = scopeData(sc.id);
    return `<div class="sec"><div class="hier">
      <div class="tree-col"><div class="between" style="margin:0 0 8px 4px"><span class="label">View level · parent to child ${U('UPD-01')}</span>${S.scope!==S.root?`<button class="link sm" data-scope="${S.root}">↺ Back to this card</button>`:''}</div><div class="tree" id="picsTree">${tree}</div></div>
      <div>
        <div class="muted" style="font-size:12px">${sc.type} · ${fmt(sc.start)} – ${fmt(sc.end)}</div>
        <div style="font-size:19px;font-weight:800;margin:2px 0 12px">${esc(sc.name)} ${U('UPD-02')}</div>
        <div class="kpis">
          <div class="kpi"><b style="color:var(--brand)">${r.inside||'—'}</b><div class="n">Related P.I.C.S</div><div class="s">mapped to this card</div></div>
          <div class="kpi"><b>${new Set(rm.filter(x=>x.kind!=='meeting').map(x=>x.phase)).size}</b><div class="n">Phases</div><div class="s">roadmap phases</div></div>
          <div class="kpi"><b>${rm.filter(x=>x.kind!=='meeting').length}</b><div class="n">Tasks</div><div class="s">roadmap items</div></div>
          <div class="kpi"><b>${scopeData(sc.id).ci.length}</b><div class="n">Checklist</div><div class="s">checklist items</div></div>
          <div class="kpi"><b>${rm.filter(x=>x.kind==='meeting').length}</b><div class="n">Meetings</div><div class="s">scheduled meetings</div></div>
          <div class="kpi"><b style="color:${r.work?'var(--ok)':'var(--muted)'}">${r.work?pct(r.done,r.work)+'%':'—'}</b><div class="n">Done</div><div class="s">${r.done} of ${r.work} items</div></div>
          <div class="kpi"><b style="color:${r.late?'var(--bad)':'var(--ok)'}">${r.late}</b><div class="n">Overdue</div><div class="s">roadmap + checklist items</div></div>
          <div class="kpi"><b style="color:var(--brand)">${r.soon}</b><div class="n">Coming up</div><div class="s">due in the next 2 weeks</div></div>
        </div>
      </div></div></div>`;
  }

  function secTimeline(sc){
    const elapsed = Math.max(0, Math.min(100, pct(TODAY - D(sc.start), D(sc.end) - D(sc.start))));
    const r = rollup(sc.id); const dp = pct(r.done, r.work);
    return `<div class="sec"><div class="sec-h"><h4>Task timeline progress</h4></div>
      <div class="between muted" style="font-size:12px;margin-bottom:8px"><span>${fmt(sc.start)}</span><span class="ink2">${elapsed}% elapsed</span><span>${fmt(sc.end)}</span></div>
      <div class="bar"><i style="width:${elapsed}%"></i></div>
      <div class="between" style="font-size:12px;margin:12px 0 8px"><span class="ink2">Work completed ${U('UPD-10')}</span><b style="color:${dp>=elapsed?'var(--ok)':'var(--warn)'}">${dp}% done${r.work?` · ${dp>=elapsed?'on pace':'behind pace by '+(elapsed-dp)+' pts'}`:''}</b></div>
      <div class="bar done good"><i style="width:${dp}%"></i></div></div>`;
  }

  /* [UPD-03] Milestones timeline */
  function secMilestones(sc){
    const {rm} = scopeData(sc.id);
    const ms = rm.filter(r=>r.kind==='milestone').sort((a,b)=>a.date.localeCompare(b.date));
    if (!ms.length) return `<div class="sec"><div class="sec-h"><h4>Milestones ${U('UPD-03')}</h4></div><div class="empty">No milestones set on this P.I.C.S.</div></div>`;
    const s = D(sc.start), e = D(sc.end), span = e - s || 1;
    const pos = d => Math.max(0, Math.min(100, (D(d)-s)/span*100));
    const groups = {}; ms.forEach(m => (groups[m.date] ||= []).push(m));
    const todayPos = Math.max(0, Math.min(100, (TODAY-s)/span*100));
    // [UPD-25] lay labels out in lanes so close dates never overlap (above 1, below 1, above 2, below 2, …)
    const W = Math.max(320, ($('#mBody')?.clientWidth || 860) - 68), LW = 190, GAP = 10;
    const lanes = [];   // per lane: right edge (px) of the last label placed
    const items = Object.entries(groups).map(([d, list]) => {
      const late = list.some(m=>isLate(m.date,m.status)), done = list.every(m=>isDone(m.status));
      const title = list.length>1 ? `${list.length} milestones` : (list[0].short||list[0].title);
      const x = pos(d)/100*W, w = Math.min(LW, Math.max(84, title.length*7.3 + 10));
      const left = Math.max(0, Math.min(W - w, x - w/2));
      let lane = lanes.findIndex(r => r + GAP <= left); if (lane < 0) { lane = lanes.length; lanes.push(0); } lanes[lane] = left + w;
      return {d, list, late, done, title, left, w, lane};
    });
    const up = Math.ceil(lanes.length/2), down = Math.floor(lanes.length/2), LH = 34;
    const track = 12 + up*LH;                         // y of the timeline track
    const marks = items.map(it => {
      const above = it.lane % 2 === 0, row = Math.floor(it.lane/2);
      const top = above ? track - 22 - (row+1)*LH + 6 : track + 22 + row*LH;
      return `<div class="dm ${it.done?'done':it.late?'late':''}" style="left:${pos(it.d)}%;top:${track-6}px" title="${esc(it.list.map(m=>(m.short||m.title)+' — '+m.status).join('\n'))}" data-ms="${it.d}" tabindex="0"></div>
        <div class="lbl" style="left:${it.left}px;top:${top}px;width:${it.w}px" data-ms="${it.d}"><b>${esc(it.title)}</b><span class="muted">${fmt(it.d)}${it.late?' · late':it.done?' · done':''}</span>
        <span class="stem" style="left:${Math.round(pos(it.d)/100*W - it.left)}px;${above?`top:100%;height:${track-6-top-LH+12}px`:`bottom:100%;height:${top-track-8}px`}"></span></div>`;
    }).join('');
    const H = track + 22 + Math.max(1,down)*LH;
    return `<div class="sec"><div class="sec-h"><h4>Milestones <small>${plural(ms.length,'milestone')}</small> ${U('UPD-03')}</h4></div>
      <div class="mtl" style="height:${H}px;width:${W}px;max-width:100%"><div class="track" style="top:${track}px"></div><div class="prog" style="width:${todayPos}%;top:${track}px"></div><div class="today" style="left:${todayPos}%;top:${track-14}px"></div>${marks}</div>
      <div class="legend" style="margin-top:8px"><span><i style="background:var(--ms)"></i>Done</span><span><i style="border:2px solid var(--ms);background:#fff"></i>Upcoming</span><span><i style="border:2px solid var(--bad);background:#fff"></i>Late</span><span><i style="background:var(--bad);width:3px"></i>Today</span><span class="muted">Hover or focus a milestone to read its full name · click to open</span></div></div>`;
  }



  /* Existing: Roadmap heatmap → week popup (fixed filters + counts) */
  function weekBuckets(items, dateKey){
    if (!items.length) return [];
    const ds = items.map(i=>i[dateKey]).filter(Boolean).sort(); const mon = x => { const d = D(x); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return iso(d); };
    const out = []; for (let m = mon(ds[0]); m <= ds[ds.length-1]; m = addDays(m,7)) { const w = isoWeek(m); out.push({w, mon:m, items:items.filter(i=>i[dateKey] && isoWeek(i[dateKey])===w && i[dateKey]>=m && i[dateKey]<addDays(m,7))}); }
    return out;   // iterates Mondays, so Wk52 → Wk1 across the year boundary works
  }
  function secHeat(sc){
    const {rm} = scopeData(sc.id);
    const b = weekBuckets(rm.filter(r=>r.kind!=='meeting'), 'date');
    return `<div class="sec"><div class="sec-h"><h4>Roadmap heatmap (tasks by week #) <small>${b.length?`Wk${b[0].w}–Wk${b[b.length-1].w}`:''}</small></h4></div>
      ${b.length?`<div class="heat">${b.map(x=>`<div class="hcell"><button class="${heatClass(x.items.length)} ${x.items.some(i=>isLate(i.date,i.status))?'late':''}" data-week="${x.w}" title="Wk${x.w}: ${plural(x.items.length,'item')}">${x.items.length}</button><span>Wk${x.w}</span></div>`).join('')}</div>
      <div class="hleg"><span><i class="h0"></i>0</span><span><i class="h1"></i>1–2 · light</span><span><i class="h2"></i>3–5 · medium</span><span><i class="h3"></i>6+ · dark</span><span><i style="box-shadow:inset 0 0 0 2px var(--bad)"></i>has overdue</span></div>`:'<div class="empty">No dated roadmap items.</div>'}</div>`;
  }
  let weekState = {w:null, kind:null};
  function openWeek(w){
    weekState = {w, kind:null}; renderWeek(); raise('weekOv'); $('#weekOv').classList.add('open');
  }
  function renderWeek(){
    const {rm} = scopeData(S.scope);
    const items = rm.filter(r=>isoWeek(r.date)===weekState.w);
    $('#wTitle').innerHTML = `Week ${weekState.w} <small class="muted" style="font-size:13px;font-weight:500">${plural(items.length,'item')}</small>`;
    $('#wSub').textContent = byId(S.scope).name;
    const kinds = ['task','milestone','sprint','meeting'];
    const shown = weekState.kind ? items.filter(i=>i.kind===weekState.kind) : items; // [UPD-12] filter only returns that type
    let n=0;
    $('#wBody').innerHTML = `<div class="kbox">${kinds.map(k=>`<button class="${weekState.kind===k?'on':''}" data-wk="${k}">${kindBadge(k,1)}<span>${k==='task'?'Task/Subtask':kindLabel(k)}</span><span class="cnt">${items.filter(i=>i.kind===k).length}</span></button>`).join('')}<button class="${!weekState.kind?'on':''}" data-wk="">All<span class="cnt">${items.length}</span></button></div>
      <div style="margin-top:10px">${shown.map(r=>{ if(r.kind==='task') n++; return `<div class="ritem" style="background:var(--plane)" data-rv="${r.id}">${kindBadge(r.kind,n)}<div class="main"><div class="tt">${esc(r.short||r.title)}</div><div class="meta"><span>${fmt(r.date)}</span><span>Wk${isoWeek(r.date)}</span>${statusChip(r.status)}</div></div><span class="chip">${esc(TYPE_NAME[r.level]||kindLabel(r.kind))}</span></div>`}).join('') || '<div class="empty">Nothing of this type this week.</div>'}</div>`;
  }

  function secFeedback(sc){
    const fb = FEEDBACK.filter(f=>scopeIds(sc.id).includes(f.pics)).sort((a,b)=>a.due.localeCompare(b.due));
    const open = fb.filter(f=>!isDone(f.status)); const shown = S.fbAll ? fb : (open.length ? open.slice(0,4) : fb.slice(-4));
    return `<div class="sec"><div class="sec-h"><h4>Feedback &amp; review rounds <small>${plural(fb.length,'round')} · ${fb.length-open.length} approved</small></h4>${fb.length>shown.length||S.fbAll?`<button class="link" data-fball>${S.fbAll?'Show open rounds':'Show all '+fb.length}</button>`:''}</div>
      <div class="fbgrid">${shown.map(f=>{ const i=FEEDBACK.indexOf(f); return `<div class="fb click" data-fbopen="${f.id}" tabindex="0" role="button" aria-label="Open ${esc(f.title)}"><div class="between"><h5>${esc(short(f.title.replace(' Review Round',' review').replace(' UAT Round',' UAT')))}</h5>${statusChip(f.status)}</div>
        <div class="row" style="margin-top:6px"><span class="chip">${esc(f.type)} · Round ${f.round}</span><span class="chip ${isLate(f.due,f.status)?'bad':''}">Due ${fmt(f.due)}</span><span class="chip">Reviewer: ${esc(f.reviewer)}</span></div>
        ${f.link?`<div style="margin-top:8px"><a class="link" href="${esc(f.link)}" target="_blank" rel="noopener">Review link ↗</a></div>`:''}
        <div class="row" style="margin-top:8px"><button class="link" data-fb="${i}">Show notes</button><span class="go" style="margin-left:auto">Open ›</span></div><div class="notes">${esc(f.notes)}</div></div>`; }).join('') || '<div class="empty">No feedback rounds.</div>'}</div></div>`;
  }

  /* [UPD-05..09] Checklists: group cards → drawer, fixed heatmap, working checkboxes */
  function secChecklists(sc){
    const {cls, ci} = scopeData(sc.id);
    const b = weekBuckets(ci, 'due');
    const late = ci.filter(i=>isLate(i.due,i.status)).length;
    return `<div class="sec"><div class="sec-h"><h4>Checklist heatmap <small>${b.length?`Wk${b[0].w}–Wk${b[b.length-1].w} · `:''}${plural(ci.length,'item')} · ${plural(cls.length,'checklist')} · <span style="color:${late?'var(--bad)':'inherit'}">${late} overdue</span></small> ${U('UPD-06')}</h4><span class="row"><button class="btn sm" data-add="checklist">＋ Add checklist item</button><button class="link" data-clshow>${S.clShow?'Hide full checklist':'Show full checklist'}</button></span></div>
      ${b.length?`<div class="heat">${b.map(x=>`<div class="hcell"><button class="${heatClass(x.items.filter(i=>!isDone(i.status)).length)} ${x.items.some(i=>isLate(i.due,i.status))?'late':''} ${S.clWeek===x.w?'on':''}" data-clweek="${x.w}" title="Wk${x.w}: ${plural(x.items.length,'item')}">${x.items.length}</button><span>Wk${x.w}</span></div>`).join('')}</div>
      <div class="hleg"><span><i class="h0"></i>0 open</span><span><i class="h1"></i>1–2</span><span><i class="h2"></i>3–5</span><span><i class="h3"></i>6+</span><span><i style="box-shadow:inset 0 0 0 2px var(--bad)"></i>has overdue</span><span>· click a week to open its checklists ${U('UPD-07')}</span></div>`:'<div class="empty">No checklists on this level.</div>'}
      ${S.clShow ? checklistList(ci, 'main') : ''}</div>`;
  }
  /* [UPD-05/07] Checklist week popup — opens like the roadmap week popup and shows that week's checklist cards */
  function openClWeek(w){ S.clWeek = w; S.cwFilter = 'all'; renderClWeek(); raise('clwOv'); $('#clwOv').classList.add('open'); }
  function renderClWeek(){
    if (!S.clWeek) return;
    const {cls, ci} = scopeData(S.scope);
    const wkItems = ci.filter(i=>isoWeek(i.due)===S.clWeek);
    const F = {all:()=>true, late:i=>isLate(i.due,i.status), done:i=>isDone(i.status), blocked:i=>i.status==='Blocked'};
    const f = F[S.cwFilter||'all'];
    const wkCls = cls.filter(c => wkItems.some(i=>i.checklist===c.id && f(i)));
    $('#cwTitle').innerHTML = `Week ${S.clWeek} <small class="muted" style="font-size:13px;font-weight:500">${plural(wkItems.length,'checklist item')}</small>`;
    $('#cwSub').textContent = byId(S.scope).name;
    const groups = wkCls.map(c => { const it = CITEMS.filter(i=>i.checklist===c.id); const inWk = it.filter(i=>isoWeek(i.due)===S.clWeek).length; const next = it.filter(i=>!isDone(i.status)).sort((a,b)=>a.due.localeCompare(b.due))[0];
      const late = it.filter(i=>isLate(i.due,i.status)).length, soon = it.filter(i=>isSoon(i.due,i.status)).length, done = it.filter(i=>isDone(i.status)).length;
      return `<button class="cg" data-cl="${c.id}"><div class="between"><span class="chip brand">${c.phase}</span><span class="muted" style="font-size:12px">${esc(byId(c.pics).name)}</span></div><b style="font-size:14px">${esc(c.name)}</b><span class="muted" style="font-size:12px">${plural(it.length,'item')} · <b style="color:var(--brand)">${inWk} due Wk${S.clWeek}</b>${next?` · next due ${fmt(next.due)}`:''}</span>
        <div class="between" style="font-size:12.5px"><span>${done} of ${it.length} done</span><b style="color:${done===it.length?'var(--ok)':'var(--warn)'}">${pct(done,it.length)}%</b></div><div class="bar done ${done===it.length?'good':''}"><i style="width:${pct(done,it.length)}%"></i></div>
        <div class="row">${late?`<span class="chip bad">! ${late} late</span>`:'<span class="chip ok">✓ on time</span>'}${soon?`<span class="chip">${soon} due soon</span>`:''}</div></button>`; }).join('');
    const n = k => wkItems.filter(k).length;
    $('#cwBody').innerHTML = `<div class="kbox">${[['all','Due this week',''],['late','Late','late'],['done','Done','done'],['blocked','Blocked','blocked']].map(([k,l,dc])=>`<button class="${(S.cwFilter||'all')===k?'on':''}" data-cwf="${k}">${dc?`<span class="dot ${dc}"></span>`:''}${l}<span class="cnt">${n(F[k])}</span></button>`).join('')}</div>
      <div class="label" style="margin:16px 0 8px">${plural(wkCls.length,'checklist')} — open one for full details ${U('UPD-05')}</div>
      ${groups ? `<div class="cgroups">${groups}</div>` : '<div class="empty">No checklists match this filter.</div>'}`;
  }
  function checklistList(items, ctx){
    const filters = ['All','To do','Late','Done'];
    let list = items.slice().sort((a,b)=>a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
    const f = ctx==='main' ? S.clFilter : drState.filter;
    if (f==='To do') list = list.filter(i=>!isDone(i.status));
    if (f==='Late') list = list.filter(i=>isLate(i.due,i.status));
    if (f==='Done') list = list.filter(i=>isDone(i.status));
    const per = ctx==='main' ? 10 : 999, page = ctx==='main' ? S.clPage : 0, pages = Math.max(1, Math.ceil(list.length/per)), p = Math.min(page, pages-1);
    const rows = list.slice(p*per, p*per+per).map(i=>itemRow(i, ctx)).join('');
    return `<div class="sec-h" style="margin-top:18px"><h4>Checklist <small>${plural(list.length,'item')}</small></h4>
        ${ctx==='main'&&list.length>per?`<div class="pager" style="margin:0;gap:8px"><span>${p*per+1}–${Math.min(list.length,p*per+per)} of ${list.length}</span><button class="btn sm" data-page="cl:-1" ${p===0?'disabled':''}>‹</button><button class="btn sm" data-page="cl:1" ${p>=pages-1?'disabled':''}>›</button></div>`:''}</div>
      <div class="between" style="flex-wrap:wrap"><div class="tabs" style="margin:0">${filters.map(x=>`<button class="${x===f?'on':''}" data-clf="${ctx}:${x}">${x}</button>`).join('')}</div></div>
      ${rows || '<div class="empty" style="margin-top:8px">No items match.</div>'}
      <div class="muted" style="font-size:12px;margin-top:10px">Tick a box to complete an item, change status from the pill, or Edit for due date &amp; notes. Changes save to P.I.C.S Checklist (Status, Due Date, General Notes). ${U('UPD-08')}</div>`;
  }
  function itemRow(i, ctx){
    const done = isDone(i.status), late = isLate(i.due, i.status);
    const sCls = 's-'+(isDone(i.status)?'completed':i.status.toLowerCase().replace(/\s+/g,'-'));
    const open = inlineOpen.has(i.id);
    return `<div class="citem ${done?'done':''}" data-item="${i.id}">
      <button class="cbx ${done?'on':''}" role="checkbox" aria-checked="${done}" aria-label="Complete ${esc(i.title)}" data-check="${i.id}"></button>
      <span class="dot ${done?'done':late?'late':i.status==='Blocked'?'blocked':''}"></span>
      <div class="tt">${esc(i.title)}<small>${late?'<b style="color:var(--bad)">Overdue</b> · ':''}Due ${fmt(i.due)}${i.owner?.length?' · '+esc(i.owner.join(', ')):''}${i.assetType?' · '+esc(i.assetType):''}</small></div>
      <select class="status-sel ${sCls}" data-status="${i.id}" aria-label="Status">${OPT.clStatus.map(s=>`<option ${s===i.status?'selected':''}>${s}</option>`).join('')}</select>
      <button class="btn sm" data-inline="${i.id}">${open?'Close':'Edit'}</button>
      ${open?`<div class="inline-edit"><div class="fgrid"><div class="field"><label>Due date</label><input type="date" value="${i.due}" data-ie-due="${i.id}"></div><div class="field"><label>Item type</label><select data-ie-type="${i.id}">${['Task','Deliverable'].map(s=>`<option ${s===i.itemType?'selected':''}>${s}</option>`).join('')}</select></div></div>
        <div class="field"><label>Notes · what to check / what happened</label><textarea data-ie-notes="${i.id}" placeholder="Add a note for OPANT or the team…">${esc(i.notes)}</textarea></div>
        <div class="row"><button class="btn sm primary" data-ie-save="${i.id}">Save notes</button><button class="btn sm" data-full="${i.id}">All fields…</button></div></div>`:''}
    </div>`;
  }
  const inlineOpen = new Set();

  /* Drawer for a single checklist group (from Product view) */
  let drState = {cl:null, filter:'All'};
  let Z = 70; const raise = id => { $('#'+id).style.zIndex = ++Z; };  // newest layer always on top
  function openDrawer(cl){ drState = {cl, filter:'All'}; renderDrawer(); raise('drOv'); $('#drOv').classList.add('open'); }
  function renderDrawer(){
    if (!drState.cl) return;
    const c = CHECKLISTS.find(x=>x.id===drState.cl); const it = CITEMS.filter(i=>i.checklist===c.id);
    const done = it.filter(i=>isDone(i.status)).length;
    $('#drTitle').textContent = c.name; $('#drSub').textContent = `${byId(c.pics).name} · ${c.phase} · P.I.C.S Checklist`;
    $('#drBody').innerHTML = `<div class="kpis">
      <div class="kpi"><b style="color:var(--ok)">${pct(done,it.length)}%</b><div class="n">Done</div><div class="s">${done} of ${it.length}</div></div>
      <div class="kpi"><b style="color:${it.some(i=>isLate(i.due,i.status))?'var(--bad)':'var(--ok)'}">${it.filter(i=>isLate(i.due,i.status)).length}</b><div class="n">Overdue</div></div>
      <div class="kpi"><b style="color:var(--brand)">${it.filter(i=>isSoon(i.due,i.status)).length}</b><div class="n">Coming up</div><div class="s">next 2 weeks</div></div>
      <div class="kpi"><b style="color:${it.some(i=>i.status==='Blocked')?'var(--bad)':'var(--ok)'}">${it.filter(i=>i.status==='Blocked').length}</b><div class="n">Blocked</div></div></div>
      ${checklistList(it, 'drawer')}`;
  }


  /* ---------------- EDIT DIALOG ---------------- */
  function openEdit(kind, id){
    S.editing = {kind, id};
    const f = $('#edForm');
    if (kind==='ci' || kind==='ci-new'){
      const i = kind==='ci' ? CITEMS.find(x=>x.id===id) : {title:'', num:'', due:iso(TODAY), status:'Not Started', itemType:'Deliverable', assetType:'Feature', notes:'', opant:'', owner:[], reviewer:[], checklist: scopeData(S.scope).cls[0]?.id};
      const cls = scopeData(S.scope).cls;
      const sel = (name, opts, val) => `<select name="${name}">${opts.map(s=>`<option ${s===val?'selected':''}>${esc(s)}</option>`).join('')}</select>`;
      $('#edTitle').textContent = kind==='ci' ? 'Edit checklist item' : 'Add checklist item'; $('#edSub').textContent = kind==='ci' ? `${CHECKLISTS.find(c=>c.id===i.checklist)?.name||''} · ${i.tag||''}` : byId(S.scope).name;
      f.innerHTML = `<div class="fgrid"><div class="field" style="grid-column:1/-1"><label>Checklist Item Name</label><input name="title" required value="${esc(i.title)}"></div></div>
        ${kind==='ci-new'?`<div class="field" style="margin-top:12px"><label>Related Roadmap (checklist)</label><select name="checklist">${cls.map(c=>`<option value="${c.id}">${c.phase} · ${esc(c.name)}</option>`).join('')}</select></div>`:''}
        <div class="fgrid" style="margin-top:12px">
          <div class="field"><label>Due Date</label><input type="date" name="due" value="${i.due}"></div>
          <div class="field"><label>Status</label>${sel('status', OPT.clStatus, i.status)}</div>
          <div class="field"><label>Item Type</label>${sel('itemType', OPT.clItemType, i.itemType)}</div>
          <div class="field"><label>Deliverable (Asset) Type</label>${sel('assetType', OPT.clAsset, i.assetType)}</div>
          <div class="field"><label>Checklist Owner</label>${sel('owner', ['',...OPT.team], i.owner[0]||'')}</div>
          <div class="field"><label>Checklist Reviewer</label>${sel('reviewer', ['',...OPT.team], i.reviewer[0]||'')}</div>
          <div class="field"><label>Checklist Number</label><input type="number" name="num" value="${esc(i.num)}"></div>
          <div class="field"><label>Overdue</label><input disabled value="${isLate(i.due,i.status)?'Yes — past due':'No'}"></div>
        </div>
        <div class="field" style="margin-top:12px"><label>General Notes</label><textarea name="notes">${esc(i.notes)}</textarea></div>
        <div class="field" style="margin-top:12px"><label>OPANT Notes</label><textarea name="opant">${esc(i.opant)}</textarea></div>
        <p class="muted" style="font-size:12px">${U('UPD-13')} Mapped to P.I.C.S Checklist (tbl8Nm9AL749eBLZC). One Status field drives Complete/Overdue.</p>`;
    } else {
      return openRoadmap(kind, id);
    }
    $('#edOv .dlg').classList.remove('wide'); RM = null; $('#edPencil').style.display='none'; $('#edAir').style.display='none'; $('#edSave').style.display=''; $('#edCancel').textContent='Cancel';
    raise('edOv'); $('#edOv').classList.add('open'); setTimeout(()=>f.querySelector('input')?.focus(), 30);
  }
  function saveEdit(){
    const f = $('#edForm'); const v = Object.fromEntries(new FormData(f));
    if (!v.title?.trim()){ f.querySelector('[name=title]').focus(); toast('Add a title first'); return; }
    const {kind, id} = S.editing;
    ['owner','reviewer'].forEach(k => { if (k in v) v[k] = v[k] ? [v[k]] : []; });
    if (kind==='ci') saveChecklistItem(id, v);
    else if (kind==='ci-new'){
      let cl = v.checklist;
      delete v.checklist; const item = Object.assign({id:'ci'+(++cid), checklist:cl, notes:'', opant:'', tag:'', roadmapIds:[CHECKLISTS.find(c=>c.id===cl)?.roadmap].filter(Boolean)}, v); CITEMS.push(item); toast('Checklist item added · resync queued');
      const grp = CHECKLISTS.find(c=>c.id===cl); const tmp = item.id;
      persist('checklist', null, {...v, roadmapIds: item.roadmapIds.filter(isRec), picsIds: [grp?.pics].filter(isRec)}, AREA.ci).then(res => { if (res && res.id) swapId('checklist', tmp, res.id); });
    }
    else if (kind==='rm' || kind==='rm-new') return saveRoadmapDraft();
    $('#edOv').classList.remove('open'); refreshAll();
  }
  /* =====================================================================
     [UPD-16] ROADMAP RECORD — every column of Airtable › P.I.C.S Roadmaps (tblTo1C185aBEIshk)
     plus its Related Roadmap Tasks from Tasks Planning (tblyOuPIvgifN4OOQ)
     ===================================================================== */
  const FIELD_MAP = [
    ['P.I.C.S Roadmap Phase Title','fldpiPmyrdTtbISsV','singleLineText','Title input'],
    ['Related P.I.C.S','fldhd79gXJvwE4LTw','link → P.I.C.S','Chips + add'],
    ['Related Roadmap Tasks','fld3KiTiVXLxVsgny','link → Tasks Planning','Task list (check, status, edit, add)'],
    ['Roadmap Type','fld3OQAOgZQl5g6ZP','singleSelect','Select (drives badge + Meetings group)'],
    ['Phase','fldhJzEOVmjN3OPMw','singleSelect','Select (drives Phase Activity group)'],
    ['Roadmap Stage','fldlA3cpvYSReuOVn','singleSelect','Select'],
    ['Roadmap Status','fldMVHS5ztNrhnwFi','singleSelect','Select (drives Done / Overdue)'],
    ['Month','fldbtJgmrIJL8mxkr','singleSelect','Auto from Start Date (read-only chip)'],
    ['Week Number #','fldJ2mJcqXIuyQ7Dn','singleSelect','Auto ISO week of Start Date (read-only chip)'],
    ['Quarter','fldH3wvA1j8jNxJUT','singleSelect','Auto from Start Date (read-only chip)'],
    ['Related Department(s)','fldnHRCZgS1Vwc40D','link → Departments','Chips + add'],
    ['Related Deliverables & Assets','fldV6F6g1VTOFs9Al','link → Asset Library','Chips + add'],
    ['Related Feedback & Review Round(s)','fldPeHssKZ3kddG0a','link → Feedback & Review Rounds','Chips + add'],
    ['Related P.I.C.S Checklists','fldR21QqtzgIwk8qw','link → P.I.C.S Checklist','Chips (click → checklist drawer) + add'],
    ['Sync Roadmap to Related P.I.C.S & P.I.C.S Checklists','fldibeMsWFJbR2aB5','checkbox','Toggle'],
    ['Assignee','fldmWBoNcNbcPJTFq','link → Team Members','Chips + add'],
    ['Dependencies','fldz6tZ2HvAXXqRvQ','multilineText','Textarea'],
    ['Start Date','fld5yMQxENB5ycKWR','date','Date input'],
    ['Due Date','fldZDzM9FM6Peqo9a','date','Date input (drives heatmap week + overdue)'],
    ['Notes','fldESgBxo9w0qjSHy','multilineText','Textarea'],
    ['Related Briefs','fldr7YVmY5yDda4Wq','link → Briefs','Chips + add'],
    ['Related Goals','fldecLvegilVDtmmM','link → Goals','Chips + add'],
    ['Related Status Reports','flddNF6fFnlTiS7Ye','link → Master Reports','Chips + add'],
    ['P.I.C.S Tag','fldiaNcGTBhFj16HG','singleLineText','Text input (shown in header)'],
    ['Tag Status','fldqAsOfGlQRTrrYP','singleSelect','Select'],
    ['Sprint Number','fldHOligtmayK2fCn','number','Number input'],
  ];
  const LINKS = [ // key, label, options() or null for free text
    ['relPics','Related P.I.C.S', () => PICS.map(p=>p.name)],
    ['assignee','Assignee', () => OPT.team],
    ['depts','Related Department(s)', () => OPT.depts],
    ['checklists','Related P.I.C.S Checklists', () => CHECKLISTS.map(c=>c.id)],
    ['feedback','Related Feedback & Review Round(s)', () => FEEDBACK.map(f=>f.title)],
    ['deliverables','Related Deliverables & Assets', null],
    ['briefs','Related Briefs', null],
    ['goals','Related Goals', null],
    ['reports','Related Status Reports', null],
  ];
  const clLabel = id => { const c = CHECKLISTS.find(x=>x.id===id); return c ? `${c.phase} · ${c.name}` : id; };
  const taskOf = id => TASKS.find(t=>t.id===id);
  function taskMeta(r){ const ts=(r.tasks||[]).map(taskOf).filter(Boolean); if(!ts.length) return ''; const d=ts.filter(t=>isDone(t.status)).length; return `<span class="chip ${d===ts.length?'ok':''}">☑ ${d}/${ts.length} tasks</span>`; }

  let RM = null; // draft being edited
  const openTask = new Set();
  function renderEditForm(){
    const r = RM, f = $('#edForm');
    $('#edTitle').innerHTML = `${RM._new?'':'✎ Editing · '}${esc(r.title || 'New roadmap item')} ${U('UPD-16')}`;
    $('#edSub').innerHTML = `P.I.C.S Roadmaps · <b>${esc(r.tag||'—')}</b> · ${esc(byId(r.pics).name)} · <a class="link" href="https://airtable.com/appLH1D7ME6mU1zgE/tblTo1C185aBEIshk" target="_blank" rel="noopener">Open record in Airtable ↗</a>`;
    const sel = (name, opts, val) => `<select name="${name}">${opts.map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
    const ts = r.tasks.map(taskOf).filter(Boolean);
    const tDone = ts.filter(t=>isDone(t.status)).length;
    const hrsP = ts.reduce((a,t)=>a+(+t.planned||0),0), hrsW = ts.reduce((a,t)=>a+(+t.worked||0),0);
    f.innerHTML = `
      <div class="row" style="margin-bottom:14px">${kindBadge(r.kind,'#')}${statusChip(r.status)}<span class="chip stage">${esc(r.stage)}</span>${isLate(r.date,r.status)?'<span class="chip bad">Overdue</span>':''}<span class="chip ${r.sync==='Synced'?'ok':'warn'}">${r.sync==='Synced'?'✓ Synced':'⟳ Sync pending'}</span></div>
      <div class="rgrid">
        <div class="field full"><label>P.I.C.S Roadmap Phase Title</label><input name="title" required value="${esc(r.title)}" placeholder="e.g. Phase 2 Sprint: Search & Discovery"></div>
        <div class="field"><label>Roadmap Type</label>${sel('rType', OPT.roadmapType, r.rType)}</div>
        <div class="field"><label>Phase</label>${sel('phase', OPT.phase, r.phase)}</div>
        <div class="field"><label>Sprint Number</label><input type="number" min="0" name="sprintNo" value="${esc(r.sprintNo)}"></div>
        <div class="field"><label>Roadmap Stage</label>${sel('stage', OPT.stage, r.stage)}</div>
        <div class="field"><label>Roadmap Status</label>${sel('status', OPT.status, r.status)}</div>
        <div class="field"><label>Tag Status</label>${sel('tagStatus', OPT.tagStatus, r.tagStatus)}</div>
        <div class="field"><label>Start Date</label><input type="date" name="start" value="${r.start}"></div>
        <div class="field"><label>Due Date</label><input type="date" name="date" value="${r.date}"></div>
        <div class="field"><label>P.I.C.S Tag</label><input name="tag" value="${esc(r.tag)}"></div>
      </div>
      <div class="derived"><span class="chip">Week # <b>${r.start?isoWeek(r.start):'—'}</b></span><span class="chip">Month <b>${r.start?monthName(r.start):'—'}</b></span><span class="chip">Quarter <b>${r.start?quarterOf(r.start):'—'}</b></span><span class="muted" style="font-size:11.5px;align-self:center">set automatically from Start Date</span></div>

      <div class="rsec"><h5>Related Roadmap Tasks <small>${tDone} of ${ts.length} done · ${hrsW}/${hrsP} hrs</small><span style="margin-left:auto"></span><button type="button" class="btn sm" data-taddtog>＋ Add task</button></h5>
        <div class="bar done ${ts.length&&tDone===ts.length?'good':''}" style="height:6px"><i style="width:${pct(tDone,ts.length)}%"></i></div>
        <div id="tAdd" style="display:none" class="trow"><div class="fgrid"><div class="field"><label>Task</label><input id="tNewTitle" placeholder="What needs doing?"></div><div class="field"><label>Assigned To</label><select id="tNewWho">${OPT.team.map(o=>`<option>${o}</option>`).join('')}</select></div></div><div class="row" style="margin-top:8px"><button type="button" class="btn sm primary" data-tadd>Add task</button></div></div>
        ${ts.map(taskRow).join('') || '<div class="empty" style="margin-top:8px">No tasks linked to this roadmap item yet.</div>'}
      </div>

      <div class="rsec"><h5>Linked records</h5><div class="links">
        ${LINKS.map(([k,label,opts]) => { const vals = r[k]||[]; const o = opts ? opts().filter(x=>!vals.includes(x)) : null;
          return `<div class="lnk"><div class="label">${label}</div><div class="lchips">${vals.map((v,i)=>`<span class="chip ${k==='checklists'?'click':''}" ${k==='checklists'?`data-opencl="${v}"`:''}>${esc(k==='checklists'?clLabel(v):v)}<button type="button" data-lrm="${k}:${i}" aria-label="Remove">×</button></span>`).join('') || '<span class="muted" style="font-size:12px">None linked</span>'}</div>
            <div class="addl">${o ? `<select data-lsel="${k}"><option value="">＋ Link ${label.replace('Related ','').toLowerCase()}…</option>${o.map(x=>`<option value="${esc(x)}">${esc(k==='checklists'?clLabel(x):x)}</option>`).join('')}</select>` : `<input data-linp="${k}" placeholder="＋ Link by name…"><button type="button" class="btn sm" data-ladd="${k}">Add</button>`}</div></div>`; }).join('')}
      </div></div>

      <div class="rsec"><div class="fgrid">
        <div class="field"><label>Notes</label><textarea name="notes" placeholder="Context, decisions, scope…">${esc(r.notes)}</textarea></div>
        <div class="field"><label>Dependencies</label><textarea name="dependencies" placeholder="What must happen first?">${esc(r.dependencies)}</textarea></div>
      </div>
      <label class="row" style="margin-top:12px;font-size:13px;font-weight:600"><input type="checkbox" name="syncFlag" ${r.syncFlag?'checked':''}> Sync Roadmap to Related P.I.C.S &amp; P.I.C.S Checklists</label></div>

      <div class="rsec"><details class="fm"><summary>Airtable field map · P.I.C.S Roadmaps (${FIELD_MAP.length} columns, all mapped)</summary>
        <table class="fmap"><tr><th>Column</th><th>Field ID</th><th>Type</th><th>Card control</th></tr>${FIELD_MAP.map(m=>`<tr><td>${m[0]}</td><td><code>${m[1]}</code></td><td>${m[2]}</td><td>${m[3]}</td></tr>`).join('')}</table>
        <p class="muted" style="font-size:11.5px">Tasks Planning columns shown per task: Task, Assigned To, Task Type, Status, Priority, Start Date, Due Date, Completed (from Status), Planned Hours, Hours Worked, Task Details, Notes From Assignee, Week Number # / Month (auto).</p></details></div>`;
  }
  function taskRow(t){
    const done = isDone(t.status), late = isLate(t.due, t.status), open = openTask.has(t.id);
    const sel = (k, opts) => `<select data-tf="${t.id}:${k}">${opts.map(o=>`<option ${o===t[k]?'selected':''}>${o}</option>`).join('')}</select>`;
    return `<div class="trow ${done?'done':''}"><div class="top">
      <button type="button" class="cbx ${done?'on':''}" role="checkbox" aria-checked="${done}" data-tcheck="${t.id}" aria-label="Complete ${esc(t.title)}"></button>
      <div class="tt">${esc(t.title)}<small>${esc(t.type)} · ${esc(t.assignee)} · ${late?'<b style="color:var(--bad)">Overdue</b> · ':''}Due ${fmt(t.due)} · Wk${isoWeek(t.start||t.due)} · ${t.worked||0}/${t.planned||0} hrs</small></div>
      <span class="chip pr-${t.priority}">${esc(t.priority)}</span>
      <select class="status-sel s-${t.status.toLowerCase().replace(/\s+/g,'-')}" data-tf="${t.id}:status">${OPT.taskStatus.map(o=>`<option ${o===t.status?'selected':''}>${o}</option>`).join('')}</select>
      <button type="button" class="btn sm" data-topen="${t.id}">${open?'Close':'Details'}</button></div>
      ${open?`<div class="more">
        <div class="field full"><label>Task</label><input data-tf="${t.id}:title" value="${esc(t.title)}"></div>
        <div class="field"><label>Assigned To</label>${sel('assignee', OPT.team)}</div>
        <div class="field"><label>Task Type</label>${sel('type', OPT.taskType)}</div>
        <div class="field"><label>Priority</label>${sel('priority', OPT.priority)}</div>
        <div class="field"><label>Start Date</label><input type="date" data-tf="${t.id}:start" value="${t.start}"></div>
        <div class="field"><label>Due Date</label><input type="date" data-tf="${t.id}:due" value="${t.due}"></div>
        <div class="field"><label>Planned / Worked hrs</label><div class="row" style="flex-wrap:nowrap"><input type="number" min="0" data-tf="${t.id}:planned" value="${t.planned}"><input type="number" min="0" data-tf="${t.id}:worked" value="${t.worked}"></div></div>
        <div class="field full"><label>Task Details</label><input data-tf="${t.id}:details" value="${esc(t.details)}"></div>
        <div class="field full"><label>Notes From Assignee</label><textarea data-tf="${t.id}:notesFromAssignee" placeholder="Progress, blockers, links…">${esc(t.notesFromAssignee)}</textarea></div>
        <div class="full row"><button type="button" class="btn sm" data-tunlink="${t.id}">Unlink from roadmap item</button><a class="link" href="https://airtable.com/appLH1D7ME6mU1zgE/tblyOuPIvgifN4OOQ" target="_blank" rel="noopener">Open task in Airtable ↗</a></div>
      </div>`:''}</div>`;
  }
  /* =====================================================================
     [UPD-17] PHASE ACTIVITY — type-specific rows, built from the P.I.C.S Tag hierarchy
     Phase › Sprint (S##) › Task block (B#) › Subtasks (ST##) · Milestones (M#) at phase level · Meetings (MTG/CHK/DEP)
     ===================================================================== */
  const rmById = id => ROADMAP.find(r=>r.id===id);
  const kidsOf = (r, level) => ROADMAP.filter(x=>x.parentId===r.id && (!level || x.level===level)).sort((a,b)=>(a.start||'').localeCompare(b.start||'') || a.tag.localeCompare(b.tag));
  const tasksOf = r => (r.tasks||[]).map(taskOf).filter(Boolean);
  const clOf = r => CITEMS.filter(i => (i.roadmapIds||[]).includes(r.id));
  const fbOf = r => FEEDBACK.filter(f => (r.feedbackIds||[]).includes(f.id));
  const dn = arr => arr.filter(x=>isDone(x.status)).length;
  const avs = (names, max=3) => `<span class="mini-av">${names.slice(0,max).map(n=>`<i title="${esc(n)}">${initials(n)}</i>`).join('')}${names.length>max?`<i>+${names.length-max}</i>`:''}</span>`;
  const range = r => r.start && r.start!==r.date ? `${fmt(r.start)} – ${fmt(r.date)}` : fmt(r.date);
  const daysTxt = (date, status) => { if (isDone(status)) return 'Done'; if (/cancel/i.test(status)) return 'Cancelled'; const d = Math.round((D(date)-TODAY)/864e5); return d<0 ? `${-d}d late` : d===0 ? 'Due today' : `in ${d}d`; };
  const prog = (d, t, label) => t ? `<span class="pg" title="${label}: ${d} of ${t}"><span class="pg-l">${label}</span><span class="pg-b"><i style="width:${pct(d,t)}%"></i></span><b>${d}/${t}</b></span>` : '';
  const sprintLabel = r => `Sprint ${String(r.sprintNo||'').padStart(2,'0')}`;

  function secRoadmap(sc){
    const {rm} = scopeData(sc.id);
    const phList = [...new Set(rm.map(x=>x.phase))].sort((a,b)=>parseInt(a.slice(6))-parseInt(b.slice(6)));
    const inScope = new Set(rm.map(r=>r.id));
    const phaseHTML = phList.map(ph => {
      const items = rm.filter(r=>r.phase===ph && r.kind!=='meeting');
      const gk = 'g:'+ph;
      const ms = items.filter(r=>r.level==='milestone').sort((a,b)=>a.date.localeCompare(b.date));
      const sprints = items.filter(r=>r.level==='sprint').sort((a,b)=>a.start.localeCompare(b.start));
      const meets = rm.filter(r=>r.kind==='meeting' && r.phase===ph).sort((a,b)=>a.date.localeCompare(b.date));
      const loose = items.filter(r=>(r.level==='block'||r.level==='subtask') && !(r.parentId && inScope.has(r.parentId)) && !(r.level==='subtask' && inScope.has(rmById(r.parentId)?.parentId)));
      const body = [
        ms.length ? `<div class="grp-l">Milestones</div>${ms.map(msRow).join('')}` : '',
        sprints.length ? `<div class="grp-l">Sprints</div>${sprints.map(sp => sprintAcc(sp, ph)).join('')}` : '',
        loose.length ? `<div class="grp-l">Tasks</div>${loose.map(r => r.level==='subtask'?subRow(r):blockRow(r, 0)).join('')}` : '',
        meets.length ? `<div class="grp-l">Meetings</div>${meets.map(meetRow).join('')}` : '',
      ].join('');
      return `<div class="acc ph-acc ${S.open.has(gk)?'open':''}" style="${phStyle(ph)}"><button data-acc="${gk}">${phTag(ph)} <small>${plural(sprints.length,'sprint')} · ${plural(ms.length,'milestone')}${meets.length?' · '+plural(meets.length,'meeting'):''} · ${dn(items)}/${items.length} done</small><span class="chev">⌄</span></button><div class="inner">${body}</div></div>`;
    }).join('');
    const ph = phList.filter(n => rm.some(x=>x.kind!=='meeting'&&x.phase===n)).map(n => { const w = rm.filter(x=>x.kind!=='meeting'&&x.phase===n); return {n, total:w.length, done:dn(w)}; });
    return `<div class="sec"><div class="sec-h"><h4>Phase Activity <small>${plural(rm.length,'item')} ${U('UPD-17')}</small></h4><button class="btn sm" data-add="roadmap">＋ Add roadmap item</button></div>
      ${ph.length?`<div class="label" style="margin:4px 0 8px">Progress by phase</div><div class="phases" style="margin-bottom:12px">${ph.map(x=>`<div class="phase" style="${phStyle(x.n)}"><div class="between">${phTag(x.n)}<b style="font-size:12.5px;color:var(--pt)">${pct(x.done,x.total)}%</b></div><div class="bar"><i style="width:${pct(x.done,x.total)}%"></i></div><div class="muted" style="font-size:11.5px">${x.done} of ${x.total} done</div></div>`).join('')}</div>`:''}
      <div class="legend" style="margin:4px 0 12px"><span class="row" style="gap:6px">${kindBadge('task')}Task</span><span class="row" style="gap:6px">${kindBadge('task','ST')}Subtask</span><span class="row" style="gap:6px">${kindBadge('milestone')}Milestone</span><span class="row" style="gap:6px">${kindBadge('sprint')}Sprint</span><span class="row" style="gap:6px">${kindBadge('meeting')}Meeting</span></div>
      ${phaseHTML || '<div class="empty">No roadmap items yet.</div>'}
      <div class="muted" style="font-size:12px;margin-top:8px">Expand a phase, then a sprint. Click any row to open its record; use ✎ in the record to edit.</div></div>`;
  }
  function sprintAcc(sp, ph){
    const k = 'sp:'+sp.id, blocks = kidsOf(sp,'block'), meets = kidsOf(sp,'meeting'), fb = fbOf(sp)[0];
    return `<div class="acc sp ${S.open.has(k)?'open':''}"><button data-acc="${k}">
        ${kindBadge('sprint')}<span class="sp-t"><b>${sprintLabel(sp)} · ${esc(sp.short)}</b><small>${range(sp)} · ${esc(sp.tag)}</small></span>
        <span class="sp-r">${prog(dn(blocks), blocks.length, 'Blocks')}${statusChip(sp.status)}</span><span class="chev">⌄</span></button>
      <div class="inner">
        <div class="ritem lv-sprint" data-rv="${sp.id}"><div class="main"><div class="meta">${avs(sp.assignee)}<span>${esc(sp.notes||'Open sprint record')}</span></div></div>${fb?`<span class="chip">${esc(fb.type)} · ${esc(fb.status)}</span>`:''}<span class="go">Open ›</span></div>
        ${blocks.map((b,i)=>blockRow(b, i+1)).join('')}
        ${meets.length?`<div class="muted" style="font-size:11.5px;margin:8px 4px 0">${plural(meets.length,'meeting')} in this sprint — listed under this phase's Meetings</div>`:''}
      </div></div>`;
  }
  function blockRow(r, n){
    const subs = kidsOf(r,'subtask'), ts = tasksOf(r), cl = clOf(r), k = 'sub:'+r.id, late = isLate(r.date, r.status);
    return `<div class="ritem lv-block ${late?'is-late':''}" data-rv="${r.id}">${kindBadge('task', n||'•')}
        <div class="main"><div class="tt">${esc(r.short)}</div>
          <div class="meta"><span class="mono">${esc(r.tag)}</span><span>${range(r)}</span>${avs(r.assignee)}${late?'<span class="chip bad">Overdue</span>':''}</div>
          <div class="pgs">${prog(dn(subs),subs.length,'Subtasks')}${prog(dn(ts),ts.length,'Tasks')}${prog(dn(cl),cl.length,'Checklist')}</div></div>
        <div class="side">${statusChip(r.status)}${subs.length?`<button type="button" class="link sm" data-acc="${k}">${S.open.has(k)?'Hide':'Show'} ${subs.length} subtasks</button>`:''}</div></div>
      ${subs.length && S.open.has(k) ? `<div class="subs">${subs.map(subRow).join('')}</div>` : ''}`;
  }
  function subRow(r){
    const t = tasksOf(r)[0];
    return `<div class="ritem lv-sub ${isLate(r.date,r.status)?'is-late':''}" data-rv="${r.id}">${kindBadge('task','ST')}
      <div class="main"><div class="tt">${esc(r.short)}</div><div class="meta"><span class="mono">${esc(r.tag.replace(/^.*-(B\d+-ST\d+)$/,'$1'))}</span><span>Due ${fmt(r.date)}</span>${avs(r.assignee,2)}${t?`<span>Task: ${esc(t.status)}</span>`:''}</div></div>${statusChip(r.status)}</div>`;
  }
  function msRow(r){
    const cl = clOf(r), fb = fbOf(r)[0], late = isLate(r.date, r.status);
    return `<div class="ritem lv-ms ${late?'is-late':''}" data-rv="${r.id}">${kindBadge('milestone')}
      <div class="main"><div class="tt">${esc(r.short)}</div><div class="meta"><span class="mono">${esc(r.tag)}</span><span>Due ${fmtY(r.date)}</span><b class="${late?'bad-t':''}">${daysTxt(r.date,r.status)}</b></div>
        <div class="pgs">${prog(dn(cl), cl.length, 'Gate checks')}${prog(dn(tasksOf(r)), tasksOf(r).length, 'Tasks')}</div></div>
      <div class="side">${statusChip(r.status)}${fb?`<span class="chip">${esc(fb.type)} · ${esc(fb.status)}</span>`:''}</div></div>`;
  }
  function meetRow(r){
    const cl = clOf(r);
    return `<div class="ritem lv-meet" data-rv="${r.id}">${kindBadge('meeting')}<div class="when"><b>${D(r.date).toLocaleDateString('en-US',{weekday:'short'})}</b><span>${fmt(r.date)}</span></div>
      <div class="main"><div class="tt">${esc(r.short)}</div><div class="meta"><span class="mono">${esc(r.tag)}</span>${avs(r.assignee,4)}${cl.length?`<span>Approval: ${esc(cl[0].status)}</span>`:''}</div></div>${statusChip(r.status)}</div>`;
  }

  /* =====================================================================
     [UPD-18] ROADMAP RECORD — read-only view per type + master edit (✎)
     Only the columns that matter for that type are shown; ✎ opens the full 26-column editor (UPD-16).
     ===================================================================== */
  S.rvStack = []; S.rvAll = new Set(); S.rmMode = 'view';
  function openRoadmap(kind, id){
    if (kind==='rm') { RM = JSON.parse(JSON.stringify(rmById(id))); S.rmMode = 'view'; }
    else { const sc = byId(S.scope); RM = {id:'rm'+(++rid), _new:true, pics:S.scope, kind:'task', rType:'Task', level:'block', title:'', short:'', date:addDays(iso(TODAY),7), start:iso(TODAY), status:'Not Started', stage:'Not Started', phase:'Phase 1', tag:(sc.tag||'ACR')+'-NEW', tagStatus:'Needs Review', sprintNo:'', relPics:[sc.name], depts:sc.depts.slice(), assignee:sc.leads.slice(0,1), checklists:[], checklistItemIds:[], feedback:[], feedbackIds:[], deliverables:[], briefs:[], goals:[], reports:[], dependencies:'', notes:'', syncFlag:true, sync:'Pending', tasks:[]}; S.rmMode = 'edit'; }
    S.editing = {kind, id: RM.id};
    $('#edOv .dlg').classList.add('wide');
    renderRoadmap(); raise('edOv'); $('#edOv').classList.add('open'); $('#edForm').scrollTop = 0;
  }
  function navRecord(id){ S.rvStack.push(RM.id); RM = JSON.parse(JSON.stringify(rmById(id))); S.rmMode='view'; S.editing = {kind:'rm', id}; renderRoadmap(); $('#edForm').scrollTop = 0; }
  function renderRoadmap(){
    const view = S.rmMode === 'view' && !RM._new;
    $('#edPencil').style.display = view ? '' : 'none';
    $('#edSave').style.display = view ? 'none' : '';
    $('#edCancel').textContent = view ? 'Close' : 'Cancel';
    $('#edAir').style.display = '';
    return view ? renderRecordView() : renderEditForm();
  }
  const TYPE_NAME = {sprint:'Sprint', block:'Task', subtask:'Subtask', milestone:'Milestone', meeting:'Meeting'};
  function renderRecordView(){
    const r = RM, f = $('#edForm'), lv = r.level;
    const sprint = lv==='sprint' ? r : lv==='subtask' ? rmById(rmById(r.parentId)?.parentId) : rmById(r.parentId);
    const block = lv==='subtask' ? rmById(r.parentId) : null;
    const back = S.rvStack.length ? rmById(S.rvStack[S.rvStack.length-1]) : null;
    $('#edTitle').innerHTML = `${esc(r.short || r.title)} ${U('UPD-18')}`;
    $('#edSub').innerHTML = `<span class="crumb">${esc(r.phase)}${sprint&&lv!=='sprint'?` › <button type="button" class="link" data-rv="${sprint.id}">${sprintLabel(sprint)}</button>`:''}${block?` › <button type="button" class="link" data-rv="${block.id}">${esc(block.short)}</button>`:''}</span>`;
    const late = isLate(r.date, r.status);
    const head = `${back?`<button type="button" class="link" data-rvback style="margin-bottom:10px">← Back to ${esc(back.short)}</button>`:''}
      <div class="rv-chips">${kindBadge(r.kind, lv==='subtask'?'ST':'T')}<span class="chip type-${lv}">${TYPE_NAME[lv]}</span>${statusChip(r.status)}<span class="chip stage">${esc(r.stage)}</span>${late?'<span class="chip bad">Overdue</span>':''}<span class="chip mono">${esc(r.tag)}</span></div>`;
    const fact = (label, val) => val ? `<div class="fact"><div class="label">${label}</div><div class="v">${val}</div></div>` : '';
    const people = names => names.length ? names.map(n=>`<span class="person"><i>${initials(n)}</i>${esc(n)}</span>`).join('') : '';
    const sect = (title, body, extra='') => body ? `<div class="rsec"><h5>${title}${extra}</h5>${body}</div>` : '';
    const para = t => t ? `<p class="rv-p">${esc(t)}</p>` : '';
    const links = () => { const L = [['Deliverables & assets', r.deliverables],['Goals', r.goals],['Status reports', r.reports],['Briefs', r.briefs]].filter(x=>x[1]?.length);
      return L.length ? sect('Linked records', `<div class="links">${L.map(([l,v])=>`<div class="lnk"><div class="label">${l}</div><div class="lchips">${v.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div></div>`).join('')}</div>`) : ''; };
    const ts = tasksOf(r), cl = clOf(r), fbs = fbOf(r);
    const taskList = (list, title='Tasks · Tasks Planning') => list.length ? sect(title, `${bar(dn(list), list.length)}${list.map(taskView).join('')}`, ` <small>${dn(list)} of ${list.length} done</small>`) : '';
    const clList = (list, title, key) => { if (!list.length) return ''; const all = S.rvAll.has(key); const shown = all ? list : list.slice(0, 8);
      return sect(title, `${bar(dn(list), list.length)}${shown.map(clView).join('')}${list.length>8?`<button type="button" class="link" data-rvall="${key}" style="margin-top:8px">${all?'Show fewer':'Show all '+list.length}</button>`:''}`, ` <small>${dn(list)} of ${list.length} complete${list.filter(i=>isLate(i.due,i.status)).length?` · <b style="color:var(--bad)">${list.filter(i=>isLate(i.due,i.status)).length} late</b>`:''}</small>`); };
    const fbCards = fbs.length ? sect('Review round', fbs.map(fbView).join('')) : '';
    const rowList = (list, kind) => list.map(x => `<button type="button" class="rv-row" data-rv="${x.id}">${kind==='meeting'?kindBadge('meeting'):kind==='subtask'?kindBadge('task','ST'):kindBadge('task')}<span class="tt">${esc(kind==='meeting'?(x.meetingKind+' · '+fmt(x.date)):x.short)}<small>${esc(x.tag)} · ${range(x)}${kind==='block'?` · ${dn(kidsOf(x,'subtask'))}/${kidsOf(x,'subtask').length} subtasks`:''}</small></span>${statusChip(x.status)}<span class="go">›</span></button>`).join('');
    let body = '';
    if (lv==='sprint') {
      const blocks = kidsOf(r,'block'), subs = blocks.flatMap(b=>kidsOf(b,'subtask')), meets = kidsOf(r,'meeting');
      const allTasks = [...ts, ...blocks.flatMap(tasksOf), ...subs.flatMap(tasksOf)], allCl = [...blocks, ...meets].flatMap(clOf);
      body = `<div class="facts">${fact('Dates', `${fmtY(r.start)} → ${fmtY(r.date)}`)}${fact('Timing', `<b class="${late?'bad-t':''}">${daysTxt(r.date, r.status)}</b>`)}${fact('Phase', phTag(r.phase))}${fact('Owners', people(r.assignee))}</div>
        <div class="kpis rv-k">${kpi(dn(blocks), blocks.length, 'Blocks')}${kpi(dn(subs), subs.length, 'Subtasks')}${kpi(dn(allTasks), allTasks.length, 'Tasks')}${kpi(dn(allCl), allCl.length, 'Checklist')}</div>
        ${sect('Sprint goal', para(r.notes))}${sect('Ready when', para(r.dependencies))}${fbCards}
        ${sect('Task blocks', `<div class="rv-rows">${rowList(blocks,'block')}</div>`, ` <small>${dn(blocks)} of ${blocks.length} done</small>`)}
        ${meets.length?sect('Sprint meetings', `<div class="rv-rows">${rowList(meets,'meeting')}</div>`):''}
        ${taskList(ts, 'Sprint-level tasks')}${links()}`;
    } else if (lv==='block') {
      const subs = kidsOf(r,'subtask');
      body = `<div class="facts">${fact('Sprint', sprint?`<button type="button" class="link" data-rv="${sprint.id}">${sprintLabel(sprint)} · ${esc(sprint.short)}</button>`:'—')}${fact('Dates', `${fmt(r.start)} → ${fmt(r.date)} · <b class="${late?'bad-t':''}">${daysTxt(r.date, r.status)}</b>`)}${fact('Owners', people(r.assignee))}${fact('Departments', r.depts.map(esc).join(', '))}</div>
        ${sect('Summary', para(r.notes))}${sect('Depends on', para(r.dependencies))}
        ${subs.length?sect('Subtasks', `${bar(dn(subs), subs.length)}<div class="rv-rows">${rowList(subs,'subtask')}</div>`, ` <small>${dn(subs)} of ${subs.length} done</small>`):''}
        ${taskList(ts)}${clList(cl, 'Checklist deliverables · P.I.C.S Checklist', 'cl')}${links()}`;
    } else if (lv==='subtask') {
      body = `<div class="facts">${fact('Task block', block?`<button type="button" class="link" data-rv="${block.id}">${esc(block.short)}</button>`:'—')}${fact('Dates', `${fmt(r.start)} → ${fmt(r.date)} · <b class="${late?'bad-t':''}">${daysTxt(r.date, r.status)}</b>`)}${fact('Owners', people(r.assignee))}${fact('Synced to P.I.C.S', r.syncFlag?'✓ Yes':'No')}</div>
        ${sect('Spec', para(r.notes.replace(/^Original spec:\s*/,'')))}${sect('Depends on', para(r.dependencies))}${taskList(ts, 'Linked task')}${links()}`;
    } else if (lv==='milestone') {
      body = `<div class="hero ${late?'late':''}"><div><div class="label">Due</div><b>${fmtLong(r.date)}, ${D(r.date).getFullYear()}</b></div><div class="big">${daysTxt(r.date, r.status)}</div></div>
        <div class="facts">${fact('Phase', esc(r.phase))}${fact('Window', `${fmt(r.start)} → ${fmt(r.date)}`)}${fact('Owners', people(r.assignee))}${fact('Gate checks passed', cl.length?`${dn(cl)} of ${cl.length}`:'')}</div>
        ${sect('Acceptance criteria', para(r.notes))}${fbCards}${clList(cl, 'Gate checklist · P.I.C.S Checklist', 'gate')}${taskList(ts)}${sect('Depends on', para(r.dependencies))}${links()}`;
    } else {
      const time = (r.notes.match(/\d{1,2}:\d{2}\s?[ap]m(\s?ET)?/i)||[])[0];
      body = `<div class="hero meet"><div><div class="label">${esc(r.meetingKind||'Meeting')}</div><b>${fmtLong(r.date)}, ${D(r.date).getFullYear()}${time?' · '+esc(time):''}</b></div><div class="big">${isDone(r.status)?'Held':daysTxt(r.date, r.status)}</div></div>
        <div class="facts">${fact('Sprint', sprint?`<button type="button" class="link" data-rv="${sprint.id}">${sprintLabel(sprint)} · ${esc(sprint.short)}</button>`:'—')}${fact('Attendees', people(r.assignee))}</div>
        ${sect('Purpose', para(r.notes))}${sect('Covers', para(r.dependencies))}${clList(cl, 'Decisions & approvals', 'appr')}${fbCards}${links()}`;
    }
    f.innerHTML = head + body + `<p class="muted" style="font-size:11.5px;margin-top:18px">Read-only view of ${TYPE_NAME[lv].toLowerCase()} columns. Select ✎ to edit all ${FIELD_MAP.length} P.I.C.S Roadmaps columns and its tasks.</p>`;
  }
  const bar = (d,t) => `<div class="bar done ${t&&d===t?'good':''}" style="height:6px;margin-bottom:6px"><i style="width:${pct(d,t)}%"></i></div>`;
  const kpi = (d,t,l) => `<div class="kpi"><b style="color:${t&&d===t?'var(--ok)':'var(--brand)'}">${t?d+'/'+t:'—'}</b><div class="n">${l}</div><div class="s">${t?pct(d,t)+'% done':'none linked'}</div></div>`;
  function taskView(t){
    const open = openTask.has(t.id), done = isDone(t.status);
    return `<div class="trow ro ${done?'done':''}"><div class="top" data-topen="${t.id}" role="button" tabindex="0">
      <span class="cbx ${done?'on':''}" aria-hidden="true"></span>
      <div class="tt">${esc(t.title)}<small>${esc(t.type||'Task')} · ${esc((t.assigneeAll||[t.assignee]).join(', '))}${t.due?` · Due ${fmt(t.due)}`:''}${(t.planned||t.worked)?` · ${t.worked||0}/${t.planned||0} hrs`:''}</small></div>
      ${t.priority?`<span class="chip pr-${t.priority}">${esc(t.priority)}</span>`:''}${statusChip(t.status)}<span class="go">${open?'▾':'▸'}</span></div>
      ${open?`<div class="ro-more">${t.details?`<div><div class="label">Task details</div><p class="rv-p">${esc(t.details)}</p></div>`:''}<div><div class="label">Notes from assignee</div><p class="rv-p">${esc(t.notesFromAssignee||'—')}</p></div><div class="row"><span class="chip">Start ${fmt(t.start)}</span><span class="chip">Due ${fmt(t.due)}</span>${t.due?`<span class="chip">Wk${isoWeek(t.due)}</span>`:''}</div></div>`:''}</div>`;
  }
  function clView(i){
    const late = isLate(i.due, i.status);
    return `<button type="button" class="rv-row" data-opencl="${i.checklist}"><span class="dot ${isDone(i.status)?'done':late?'late':i.status==='Blocked'?'blocked':''}"></span><span class="tt">${esc(i.title)}<small>${late?'<b style="color:var(--bad)">Overdue</b> · ':''}Due ${fmt(i.due)}${i.owner.length?' · '+esc(i.owner.join(', ')):''}${i.reviewer.length?' · Reviewer '+esc(i.reviewer.join(', ')):''}</small></span>${statusChip(i.status)}</button>`;
  }
  function fbView(f){
    return `<div class="fb inline click" data-fbopen="${f.id}" role="button" tabindex="0"><div class="between"><b>${esc(f.title)}</b>${statusChip(f.status)}</div><div class="row" style="margin-top:6px"><span class="chip">${esc(f.type)} · Round ${f.round}</span><span class="chip ${isLate(f.due,f.status)?'bad':''}">Due ${fmt(f.due)}</span><span class="chip">Reviewer: ${esc(f.reviewer)}</span>${f.link?`<a class="link" href="${esc(f.link)}" target="_blank" rel="noopener">Review link ↗</a>`:''}</div></div>`;
  }

  /* =====================================================================
     [UPD-21] FEEDBACK & REVIEW ROUND RECORD — all 17 columns of Feedback & Review Rounds (tblh2CY3dxTaXlUfm)
     Read view → "Add feedback" composer → ✎ full editor → Save & resync. Share button opens the share dialog.
     ===================================================================== */
  const FB_OPT = {
    type: ['Internal Review','Stakeholder Review','Final Review','Client Review','External Audit','Other','Sprint Review','Leadership Review'],   // fld1qdH1SGgShJGJb
    status: ['Not Started','In Progress','Feedback Received','In Revision','Ready for Approval','Approved','Rejected'],                         // fldC3hmSDLr5hhqbG
    tagStatus: ['Tagged','Needs Review','Archived'],
  };
  if (opts.data.options?.fbType?.length) FB_OPT.type = opts.data.options.fbType; if (opts.data.options?.fbStatus?.length) FB_OPT.status = opts.data.options.fbStatus; // [APP] live choices
  const FB_FIELDS = [['Feedback & Review Title','fldUXnDYJanguB9QT'],['Round Number','fldTp3XWf1c4yPjlV'],['Related P.I.C.S','fldzhSZukAQGF34dN'],['Related Roadmap','fldqI128WtFXFKMJ7'],['Round Type','fld1qdH1SGgShJGJb'],['Status','fldC3hmSDLr5hhqbG'],['Due Date','fldcDdmwvHGBHePbX'],['Month','fldACram7yTOkd0pc'],['Reviewer(s)','fld6RoWXGvolWGsZj'],['Related Checklist','fld4X3pX08BHV6Yfq'],['Review Attachments','fldHmjnMtrXBIqqcH'],['Review URLs','fldDGYLjgorJn4nPD'],['Review Notes','fldtFckrcjELeI9LE'],['Review Actions','fldcJlYjRz2LR7HyG'],['Feedback URLs','fldYaMt8O6V9Ep7NP'],['P.I.C.S Tag','fldwkmIWLptAAcC6m'],['Tag Status','fldCrakkmZi57g8eC']];
  let FBD = null, fbMode = 'view';
  const fbById = id => FEEDBACK.find(f=>f.id===id);
  const urlList = t => String(t||'').split(/[\s,]+/).filter(u=>/^https?:\/\//i.test(u));
  function openFeedback(id){ FBD = JSON.parse(JSON.stringify(fbById(id))); FBD.log = FBD.log || []; fbMode = 'view'; renderFeedback(); raise('fbOv'); $('#fbOv').classList.add('open'); $('#fbBody').scrollTop = 0; }
  function renderFeedback(){
    const f = FBD, view = fbMode==='view', late = isLate(f.due, f.status);
    $('#fbTitle').innerHTML = `${view?'':'✎ Editing · '}${esc(f.title)} ${U('UPD-21')}`;
    $('#fbSub').innerHTML = `Feedback &amp; Review Rounds · <span class="mono">${esc(f.tag||'—')}</span>`;
    $('#fbPencil').style.display = view ? '' : 'none'; $('#fbSave').style.display = view ? 'none' : ''; $('#fbCancel').textContent = view ? 'Close' : 'Cancel';
    const rms = (f.roadmapIds||[]).map(rmById).filter(Boolean);
    const cls = (f.checklistIds||[]).map(id=>CITEMS.find(i=>i.id===id)).filter(Boolean);
    const clNames = (f.relChecklist||[]).filter(n=>!cls.some(c=>c.title===n));
    const pics = (f.picsIds||[]).map(byId).filter(Boolean);
    const people = names => names.map(n=>`<span class="person"><i>${initials(n)}</i>${esc(n)}</span>`).join('');
    const links = t => urlList(t).map(u=>`<a class="link" href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//,''))} ↗</a>`).join('<br>') || '<span class="muted">None</span>';
    if (view) {
      $('#fbBody').innerHTML = `
        <div class="rv-chips"><span class="chip">${esc(f.type)} · Round ${f.round}</span>${statusChip(f.status)}${late?'<span class="chip bad">Overdue</span>':''}<span class="chip mono">${esc(f.tag)}</span><span class="chip">${esc(f.tagStatus||'—')}</span></div>
        <div class="hero fbh ${late?'late':''}"><div><div class="label">Due</div><b>${f.due?fmtLong(f.due)+', '+D(f.due).getFullYear():'—'}</b></div><div class="big">${f.due?daysTxt(f.due,f.status):''}</div></div>
        <div class="facts">
          <div class="fact"><div class="label">Reviewer(s)</div><div class="v">${people(f.reviewers)||'—'}</div></div>
          <div class="fact"><div class="label">Month</div><div class="v">${esc(f.month||'—')}</div></div>
          <div class="fact"><div class="label">Related P.I.C.S</div><div class="v">${pics.map(p=>`<span class="chip">${esc(p.name)}</span>`).join('')||(f.relPics||[]).map(n=>`<span class="chip">${esc(n)}</span>`).join('')||'—'}</div></div>
        </div>
        <div class="rsec"><h5>Review notes</h5><p class="rv-p">${esc(f.notes||'—')}</p></div>
        <div class="rsec"><h5>Review actions</h5><p class="rv-p">${esc(f.actions||'—')}</p></div>
        <div class="rsec add-fb"><h5>Add feedback</h5>
          <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><select id="fbKind" aria-label="Type"><option>Feedback</option><option>Action item</option><option>Decision</option></select>
          <textarea id="fbText" placeholder="Add feedback, a decision or an action for this round…" rows="2"></textarea></div>
          <div class="row" style="justify-content:flex-end;margin-top:8px"><span class="muted" style="font-size:11.5px;margin-right:auto">Feedback & decisions are added to Review Notes; action items to Review Actions.</span><button type="button" class="btn sm primary" data-fbadd>Add &amp; save</button></div>
          ${f.log.length?`<div class="fb-log">${f.log.map(l=>`<div><b>${esc(l.kind)}</b> · ${esc(l.when)} · ${esc(l.who)}<br>${esc(l.text)}</div>`).join('')}</div>`:''}</div>
        <div class="rsec"><h5>Related roadmap <small>${rms.length||(f.relRoadmap||[]).length}</small></h5><div class="rv-rows">${rms.map(r=>`<button type="button" class="rv-row" data-fbrv="${r.id}">${kindBadge(r.kind,'•')}<span class="tt">${esc(r.short||r.title)}<small>${esc(r.tag)} · ${range(r)}</small></span>${statusChip(r.status)}<span class="go">›</span></button>`).join('') || (f.relRoadmap||[]).map(n=>`<div class="rv-row"><span class="tt">${esc(n)}</span></div>`).join('') || '<span class="muted">None</span>'}</div></div>
        <div class="rsec"><h5>Related checklist <small>${dn(cls)} of ${cls.length+clNames.length} complete</small></h5><div class="rv-rows">${cls.map(clView).join('')}${clNames.map(n=>`<div class="rv-row"><span class="dot"></span><span class="tt">${esc(n)}<small>not in this card's data</small></span></div>`).join('') || (cls.length?'':'<span class="muted">None</span>')}</div></div>
        <div class="links rsec">
          <div class="lnk"><div class="label">Review URLs</div>${links(f.reviewUrls||f.url)}</div>
          <div class="lnk"><div class="label">Feedback URLs</div>${links(f.feedbackUrls)}</div>
        </div>
        <div class="rsec"><h5>Review attachments</h5><div class="lchips">${(f.attachments||[]).map(a=>`<span class="chip">📎 ${esc(a.name)}${a.size?` · ${Math.round(a.size/1024)} KB`:''}</span>`).join('') || '<span class="muted" style="font-size:12.5px">No files</span>'}
          <label class="btn sm" style="cursor:pointer">＋ Attach file<input type="file" id="fbFile" multiple hidden></label></div></div>
        <details class="fm rsec"><summary>Airtable field map · Feedback &amp; Review Rounds (${FB_FIELDS.length} columns)</summary><table class="fmap"><tr><th>Column</th><th>Field ID</th></tr>${FB_FIELDS.map(m=>`<tr><td>${m[0]}</td><td><code>${m[1]}</code></td></tr>`).join('')}</table></details>`;
    } else {
      const sel = (n, o, v) => `<select name="${n}">${o.map(x=>`<option ${x===v?'selected':''}>${esc(x)}</option>`).join('')}</select>`;
      $('#fbBody').innerHTML = `<form id="fbForm">
        <div class="rgrid">
          <div class="field full"><label>Feedback &amp; Review Title</label><input name="title" value="${esc(f.title)}" required></div>
          <div class="field"><label>Round Type</label>${sel('type', FB_OPT.type, f.type)}</div>
          <div class="field"><label>Status</label>${sel('status', FB_OPT.status, f.status)}</div>
          <div class="field"><label>Round Number</label><input type="number" name="round" value="${esc(f.round)}"></div>
          <div class="field"><label>Due Date</label><input type="date" name="due" value="${esc(f.due)}"></div>
          <div class="field"><label>Month</label><input disabled value="${esc(f.due?monthName(f.due):f.month)}"></div>
          <div class="field"><label>Tag Status</label>${sel('tagStatus', FB_OPT.tagStatus, f.tagStatus)}</div>
          <div class="field full"><label>Reviewer(s)</label><div class="lchips">${f.reviewers.map((n,i)=>`<span class="chip">${esc(n)}<button type="button" data-fbrmrev="${i}" aria-label="Remove">×</button></span>`).join('')}<select id="fbAddRev"><option value="">＋ Add reviewer…</option>${OPT.team.filter(n=>!f.reviewers.includes(n)).map(n=>`<option>${esc(n)}</option>`).join('')}</select></div></div>
          <div class="field full"><label>Review Notes</label><textarea name="notes" rows="4">${esc(f.notes)}</textarea></div>
          <div class="field full"><label>Review Actions</label><textarea name="actions" rows="3">${esc(f.actions)}</textarea></div>
          <div class="field"><label>Review URLs</label><textarea name="reviewUrls" rows="2" placeholder="One link per line">${esc(f.reviewUrls||f.url)}</textarea></div>
          <div class="field"><label>Feedback URLs</label><textarea name="feedbackUrls" rows="2" placeholder="One link per line">${esc(f.feedbackUrls)}</textarea></div>
          <div class="field"><label>P.I.C.S Tag</label><input name="tag" value="${esc(f.tag)}"></div>
        </div>
        <p class="muted" style="font-size:12px">Related P.I.C.S, Related Roadmap and Related Checklist are linked records — change them from those records.</p></form>`;
    }
  }
  /* WRITE-BACK HOOK — PATCH /api/feedback-rounds/:id */
  function saveFeedback(patch, msg){ const f = fbById(FBD.id);
    const diff = {}; for (const k of Object.keys(patch)) if (k!=='attachments' && JSON.stringify(patch[k]) !== JSON.stringify(f[k])) diff[k] = patch[k];
    if (Object.keys(diff).length && isRec(f.id)) persist('feedback', f.id, diff, AREA.fb);
    if ('attachments' in patch) msg = 'Files shown here only — upload them in Airtable (file upload from the dashboard is not available yet)';
    Object.assign(f, patch); if (patch.due) f.month = monthName(patch.due); f.reviewer = f.reviewers.join(', '); f.link = f.reviewUrls || f.url; FBD = JSON.parse(JSON.stringify(f)); FBD.log = f.log || []; toast(msg || 'Saved · Feedback & Review Rounds resync queued'); refreshAll(); }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-fbadd],[data-fbrv],[data-fbrmrev],#fbPencil,#fbCancel,#fbSave,#fbShare'); if (!t || !FBD) return;
    if (t.id==='fbPencil'){ fbMode='edit'; return renderFeedback(); }
    if (t.id==='fbCancel'){ if (fbMode==='edit'){ FBD = JSON.parse(JSON.stringify(fbById(FBD.id))); FBD.log = fbById(FBD.id).log||[]; fbMode='view'; return renderFeedback(); } return closeLayer('fbOv'); }
    if (t.id==='fbShare') return openShare('fb', FBD.id);
    if (t.id==='fbSave'){ const v = Object.fromEntries(new FormData($('#fbForm'))); if (!v.title.trim()) return toast('Add a title first'); v.round = +v.round||0; saveFeedback({...v, reviewers: FBD.reviewers}); fbMode='view'; return renderFeedback(); }
    if (t.dataset.fbrmrev !== undefined){ FBD.reviewers.splice(+t.dataset.fbrmrev,1); return renderFeedback(); }
    if (t.dataset.fbrv){ closeLayer('fbOv'); S.rvStack=[]; return openEdit('rm', t.dataset.fbrv); }
    if (t.dataset.fbadd !== undefined){ const txt = $('#fbText').value.trim(), kind = $('#fbKind').value; if (!txt) return $('#fbText').focus();
      const who = CURRENT_USER, when = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}), line = `[${when} · ${who} · ${kind}] ${txt}`;
      const f = fbById(FBD.id); f.log = [...(f.log||[]), {kind, when, who, text: txt}];
      saveFeedback(kind==='Action item' ? {actions: [f.actions, line].filter(Boolean).join('\n')} : {notes: [f.notes, line].filter(Boolean).join('\n')}, `${kind} added · Feedback & Review Rounds resync queued`);
      return renderFeedback(); }
  });
  document.addEventListener('change', e => {
    if (!FBD) return;
    if (e.target.closest('#fbForm') && e.target.name) FBD[e.target.name] = e.target.type==='number' ? +e.target.value : e.target.value;   // keep edits across re-renders
    if (e.target.id==='fbAddRev' && e.target.value){ FBD.reviewers.push(e.target.value); renderFeedback(); }
    if (e.target.id==='fbFile'){ const files = [...e.target.files].map(f=>({name:f.name, size:f.size, type:f.type})); saveFeedback({attachments:[...(fbById(FBD.id).attachments||[]), ...files]}, `${plural(files.length,'file')} attached · upload queued`); renderFeedback(); }
  });

  /* =====================================================================
     [UPD-22] SHARING — P.I.C.S card (⋯ menu) and Feedback round (Share)
     Invite team members or external parties with a role, choose what's included, link access + expiry, export.
     DEV: sharePics() → POST /api/share {kind,id,invites,access,expiry,include}; links are token URLs (no personal data in the URL).
     ===================================================================== */
  let SH = null;
  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(9))).map(b=>b.toString(36).padStart(2,'0')).join('').slice(0,14);
  function openShare(kind, id){
    const rec = kind==='pics' ? byId(id) : fbById(id);
    const owners = kind==='pics' ? rec.leads : rec.reviewers;
    SH = {kind, id, name: kind==='pics' ? rec.name : rec.title, people: owners.map(n=>({who:n, role:'Editor', external:false, owner:true})), access:'restricted', expiry:'30 days', link: viewLink(kind, id),
      include: kind==='pics' ? {Overview:true,'Timeline & KPIs':true,'Roadmap & phases':true,'Tasks':false,'Checklists':true,'Feedback rounds':true,'Attachments':false} : {'Review notes':true,'Review actions':true,'Review & feedback links':true,'Related checklist':true,'Attachments':false}};
    renderShare(); raise('shOv'); $('#shOv').classList.add('open'); setTimeout(()=>$('#shWho').focus(), 30);
  }
  function renderShare(){
    const s = SH;
    $('#shTitle').textContent = s.kind==='pics' ? 'Share P.I.C.S' : 'Share feedback & review round';
    $('#shSub').textContent = s.name;
    $('#shBody').innerHTML = `
      <div class="field"><label>Invite people</label>
        <div class="row" style="flex-wrap:nowrap"><input id="shWho" list="shTeam" placeholder="Team member name or email address" autocomplete="off"><datalist id="shTeam">${OPT.team.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
        <select id="shRole"><option>Viewer</option><option>Commenter</option><option>Editor</option></select><button type="button" class="btn sm primary" data-shadd>Add</button></div>
        <div class="muted" style="font-size:11.5px;margin-top:6px">Team members are matched to Team Members; anything with an email address outside the team is marked <b>External</b> and gets a read-only guest view unless you choose Commenter.</div></div>
      <div class="rsec"><h5>People with access</h5><div class="sh-people">${s.people.map((p,i)=>`<div class="sh-p"><span class="person"><i>${initials(p.who)}</i>${esc(p.who)}</span>${p.external?'<span class="chip warn">External</span>':''}${p.owner?'<span class="muted" style="font-size:12px;margin-left:auto">Owner</span>':`<select data-shrole="${i}" style="margin-left:auto">${['Viewer','Commenter','Editor'].map(r=>`<option ${r===p.role?'selected':''} ${p.external&&r==='Editor'?'disabled':''}>${r}</option>`).join('')}</select><button type="button" class="x sm" data-shrm="${i}" aria-label="Remove">×</button>`}</div>`).join('')}</div></div>
      <div class="rsec"><h5>Include</h5><div class="sh-inc">${Object.entries(s.include).map(([k,v])=>`<label><input type="checkbox" data-shinc="${esc(k)}" ${v?'checked':''}> ${esc(k)}</label>`).join('')}</div></div>
      <div class="rsec"><h5>General access</h5>
        <div class="sh-acc"><select id="shAccess"><option value="restricted" ${s.access==='restricted'?'selected':''}>Restricted — only people added above</option><option value="link" ${s.access==='link'?'selected':''}>Anyone with the link can view</option></select>
        <select id="shExpiry">${['7 days','30 days','90 days','Never'].map(x=>`<option ${x===s.expiry?'selected':''}>${x}</option>`).join('')}</select></div>
        <div class="sh-link"><span class="mono">${esc(s.link)}</span><button type="button" class="btn sm" data-shcopy>Copy link</button></div></div>
      <div class="field rsec"><label>Message (optional)</label><textarea id="shMsg" rows="2" placeholder="Add context for the people you're sharing with…"></textarea></div>
      <div class="rsec"><h5>Export</h5><div class="row"><button type="button" class="btn sm" data-shsum>Copy summary</button><button type="button" class="btn sm" data-shprint>Print / Save as PDF</button><button type="button" class="btn sm" data-shmail>Email link</button></div></div>`;
  }
  function shareSummary(){
    const s = SH;
    if (s.kind==='fb'){ const f = fbById(s.id); return [f.title, `${f.type} · Round ${f.round} · ${f.status} · Due ${fmt(f.due)}`, `Reviewer(s): ${f.reviewer}`, s.include['Review notes']?`\nNotes:\n${f.notes}`:'', s.include['Review actions']?`\nActions:\n${f.actions}`:'', s.include['Review & feedback links']?`\nLinks: ${[...urlList(f.reviewUrls||f.url),...urlList(f.feedbackUrls)].join(' ')}`:'', `\n${s.link}`].filter(Boolean).join('\n'); }
    const p = byId(s.id), r = rollup(p.id); return [p.name, `${p.type} · ${p.stage} · ${fmt(p.start)} → ${fmt(p.end)}`, `Leads: ${p.leads.join(', ')}`, s.include.Overview&&p.overview?`\n${p.overview}`:'', s.include['Timeline & KPIs']?`\nDone ${pct(r.done,r.work)}% (${r.done}/${r.work}) · Overdue ${r.late} · Coming up ${r.soon}`:'', `\n${s.link}`].filter(Boolean).join('\n');
  }
  /* WRITE-BACK HOOK — POST /api/share */
  function sharePics(payload){
    if (!opts.share) { toast('Sharing invites are not available yet'); return Promise.resolve(false); }
    return opts.share(payload).then(r => { toast(r.message || (r.ok ? 'Shared' : 'Sharing invites are not available yet')); return !!r.ok; }).catch(e => { toast(e && e.message || 'Share failed'); return false; });
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-shadd],[data-shrm],[data-shcopy],[data-shsum],[data-shprint],[data-shmail],#shSend,#shCancel'); if (!t || !SH) return;
    const d = t.dataset;
    if (d.shadd !== undefined){ const v = $('#shWho').value.trim(); if (!v) return $('#shWho').focus(); const internal = OPT.team.includes(v); const email = /\S+@\S+\.\S+/.test(v);
      if (!internal && !email) return toast('Pick a team member or enter an email address'); if (SH.people.some(p=>p.who===v)) return toast('Already has access');
      SH.people.push({who:v, role: !internal && $('#shRole').value==='Editor' ? 'Commenter' : $('#shRole').value, external: !internal}); renderShare(); return; }
    if (d.shrm !== undefined){ SH.people.splice(+d.shrm,1); return renderShare(); }
    if (d.shcopy !== undefined){ navigator.clipboard?.writeText(SH.link).catch(()=>{}); return toast('Link copied'); }
    if (d.shsum !== undefined){ navigator.clipboard?.writeText(shareSummary()).catch(()=>{}); return toast('Summary copied'); }
    if (d.shmail !== undefined){ location.href = `mailto:?subject=${encodeURIComponent('Shared: '+SH.name)}&body=${encodeURIComponent(SH.link)}`; return; }
    if (d.shprint !== undefined){ const w = window.open('', '_blank'); if (!w) return toast('Allow pop-ups to print'); w.document.write(`<title>${esc(SH.name)}</title><pre style="font:14px/1.5 system-ui;white-space:pre-wrap;padding:24px">${esc(shareSummary())}</pre>`); w.document.close(); w.print(); return; }
    if (t.id==='shCancel') return closeLayer('shOv');
    if (t.id==='shSend'){ const invites = SH.people.filter(p=>!p.owner); if (!invites.length && SH.access==='restricted') return toast('Add someone or switch to link access');
      const sh = SH; sharePics({kind:SH.kind, id:SH.id, invites, access:SH.access, expiry:SH.expiry, include:SH.include, message:$('#shMsg').value, link:SH.link}).then(ok => { if (!ok || destroyed || SH !== sh) return;
      const log = {kind:'Shared', when:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}), who:CURRENT_USER, text:`${invites.map(p=>p.who+' ('+p.role+')').join(', ')||'link access'} · ${SH.access==='link'?'anyone with link':'restricted'} · expires ${SH.expiry}`};
      if (SH.kind==='fb'){ const f = fbById(SH.id); f.log = [...(f.log||[]), log]; if (FBD && FBD.id===f.id){ FBD.log = f.log; renderFeedback(); } }
      closeLayer('shOv'); }); }
  });
  document.addEventListener('change', e => {
    if (!SH) return; const t = e.target;
    if (t.dataset.shrole !== undefined) SH.people[+t.dataset.shrole].role = t.value;
    if (t.dataset.shinc !== undefined) SH.include[t.dataset.shinc] = t.checked;
    if (t.id==='shAccess') SH.access = t.value;
    if (t.id==='shExpiry') SH.expiry = t.value;
  });
  document.addEventListener('input', e => { if (FBD && e.target.closest('#fbForm') && e.target.name && e.target.type!=='number') FBD[e.target.name] = e.target.value; });
  document.addEventListener('keydown', e => { if (SH && e.target.id==='shWho' && e.key==='Enter'){ e.preventDefault(); document.querySelector('[data-shadd]').click(); } });

  /* ⋯ menu on the P.I.C.S card (grid card + full card header) */
  function openMenu(btn, id){
    const m = $('#picsMenu'); const r = btn.getBoundingClientRect(); m.dataset.id = id;
    m.style.top = (r.bottom + 6) + 'px'; m.style.left = Math.max(8, Math.min(window.innerWidth - 236, r.right - 228)) + 'px';
    raise('picsMenu'); m.classList.add('open'); m.querySelector('button').focus();
  }
  document.addEventListener('click', e => {
    const m = $('#picsMenu'); const b = e.target.closest('[data-menu]');
    if (b){ e.stopPropagation(); return m.classList.contains('open') && m.dataset.id===b.dataset.menu ? m.classList.remove('open') : openMenu(b, b.dataset.menu); }
    const a = e.target.closest('[data-menuact]');
    if (a){ const id = m.dataset.id, act = a.dataset.menuact; m.classList.remove('open');
      if (act==='share') return openShare('pics', id);
      if (act==='link'){ navigator.clipboard?.writeText(viewLink('pics', id)).catch(()=>{}); return toast('Link copied — opens this P.I.C.S card'); }
      if (act==='export'){ SH = {kind:'pics', id, name: byId(id).name, link:'', include:{Overview:true,'Timeline & KPIs':true}}; navigator.clipboard?.writeText(shareSummary()).catch(()=>{}); SH = null; return toast('Summary copied'); }
      if (act==='airtable') return window.open('https://airtable.com/appLH1D7ME6mU1zgE/tblbiIHxN97iyltFY/'+(isRec(id)?id:''),'_blank','noopener');
    }
    if (!e.target.closest('#picsMenu')) m.classList.remove('open');
  }, true);

  /* WRITE-BACK HOOK — PATCH /api/tasks/:id (Tasks Planning) */
  /* [APP] every hook keeps the prototype's optimistic local update, then writes through opts.persist
     (→ /api/pics/card/* → Airtable, logged in the Dashboard Sync Queue). Failures are toasted. */
  const isRec = id => /^rec[A-Za-z0-9]{14}$/.test(String(id||''));
  function persist(kind, id, patch, area){
    if (!opts.persist) return Promise.resolve(null);
    if (kind==='roadmap'){ patch = {...patch};
      if (patch.relPics) patch.picsIds = [...new Set(patch.relPics.map(n => PICS.find(p=>p.name===n)?.id).filter(Boolean))];
      if (patch.feedback) patch.feedbackIds = [...new Set(patch.feedback.map(n => FEEDBACK.find(f=>f.title===n)?.id).filter(Boolean))];
      if (patch.tasks) patch.tasks = patch.tasks.filter(isRec); }
    return opts.persist({kind, id: isRec(id) ? id : null, patch, area}).catch(e => { if (!destroyed) toast(e && e.message ? e.message : 'Not saved to Airtable'); return null; });
  }
  function swapId(kind, from, to){
    if (!to || from===to) return;
    if (kind==='roadmap'){ const r = rmById(from); if (r) r.id = to; ROADMAP.forEach(x=>{ if (x.parentId===from) x.parentId = to; }); TASKS.forEach(t=>{ t.roadmapIds = (t.roadmapIds||[]).map(x=>x===from?to:x); if (t.roadmap===from) t.roadmap = to; }); CITEMS.forEach(i=>{ i.roadmapIds = (i.roadmapIds||[]).map(x=>x===from?to:x); }); if (RM && RM.id===from) RM.id = to; }
    if (kind==='task'){ const t = taskOf(from); if (t) t.id = to; ROADMAP.forEach(r=>{ r.tasks = (r.tasks||[]).map(x=>x===from?to:x); }); if (RM) RM.tasks = (RM.tasks||[]).map(x=>x===from?to:x); if (openTask.has(from)){ openTask.delete(from); openTask.add(to); } }
    if (kind==='checklist'){ const i = CITEMS.find(x=>x.id===from); if (i) i.id = to; }
    if (!destroyed) refreshAll();
  }
  const AREA = { rm: 'Roadmap record', task: 'Roadmap record › Tasks', ci: 'Checklist', fb: 'Feedback & review round' };
  function saveTask(id, patch){ const t = taskOf(id); Object.assign(t, patch); if ('status' in patch) t.worked = isDone(t.status) && !t.worked ? t.planned : t.worked; toast('Task saved · Tasks Planning resync queued');
    const p = {...patch}; if ('status' in patch) p.worked = t.worked;
    if (isRec(id)) persist('task', id, p, AREA.task); }
  function saveRoadmapDraft(){
    const r = RM; r.kind = kindOf(r.rType); r.week = isoWeek(r.start); r.month = monthName(r.start); r.quarter = quarterOf(r.start); r.short = short(r.title); r.level = levelOf(r);
    if (r._new){ delete r._new; ROADMAP.push(r); toast('Roadmap item added · resync queued'); r.sync='Pending';
      const tmp = r.id; persist('roadmap', null, {...r, tasks: (r.tasks||[]).filter(isRec)}, AREA.rm).then(res => { r.sync = res ? 'Synced' : 'Failed'; if (res && res.id) swapId('roadmap', tmp, res.id); else if (!destroyed) refreshAll(); }); }
    else { const {id, ...all} = r; const old = rmById(id) || {}; const patch = {}; for (const k of Object.keys(all)) if (JSON.stringify(all[k]) !== JSON.stringify(old[k])) patch[k] = all[k]; saveRoadmapItem(id, patch); }
    RM = JSON.parse(JSON.stringify(rmById(r.id))); S.rmMode = 'view'; renderRoadmap(); refreshAll();
  }
  function cancelRoadmap(){ S.rvStack = []; S.rmMode = 'view'; openTask.clear(); if (RM && RM._new) RM.tasks.forEach(id=>{ const i=TASKS.findIndex(t=>t.id===id); if(i>=0) TASKS.splice(i,1); }); RM = null; }

  /* WRITE-BACK HOOKS — replace bodies with PATCH /api/pics/checklist/:id and /api/pics/roadmap/:id */
  function saveChecklistItem(id, patch, silent){ const i = CITEMS.find(x=>x.id===id); Object.assign(i, patch); if(!silent) toast('Saved · P.I.C.S Checklist resync queued');
    if (isRec(id)) persist('checklist', id, patch, AREA.ci); }
  function saveRoadmapItem(id, patch){ const r = ROADMAP.find(x=>x.id===id); Object.assign(r, patch, {sync:'Pending'}); toast('Saved · P.I.C.S Roadmap resync queued');
    const done = ok => { r.sync = ok ? 'Synced' : 'Failed'; if(!destroyed && $('#ov').classList.contains('open')) renderModal(); };
    if (!Object.keys(patch).length || !isRec(id)) return setTimeout(()=>done(true), 300);
    persist('roadmap', id, patch, AREA.rm).then(res => done(!!res || !opts.persist)); }

  function refreshAll(){ renderGrid(); if ($('#ov').classList.contains('open')) renderModal(); if ($('#drOv').classList.contains('open')) renderDrawer(); if ($('#weekOv').classList.contains('open')) renderWeek(); if ($('#clwOv').classList.contains('open')) renderClWeek(); }

  /* ---------------- EVENTS (delegated) ---------------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-close],[data-open],[data-type],[data-scope],[data-acc],[data-ref],[data-week],[data-wk],[data-page],[data-clweek],[data-clshow],[data-clf],[data-cl],[data-check],[data-inline],[data-ie-save],[data-full],[data-add],[data-fb],[data-req],[data-jump],[data-ms],[data-cwf],[data-fball],[data-fbopen],[data-tree],[data-openp],[data-rv],[data-rvback],[data-rmedit]');
    if (!t) { if (e.target.classList.contains('overlay')||e.target.classList.contains('sub-ov')||e.target.classList.contains('drawer-ov')) closeLayer(e.target.id); return; }
    const d = t.dataset;
    if (d.close) return closeLayer(d.close);
    if (d.open) return openModal(d.open);
    if (d.type) { typeFilter = d.type; renderTabs(); renderGrid(); return; }
    if (d.tree) { e.stopPropagation(); S.treeOpen.has(d.tree)?S.treeOpen.delete(d.tree):S.treeOpen.add(d.tree); return renderModal(); }
    if (d.openp) return openModal(d.openp);
    if (d.scope) { S.treeOpen && S.treeOpen.add(d.scope); S.scope = d.scope; S.odPage=S.cuPage=S.clPage=0; S.clWeek=null; renderModal(); return; }
    if (d.acc) { e.stopPropagation(); S.open.has(d.acc) ? S.open.delete(d.acc) : S.open.add(d.acc); renderModal(); return; }
    if (d.fbopen && t.closest('#edForm')) return openFeedback(d.fbopen);
    if (d.rv && !t.closest('#edForm')) { if (t.closest('#weekOv')) $('#weekOv').classList.remove('open'); S.rvStack = []; return openEdit('rm', d.rv); }
    if (d.ref) { const [k,id] = d.ref.split(':'); $('#weekOv').classList.remove('open'); return openEdit(k, id); }
    if (d.rv && t.closest('#weekOv')) { $('#weekOv').classList.remove('open'); S.rvStack=[]; return openEdit('rm', d.rv); }
    if (d.week) return openWeek(+d.week);
    if (d.wk !== undefined) { weekState.kind = d.wk || null; return renderWeek(); }
    if (d.page) { const [k,dir] = d.page.split(':'); if(k==='od')S.odPage=Math.max(0,S.odPage+ +dir); if(k==='cu')S.cuPage=Math.max(0,S.cuPage+ +dir); if(k==='cl')S.clPage=Math.max(0,S.clPage+ +dir); return renderModal(); }
    if (d.clweek) return openClWeek(+d.clweek);
    if (d.cwf) { S.cwFilter = d.cwf; return renderClWeek(); }   // [UPD-07] heatmap filters; no longer toggles hide
    if (d.clshow !== undefined) { S.clShow = !S.clShow; return renderModal(); }
    if (d.clf) { const [ctx,f] = d.clf.split(':'); if (ctx==='main'){S.clFilter=f;S.clPage=0;renderModal();} else {drState.filter=f;renderDrawer();} return; }
    if (d.cl) return openDrawer(d.cl);
    if (d.check) { const i = CITEMS.find(x=>x.id===d.check); const done = !isDone(i.status); saveChecklistItem(i.id, {status: done?'Completed':'Not Started'}, true); toast(done?'Checked off · resync queued':'Re-opened · resync queued'); return refreshAll(); }  // [UPD-08]
    if (d.inline) { inlineOpen.has(d.inline)?inlineOpen.delete(d.inline):inlineOpen.add(d.inline); return refreshAll(); }
    if (d.ieSave) { const id=d.ieSave; const q=s=>document.querySelector(`[${s}="${id}"]`); saveChecklistItem(id,{due:q('data-ie-due').value, itemType:q('data-ie-type').value, notes:q('data-ie-notes').value}); inlineOpen.delete(id); return refreshAll(); }
    if (d.full) return openEdit('ci', d.full);
    if (d.add) return openEdit(d.add==='roadmap'?'rm-new':'ci-new');
    if (d.fb) { const el = t.closest('.fb'); el.classList.toggle('open'); t.textContent = el.classList.contains('open')?'Hide notes':'Show notes'; return; }
    if (d.fbopen) { if (e.target.closest('a')) return; return openFeedback(d.fbopen); }
    if (d.fball !== undefined) { S.fbAll = !S.fbAll; return renderModal(); }
    if (d.req) { const r = REQUESTS[+d.req]; ROADMAP.push({id:'rm'+(++rid), pics:S.scope, kind:'task', title:r.title, date:addDays(iso(TODAY),14), status:'Not Started', phase:'Phase 2', stage:'Execution', sync:'Pending'}); REQUESTS.splice(+d.req,1); toast(`Added “${r.title}” to ${byId(S.scope).name}`); return refreshAll(); }
    if (d.jump) { document.getElementById('sec-'+d.jump)?.scrollIntoView({behavior:'smooth', block:'start'}); return; }
    if (d.ms) { const list = scopeData(S.scope).rm.filter(r=>r.kind==='milestone'&&r.date===d.ms); return list.length===1 ? openEdit('rm', list[0].id) : openWeek(isoWeek(d.ms)); }
  });
  // roadmap dialog interactions [UPD-16]
  $('#edForm').addEventListener('click', e => {
    if (!RM) return; const t = e.target.closest('[data-lrm],[data-ladd],[data-opencl],[data-tcheck],[data-topen],[data-tadd],[data-taddtog],[data-tunlink],[data-rv],[data-rvback],[data-rvall]'); if (!t) return;
    e.preventDefault(); e.stopPropagation(); const d = t.dataset;
    if (d.rv) return navRecord(d.rv);
    if (d.rvback !== undefined){ const id = S.rvStack.pop(); RM = JSON.parse(JSON.stringify(rmById(id))); S.rmMode='view'; renderRoadmap(); return; }
    if (d.rvall){ S.rvAll.has(d.rvall)?S.rvAll.delete(d.rvall):S.rvAll.add(d.rvall); return renderRoadmap(); }
    if (d.lrm){ const [k,i] = d.lrm.split(':'); RM[k].splice(+i,1); e.stopPropagation(); return renderRoadmap(); }
    if (d.ladd){ const inp = $(`[data-linp="${d.ladd}"]`); if (inp.value.trim()){ RM[d.ladd].push(inp.value.trim()); renderRoadmap(); } return; }
    if (d.opencl) return openDrawer(d.opencl);
    if (d.tcheck){ const tk = taskOf(d.tcheck); saveTask(tk.id, {status: isDone(tk.status)?'Not Started':'Completed'}); return renderRoadmap(); }
    if (d.topen){ openTask.has(d.topen)?openTask.delete(d.topen):openTask.add(d.topen); return renderRoadmap(); }
    if (d.taddtog !== undefined){ const b=$('#tAdd'); b.style.display = b.style.display==='none'?'block':'none'; $('#tNewTitle').focus(); return; }
    if (d.tadd !== undefined){ const title = $('#tNewTitle').value.trim(); if(!title){ $('#tNewTitle').focus(); return; }
      const tk = {id:'tk'+(++tid), roadmap:RM.id, title, assignee:$('#tNewWho').value, type:'Task', status:'Not Started', priority:'Medium', start:RM.start, due:RM.date, planned:2, worked:0, details:'', notesFromAssignee:''};
      TASKS.push(tk); RM.tasks.push(tk.id); toast('Task added · Tasks Planning resync queued');
      const tmp = tk.id; persist('task', null, {...tk, roadmapIds: [RM.id].filter(isRec)}, AREA.task).then(res => { if (res && res.id) swapId('task', tmp, res.id); });
      return renderRoadmap(); }
    if (d.tunlink){ RM.tasks = RM.tasks.filter(x=>x!==d.tunlink); openTask.delete(d.tunlink); toast('Task unlinked'); return renderRoadmap(); }
  });
  $('#edForm').addEventListener('change', e => {
    if (!RM) return; const el = e.target;
    if (el.dataset.lsel){ if (el.value){ RM[el.dataset.lsel].push(el.value); renderRoadmap(); } return; }
    if (el.dataset.tf){ const [id,k] = el.dataset.tf.split(':'); saveTask(id, {[k]: el.type==='number' ? +el.value : el.value}); return renderRoadmap(); }
    if (el.name){ RM[el.name] = el.type==='checkbox' ? el.checked : el.value; if (['rType','status','stage','start','date'].includes(el.name)){ RM.kind = kindOf(RM.rType); renderRoadmap(); } }
  });
  $('#edForm').addEventListener('input', e => { if (RM && e.target.name && e.target.type!=='checkbox') RM[e.target.name] = e.target.value; if (RM && e.target.name==='title') $('#edTitle').firstChild.textContent = (e.target.value||'New roadmap item')+' '; });
  $('#edForm').addEventListener('keydown', e => { if (e.target.matches('[data-topen]') && (e.key==='Enter'||e.key===' ')) { e.preventDefault(); e.target.click(); return; } if (RM && e.key==='Enter' && e.target.tagName==='INPUT' && !e.target.name){ e.preventDefault(); if (e.target.id==='tNewTitle') $('[data-tadd]').click(); else if (e.target.dataset.linp) $(`[data-ladd="${e.target.dataset.linp}"]`).click(); } });

  document.addEventListener('change', e => {
    const s = e.target.closest('[data-status]'); if (s) { saveChecklistItem(s.dataset.status, {status:s.value}); refreshAll(); }
  });
  $('#edSave').addEventListener('click', saveEdit);
  $('#edCancel').addEventListener('click', () => { if (RM && !RM._new && S.rmMode==='edit') { RM = JSON.parse(JSON.stringify(rmById(RM.id))); S.rmMode='view'; renderRoadmap(); } else closeLayer('edOv'); });
  $('#edPencil').addEventListener('click', () => { if (!RM) return; S.rmMode='edit'; renderRoadmap(); $('#edForm').scrollTop=0; });
  $('#edForm').addEventListener('submit', e => { e.preventDefault(); saveEdit(); });
  function closeLayer(id){ $('#'+id).classList.remove('open'); if (id==='fbOv') FBD = null; if (id==='shOv') SH = null; if (id==='edOv') cancelRoadmap(); if (id==='drOv') drState.cl=null; if (id==='clwOv') S.clWeek=null; if (id==='ov') document.body.style.overflow=''; if(id!=='ov') refreshAll(); }
  document.addEventListener('keydown', e => { if (e.key!=='Escape') return; const open = ['shOv','fbOv','edOv','drOv','clwOv','weekOv'].filter(id=>$('#'+id).classList.contains('open')).sort((a,b)=>(+$('#'+b).style.zIndex||0)-(+$('#'+a).style.zIndex||0)); const top = open[0] || ($('#ov').classList.contains('open')?'ov':null); if (top) closeLayer(top); });
  $('#showUpd').addEventListener('change', e => document.body.classList.toggle('hide-upd', !e.target.checked));
  $('#todayInp').value = iso(TODAY);
  $('#todayInp').addEventListener('change', e => { if (e.target.value){ TODAY = D(e.target.value); $('#todayLbl').textContent = fmt(iso(TODAY))+', '+TODAY.getFullYear(); refreshAll(); } });
  $('#todayLbl').textContent = fmt(iso(TODAY))+', '+TODAY.getFullYear();
  (function initDept(){
    const sel = $('#deptSel'); const ds = [...new Set(PICS.flatMap(p=>p.depts))].sort();
    sel.innerHTML += ds.map(d=>`<option ${d===deptFilter?'selected':''}>${esc(d)}</option>`).join('');
    sel.addEventListener('change', () => { deptFilter = sel.value; history.replaceState(null,'', deptFilter?'#dept='+encodeURIComponent(deptFilter):location.pathname); applyDeptTitle(); if (!inDept().some(p=>typeFilter==='All'||p.type===typeFilter)) typeFilter='All'; renderTabs(); renderGrid(); });
    applyDeptTitle(); if (!inDept().some(p=>p.type===typeFilter)) typeFilter='All';
  })();
  function applyDeptTitle(){ $('#pageTitle').textContent = deptFilter ? `${deptFilter} · P.I.C.S Roadmaps` : 'P.I.C.S Records'; }
  renderTabs(); renderGrid();
  if (opts.openId) { const p = findPics(opts.openId); if (p) openModal(p.id); }
  /* ---------------- [APP] external API ---------------- */
  return {
    setFilter(fn) { EXT_FILTER = fn || null; if (!inDept().some(p => typeFilter === 'All' || p.type === typeFilter)) typeFilter = 'All'; renderTabs(); renderGrid(); },
    open(id) { const p = findPics(id); if (p) openModal(p.id); },
    destroy() {
      destroyed = true;
      listeners.forEach(([t, fn, cap]) => shadow.removeEventListener(t, fn, cap));
      shadow.innerHTML = "";
      realDoc.body.style.overflow = "";
    },
  };
}
