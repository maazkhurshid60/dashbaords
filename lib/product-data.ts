/* Product dashboard — config, Airtable map and the deterministic example snapshot.
   Ported verbatim from VCG_Product_Dashboard.html (CFG / AT / mulberry / buildSample). */
import type {
  Account, Adoption, BacklogItem, ChecklistItem, Cohort, Deployment, Experiment, Feature, Feedback, Finding, Gate, GtmLaunch,
  HealthRow, Objective, PagePerf, Persona, Pics, ProductData, Release, RevenueRow, SpendRow, Sprint, Sweep, Theme, UptimeDay,
} from "./product-types";

type RawChecklist = { item: string; due: string | null; status: string } & Partial<Omit<ChecklistItem, "item" | "due" | "status">>;
type RawPics = Omit<Pics, "checklist"> & { checklist: RawChecklist[] };

/* =====================================================================
   CONFIG — where live data comes from. apiBase '' = same origin.
   Set NEXT_PUBLIC_VCG_API_BASE to the vcg-ant-connector project's URL
   when the endpoints live elsewhere (the original read window.VCG_API_BASE),
   or NEXT_PUBLIC_VCG_LIVE=1 once same-origin /api routes exist.
   ===================================================================== */
export interface SuiteConfig {
  /** Live mode is off until the backend endpoints exist (avoids polling 404s). */
  live: boolean;
  apiBase: string;
  ep: { data: string; write: string; site: string; deploy: string; ant: string };
  pollMs: number;
  siteUrl: string;
  launchDate: string;
  airtableBase: string;
}
export const CFG: SuiteConfig = {
  live: process.env.NEXT_PUBLIC_VCG_LIVE === "1" || !!process.env.NEXT_PUBLIC_VCG_API_BASE,
  apiBase: process.env.NEXT_PUBLIC_VCG_API_BASE || "",
  ep: { data: "/api/product/data", write: "/api/product/write", site: "/api/product/site", deploy: "/api/product/deploy", ant: "/api/chat" },
  pollMs: 60000,
  siteUrl: "https://acrylics.world",
  launchDate: "2026-12-01",
  airtableBase: "appLH1D7ME6mU1zgE",
};
/** Communications reads its own data endpoint (CFG.ep.data = '/api/comms/data'); the rest are shared. */
export const COMMS_CFG: SuiteConfig = { ...CFG, ep: { ...CFG.ep, data: "/api/comms/data" } };

/* Airtable map — every table/field the dashboard reads or writes.
   NEW = does not exist yet; listed in the Omni gap PDF. */
export interface AtTable { id: string | null; name: string; f?: Record<string, string> }
export const AT: Record<string, AtTable> = {
  features:  { id:'tblHmHsIskmPl2eqU', name:'Product Features', f:{ name:'fldoeCVwYWqTcrqKq', status:'fldtuSS5zOzo1eOxq', core:'fldQ85i0vqtLwpaf1', personas:'fldC6UkdhOp4QhSj4', feedback:'fldmBbE7shaSZXRbO', lead:'fldUQZq2qyg2CJ1Xo', prd:'fldzhPE6Fi0h5hqEx', releases:'fld4279xY8GQTXUyn', revenue:'fldTS6JYhRe0u0Bj9', gtm:'fldMNcWtPpRik5Cb6', site:'fld5ooqkjjbGohj0b' } },
  feedback:  { id:'tblEk0CJmGrykJEI7', name:'User Feedback & Insights', f:{ fid:'fldhoNfZGwTJGUIp2', source:'fldNy8ZjEaIinL4dU', account:'fld1qUXS08LICI8cD', summary:'fldYJQ7KjQMjLAHx4', sentiment:'fldjhklTIJ7hAClFM', feature:'fldIbMpHwobgpN5ik', date:'fld7Yg1RvklOySfcn' } },
  personas:  { id:'tbleWQMa32CVMh0sP', name:'Customer Personas', f:{ name:'fldEeceJtHtEV3BzG', summary:'fldYySrNY7i8aeGFH', objectives:'fldSOfeagWtro7CYh', pains:'fldGR5l1abfEp6COA', features:'fldvn3MjDMqrfWtth', stage:'fldVIgzYSlQxbC7wB', active:'fldB8cyqhkFxzUP3v', gtm:'fldqOELXVSUTcbJiJ' } },
  accounts:  { id:'tblV3xML3xmLIKh58', name:'Accounts (Reference)', f:{ ref:'fldiUpMZnQIunS7aH', tier:'fldxHektKtm3LzjUM', status:'fld8mK3mNgN5hQxRB', signup:'fld7WBkDK6rFlKlgc', churn:'fldZyIkzNigcmGo20', ltv:'flduzJ20E4ZGw9t2c' } },
  releases:  { id:'tbl43wxb4Dl5KXU8I', name:'Releases & Deployment Log', f:{ version:'fldeJGhNP6zyxVNbx', date:'fldD104uKu8HeunOC', env:'fldkvPv5g43fU0hM0', features:'fld6DjdVXu65pQCCk', status:'fld0PtCBrZYeqmd49', notes:'fldn1BJUdnIVrWW71' } },
  backlog:   { id:'tble81BNpaiJChkl9', name:'Product Backlogs', f:{ title:'fldElMB1DifQaJCdv', product:'fldJ3QNmvhO5XUpQz', feature:'fldShylkLLgAhfXOn', sprint:'fldEY3gBI4rfzjRzO', epic:'fld8ArKZXaS9PiKHf', points:'fld1ZnBx2K2AGiCyw', eng:'fldwoB0m30RoJrpJl', blockers:'fldeA4jcYcJy806aX' } },
  health:    { id:'tblalaxVFYwK3WNoc', name:'System Health & Reliability', f:{ comp:'fld9vmKLIeopvCE3R', owner:'fldP12Enfri42t6GF', sev:'fldPAQMjMtAYL8dBN', uptime:'fldT0VNm6H43N5XpX', debt:'fldbNdCOwcUQI8vIE', sec:'fldUU2UtpXWavfmjr' } },
  revenue:   { id:'tblyu3Kh4cEYB0fs7', name:'Revenue & Forecasts', f:{ stream:'fldoyOPl9DShK8ZMt', period:'fldJD8iLZYAxBSGd7', tier:'fldEZkarXmgAapR4l', projected:'fldJQA38xuCPzRm7D', actual:'fld7j5wbReIsDm2tK', feature:'fldRPgmTmurUXDmqf' } },
  spend:     { id:'tbl3KbEgmFJRIbk2z', name:'Product Spend', f:{ tool:'fldR322yBLRg1I3Yw', vendor:'fldKFOvWPE5piElOx', cost:'fldX1aCtRpbaO6eaR', category:'fldEQvhvaQlCb92Jv', status:'fldlYqQCNhnbZX11d', renewal:'fld3KniPLujvrTe4D' } },
  gtm:       { id:'tblSpI0NIMeI2K8s6', name:'GTM Launches', f:{ name:'fldk8weP3nHVKvoqC', date:'fldPdXzBbDjfnmKyb', status:'fldfFG4gy4GrDIlQh', assets:'fld2nYWXPWhTM7FTR', personas:'fldJ6vvfL3h2C4vba' } },
  gates:     { id:'tbl0rfpl8MVowafj4', name:'Launch Criteria', f:{ name:'fldJ4MKXvcwCdEXeh', desc:'fldbPEGhF8MrClFOS', status:'fldkm7dTujI0iudux', evidence:'fldzTtw9gupFDwb4x' } },
  events:    { id:'tbl5QZKjWuSRsS8pL', name:'Feature Activity & Performance' },
  pages:     { id:'tblElR6EYDtchNnRu', name:'Site Map & Architecture' },
  pagePerf:  { id:'tbl5tZP3o76fex26L', name:'Page Performance' },
  goals:     { id:'tblcSUspCdafrVNUs', name:'Goals' },
  pics:      { id:'tblbiIHxN97iyltFY', name:'P.I.C.S' },
  registry:  { id:'tblTyyZPfo3MGBgEq', name:'IT & Systems Registry', f:{} },
  checklist: { id:'tbl8Nm9AL749eBLZC', name:'P.I.C.S Checklist', f:{ item:'fldDhDw2ZMVDseUXf', status:'fldN0OXB6xhKP57Zx', due:'fldhOmRI1jzLvdo88', notes:'fldTBCwzgSGoLmkpV', roadmap:'fld5xgC79nBUqNC0R' } },
  geo:       { id:'tblbCrSgBMkGyxsKy', name:'Geo-Engagement' },
  /* NEW tables (Omni build) */
  themes:    { id:null, name:'Feedback Themes (NEW)' },
  ideas:     { id:null, name:'Portal Ideas & Votes (NEW)' },
  snapshots: { id:null, name:'Feature Adoption Snapshots (NEW)' },
  checks:    { id:null, name:'Site Health Checks (NEW)' },
  experiments:{ id:null, name:'Experiments & Flags (NEW)' },
  /* Communications table (added by the Communications page in the original) */
  comms:     { id:'tblzb0tCJJoZCmo17', name:'Communications', f:{ status:'fldObZM1AA9j9XjmX', intent:'fldRkBWQpnI5cdG60', assignee:'fld9WIb2iEMqDNhYM', draft:'fldpLXPxz0RrPylwE', gen:'fld7b57v7TcSfHBEA', deploy:'fldfMBuMY7tkX01EQ', needs:'fldfNzIyDNvT6IPYX', notes:'fldopeOzqmBF5FtBh' } }
};
export const atUrl = (t: string | null | undefined, rec?: string | null) => `https://airtable.com/${CFG.airtableBase}/${t}${rec && rec.startsWith('rec') ? '/'+rec : ''}`;

/* ===================== SAMPLE SNAPSHOT =====================
   Deterministic (seeded) so the page reads the same every load.
   Persona profile text, tier prices, spend rows, GTM row and
   launch date are copied from the live base. Counts are sample.  */
export function mulberry(a: number){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
export const DAY=864e5;
export const iso=(d: number|string|Date)=>new Date(d).toISOString().slice(0,10);
/* Fixed anchor (local time, exactly as the original page). */
export const TODAY=new Date('2026-09-28T12:00:00');

/** Example snapshot. Pass a fresh seeded RNG so every call returns the same data. */
export function buildSample(R: () => number = mulberry(20261201)): ProductData {
  const rint=(a: number,b: number)=>Math.floor(a+R()*(b-a+1));
  const pick=<T,>(a: T[]): T=>a[Math.floor(R()*a.length)];
  const wpick=<T,>(items: T[],weights: number[]): T=>{ const s=weights.reduce((x,y)=>x+y,0); let r=R()*s; for(let i=0;i<items.length;i++){ r-=weights[i]; if(r<=0) return items[i]; } return items[items.length-1]; };
  const personas: Persona[]=[
    {id:'rec917h5OJaFWY1VR', name:'Angels', price:0, priceLabel:'Free', color:'var(--c1)', hex:'#3C6CFF', seg:'B2C',
      summary:"Clients and enthusiasts who join ACRYLICS for trends, booking, shopping, and general community access. Free tier — the entry point of the B2C funnel.",
      objectives:"Discover trending nail art and find qualified artists by specific technical expertise, not just location; book appointments with minimal friction; shop indie and enterprise beauty brands in one cart.",
      pains:"The 'Discovery Gap' between seeing a trend and finding a qualified artist who can deliver it; fragmented business data makes niche service providers hard to find on generalist platforms; multi-brand checkout friction when buying from different vendors."},
    {id:'recu7mDMRa6Zh1Afw', name:'Sellers', price:0, fee:.035, priceLabel:'3–5% fee', color:'var(--c2)', hex:'#D97A3D', seg:'B2C',
      summary:"Marketplace-only users (indie to mid-size brands or artists) who create stores on ACRYLICS to reach high-intent vertical traffic. B2C tier, 3–5% transaction fee, no monthly subscription.",
      objectives:"Reach a high-intent audience without the cost of general ecommerce platforms; sync existing storefronts (Shopify, Wix, Square, Etsy) directly into ACRYLICS; grow as a digital storefront at a fraction of general-marketplace fees.",
      pains:"Finding high-intent audiences on general ecommerce platforms is costly and inefficient; general marketplaces charge 15–30% vs. ACRYLICS' 3.5%."},
    {id:'recQW4O9gyZi8H2xd', name:'Creators', price:19, priceLabel:'$19/mo', color:'var(--c3)', hex:'#6A4EB0', seg:'BOS',
      summary:"Novice/intermediate techs focused on professionalization and growth. $19/mo (14-day trial). Includes basic booking and EOS features, and non-monetized community access.",
      objectives:"Professionalize and grow a client base; reduce no-shows and manual booking admin; build a foundation in business operations and community presence.",
      pains:"Manual booking friction and lack of specialized niche booking tools; admin work eating into time behind the chair."},
    {id:'recEIZRe7Xk3pjgq8', name:'Pros', price:26, priceLabel:'$26/mo', color:'var(--c4)', hex:'#3E9A4A', seg:'BOS',
      summary:"Licensed and specialized techs with multiple offerings. $26/mo (14-day trial). Full booking, marketplace selling, and monetized community features, plus ACRYLICS Trends data (limited assortment and pricing) for R&D.",
      objectives:"Monetize community authority via masterclasses, ebooks, and certifications; sell in the ACRYLICS Marketplace; use Trends intent data to stay ahead of demand signals; maintain 5-star reviews via automated re-engagement.",
      pains:"Keeping chairs full and reviews strong without dedicated marketing staff; needing competitive benchmarking data usually reserved for larger businesses."},
    {id:'recqlAhleFJOesdZ9', name:'Moguls', price:55, priceLabel:'$55/mo', color:'var(--c5)', hex:'#C2477A', seg:'BOS',
      summary:"Salon owners with staff. $55/mo (14-day trial). Business development, enterprise reporting, and localized native advertising, plus ACRYLICS Trends data (booking and pricing) for R&D.",
      objectives:"Reduce administrative overhead across a team (payroll, inventory, commissions); benchmark pricing, color, and assortment against aggregated retail data; grow through localized discovery ads.",
      pains:"Admin burden of running a multi-staff business (payroll, inventory, scheduling); owner time spent behind a spreadsheet instead of behind the chair."},
    {id:'rec4WzEZ3qzZ0xG85', name:'Trends B2B', full:'ACRYLICS Trends (B2B Enterprise)', price:0, priceLabel:'Pricing TBD', color:'var(--c6)', hex:'#1E7FA0', seg:'B2B',
      summary:"Mid-size to enterprise beauty corporations. B2B Enterprise tier, pricing TBD. Licenses ACRYLICS' intent, assortment, booking, search, and pricing data for business planning, R&D, content, and reporting.",
      objectives:"Access embedded Metabase BI dashboards with 1/3/5-year historical assortment data; set pricing, color, and assortment benchmarks with confidence; white-label ACRYLICS Trends reporting.",
      pains:"Lacks the competitive benchmarking tools available to larger enterprises; needs aggregated real-time search/booking/retail intent data (Google, Pinterest, internal) not otherwise available."},
    {id:'new_business_basic', name:'Business Basic', price:0, priceLabel:'Free claim', color:'var(--slate)', hex:'#6B6E76', seg:'B2C', missing:true,
      summary:"Businesses that claim their ACRYLICS Business account but do not start platform booking or use BOS features. Not yet a Customer Personas record or a Pricing Tier option — see Omni gap PDF.",
      objectives:"Be findable in ACRYLICS search with accurate profile details without committing to booking or BOS.",
      pains:"Unclear value of upgrading from a claimed listing to Creators/Pros; no booking data to show demand."}
  ];

  const areas=['Booking & Search','Marketplace','BOS Suite','Community','Trends™'];
  const F=(id: string,name: string,area: string,status: string,col: string,q: string,start: string,end: string,personas: string[],r: number,i: number,c: number,e: number,obj: string,votes: number,core: string): Feature=>({id,name,area,status,roadmap:col,quarter:q,start,end,personas,reach:r,impact:i,confidence:c,effort:e,objective:obj,votes,core,portal:status!=='Backlog'});
  const features=[
    F('f1','Vertical nail search','Booking & Search','Live','Now','Q3 26','2026-07-20','2026-09-11',['Angels','Creators','Pros'],9000,3,.9,4,'o2',212,'Search artists by technique, style tag and location'),
    F('f2','Artist & salon profiles','Booking & Search','QA','Now','Q3 26','2026-08-03','2026-10-09',['Creators','Pros','Moguls','Business Basic'],7000,2,.9,3,'o2',164,'Public profile page with portfolio, services, reviews'),
    F('f3','Online booking & deposits','Booking & Search','In Development','Now','Q4 26','2026-09-01','2026-11-13',['Angels','Creators','Pros','Moguls'],8000,3,.8,6,'o1',301,'Book, pay deposit, reschedule'),
    F('f4','Technique & location filters','Booking & Search','In Development','Now','Q4 26','2026-09-14','2026-10-30',['Angels'],8500,2,.8,2,'o2',188,'Filter by gel-x, acrylic, nail art level, borough'),
    F('f5','No-show reminders (SMS/email)','Booking & Search','Backlog','Next','Q1 27','2027-01-05','2027-02-12',['Creators','Pros','Moguls'],3000,2,.7,2,'o3',96,'Automated reminders + re-book prompts'),
    F('f6','Multi-brand cart & checkout','Marketplace','In Development','Now','Q4 26','2026-08-24','2026-11-20',['Angels','Sellers'],6000,3,.7,5,'o1',233,'One cart across indie and enterprise brands'),
    F('f7','Storefront sync (Shopify/Etsy/Square/Wix)','Marketplace','In Discovery','Next','Q1 27','2026-12-07','2027-02-26',['Sellers','Pros'],1500,3,.6,6,'o3',121,'Import catalog and inventory from existing stores'),
    F('f8','Seller payouts & fees','Marketplace','In Development','Now','Q4 26','2026-09-07','2026-11-20',['Sellers'],1200,3,.9,4,'o1',74,'Stripe Connect payouts at 3–5% take rate'),
    F('f9','Client CRM & notes','BOS Suite','In Discovery','Next','Q1 27','2027-01-04','2027-03-12',['Creators','Pros','Moguls'],2500,2,.7,4,'o3',109,'Client history, formulas, preferences'),
    F('f10','Payroll & commissions','BOS Suite','Backlog','Later','Q2 27','2027-04-05','2027-06-25',['Moguls'],400,3,.5,8,'o3',58,'Staff pay, commission splits'),
    F('f11','Inventory management','BOS Suite','Backlog','Later','Q2 27','2027-04-12','2027-06-18',['Moguls','Pros'],700,2,.5,5,'o3',44,'Stock levels, reorder alerts'),
    F('f12','Enterprise reporting','BOS Suite','Backlog','Later','Q2 27','2027-05-03','2027-06-30',['Moguls'],400,2,.4,5,'o4',31,'Multi-location revenue and staff reports'),
    F('f13','Trends feed & public tags','Community','QA','Now','Q4 26','2026-10-05','2026-11-27',['Angels','Creators','Pros'],9000,2,.8,3,'o2',176,'Trend articles, style tags, saves'),
    F('f14','Paid tutorials & masterclasses','Community','In Discovery','Next','Q1 27','2027-01-11','2027-03-19',['Pros','Creators'],2000,3,.6,5,'o4',139,'0–5 min free; paid bands 5–20/20–45/45+ min'),
    F('f15','Reviews & re-engagement','Community','Backlog','Next','Q1 27','2027-02-01','2027-03-26',['Pros','Moguls'],3500,2,.6,3,'o3',82,'Review requests, win-back flows'),
    F('f16','Trend Score dashboard','Trends™','In Discovery','Next','Q1 27','2026-12-14','2027-03-05',['Pros','Moguls','Trends B2B'],1800,3,.5,6,'o4',91,'Batch Trend Score pipeline + creator view'),
    F('f17','B2B Metabase embeds','Trends™','Backlog','Later','Q2 27','2027-04-05','2027-06-30',['Trends B2B'],60,3,.4,7,'o4',19,'White-label BI for enterprise licensees')
  ];

  const themes: Theme[]=[
    {id:'t1', name:'Booking friction',          feature:'f3', w:6},
    {id:'t2', name:'Search by technique',       feature:'f1', w:5},
    {id:'t3', name:'Multi-brand checkout',      feature:'f6', w:4},
    {id:'t4', name:'Onboarding clarity',        feature:'f2', w:4},
    {id:'t5', name:'Trends discovery',          feature:'f13', w:3},
    {id:'t6', name:'Seller fees & payouts',     feature:'f8', w:2},
    {id:'t7', name:'Payroll & inventory',       feature:'f10', w:2},
    {id:'t8', name:'Mobile speed',              feature:null, w:2}
  ];
  const TXT: Record<string,string[]>={
    t1:['Had to message the artist on Instagram to confirm — booking should hold my slot instantly.','Deposit step is unclear, I did not know if it went through.','Rescheduling means cancelling and re-booking. Please add a reschedule button.','I want to see real availability before I pick a service.'],
    t2:['I searched "gel-x" and got every salon in Brooklyn, not the ones that actually do it.','Need to filter by nail art level — simple vs. hand-painted.','Show me artists near the L train who do chrome.','Search should understand style tags from the Trends page.'],
    t3:['I bought from two brands and had to check out twice.','Shipping is calculated per brand, confusing total.','Want one cart for polish from different sellers.'],
    t4:['Setting up my profile took 3 sessions, not sure what is required.','What is the difference between Creators and Pros? Pricing page does not say.','I claimed my salon but it still says unverified.','Tell me what to do first after signup.'],
    t5:['Love the trends feed, but I cannot save looks to a board.','Want to click a trend and see who near me can do it.','Trend tags should show on artist profiles.'],
    t6:['When do payouts land? Need a schedule.','3.5% fee is great — please show it at listing time.','Need payout reports for my accountant.'],
    t7:['I still run payroll in a spreadsheet. Need commissions in BOS.','Inventory alerts when I am low on base coat.'],
    t8:['Profile pages are slow on my phone.','Images load late on 4G.','App freezes when I scroll the trends feed.']
  };
  const sources=['Support Ticket','User Interview','Sales Call','Survey','In-App'];
  const sents=['Critical','High','Medium','Low'];
  const pw: Record<string,number>={Angels:5,Sellers:1.5,Creators:3,Pros:2.5,Moguls:1.2,'Trends B2B':.4,'Business Basic':.8};
  void pw;
  const themePersona: Record<string,string[]>={t1:['Angels','Creators','Pros'],t2:['Angels'],t3:['Angels','Sellers'],t4:['Creators','Business Basic','Pros','Sellers'],t5:['Angels','Pros','Creators'],t6:['Sellers'],t7:['Moguls','Pros'],t8:['Angels','Creators']};
  const feedback: Feedback[]=[]; const start=new Date('2026-07-20');
  for(let wk=0; wk<10; wk++){
    themes.forEach((t,ti)=>{
      const trend = t.id==='t1'? 1+wk*.18 : t.id==='t2'? 1+wk*.12 : t.id==='t8'? (wk>6?2.2:.7) : t.id==='t6'? .8 : 1+Math.sin(wk/1.7+ti)*.35;
      const n=Math.max(0,Math.round(t.w*trend*.55+R()*2-.6));
      for(let k=0;k<n;k++){
        const d=new Date(start.getTime()+(wk*7+rint(0,6))*DAY); if(d>TODAY) continue;
        const persona=pick(themePersona[t.id]);
        const sent=wpick(sents,t.id==='t1'||t.id==='t8'?[3,4,3,1]:[1,3,4,3]);
        feedback.push({id:'fb'+(feedback.length+1), fid:'FB-'+String(feedback.length+1).padStart(4,'0'), summary:pick(TXT[t.id]), source:wpick(sources,[3,2,1,3,4]),
          account:'ACR-'+rint(1000,1420), persona, sentiment:sent, importance: sent==='Critical'?'Critical':sent==='High'?'Important':'Nice to have',
          theme:t.id, feature:R()<.72?t.feature:null, date:iso(d), status: wk>=8&&R()<.6?'Unprocessed':'Processed', notified:false});
      }
    });
  }
  feedback.sort((a,b)=>b.date.localeCompare(a.date));

  /* accounts */
  const tiers=['Angels','Sellers','Creators','Pros','Moguls','Trends B2B','Business Basic'];
  const tierW=[52,8,14,10,4,.6,6];
  const geos=[['Brooklyn, NY',40.678,-73.944],['Manhattan, NY',40.783,-73.971],['Queens, NY',40.728,-73.795],['Bronx, NY',40.845,-73.865],['Newark, NJ',40.735,-74.172],['Atlanta, GA',33.749,-84.388],['Los Angeles, CA',34.052,-118.244],['Houston, TX',29.760,-95.370],['Chicago, IL',41.878,-87.630],['Miami, FL',25.762,-80.192]];
  const geoW=[26,16,12,7,6,8,7,5,6,7];
  const accounts: Account[]=[];
  for(let i=0;i<640;i++){
    const tier=wpick(tiers,tierW); const p=personas.find(x=>x.name===tier)!;
    const signup=new Date(new Date('2026-07-20').getTime()+Math.pow(R(),.7)*(TODAY.getTime()-new Date('2026-07-20').getTime()));
    const paid=p.price>0;
    let status = paid ? wpick(['Trial','Active','Churned','Past Due'],[3,6,1.2,.5]) : wpick(['Active','Churned'],[9,1.3]);
    if(paid && (TODAY.getTime()-signup.getTime())/DAY<14) status='Trial';
    const stage = status==='Churned'?'Churned': wpick(['Onboarding','Active','Power User'],[3,5,1.6]);
    const g=wpick(geos,geoW);
    const mrr = status==='Active'||status==='Past Due' ? (p.price || (tier==='Sellers'? Math.round(rint(80,900)*.035): tier==='Trends B2B'? 0:0)) : 0;
    const nps = R()<.45 ? wpick([10,9,8,7,6,5,3,1],[3,4,3,2,1.2,.8,.5,.3]) - (stage==='Churned'?3:0) : null;
    const used = features.filter(f=>['Live','QA'].includes(f.status) || (f.status==='In Development'&&R()<.3)).filter(f=>f.personas.includes(tier) && R()<(stage==='Power User'?.9:stage==='Active'?.6:.3)).map(f=>f.id);
    accounts.push({id:'acc'+i, ref:'ACR-'+(1000+i), tier, status, stage, signup:iso(signup), churn: status==='Churned'?iso(signup.getTime()+rint(9,40)*DAY):null,
      mrr, ltv: Math.round(mrr*rint(8,20)), nps: nps==null?null:Math.max(0,nps), geo:g[0] as string, lat:g[1] as number, lng:g[2] as number, used, channel:wpick(['Instagram','TikTok','Pinterest','Reddit','YouTube','Email','Community','Site / Product'],[4,3,2,1,1,1,1.5,2])});
  }

  /* weekly adoption per feature (WAU using feature) */
  const weeks: string[]=[]; for(let i=11;i>=0;i--) weeks.push(iso(TODAY.getTime()-i*7*DAY));
  const adoption: Adoption[]=features.filter(f=>['Live','QA','In Development'].includes(f.status)).map(f=>{
    const base = f.status==='Live'? .42 : f.status==='QA'? .18 : .05;
    return {feature:f.id, weekly:weeks.map((w,i)=>+(base*(.5+i/16)+R()*.03).toFixed(3))};
  });
  const wau = weeks.map((w,i)=>Math.round(90+i*38+R()*25));

  /* retention cohorts: 8 weekly cohorts x up to 8 weeks */
  const cohorts: Cohort[]=[]; for(let c=0;c<8;c++){ const size=rint(38,92); const row: number[]=[]; for(let k=0;k<8-c;k++){ row.push(k===0?100:Math.round(100*Math.pow(.84,k)*(.92+R()*.12)- (k>0?rint(6,12):0))); } cohorts.push({week:iso(TODAY.getTime()-(8-c)*7*DAY), size, row}); }

  /* revenue months */
  const months=['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06'];
  const revenue: RevenueRow[]=months.map((m,i)=>{ const proj= i<5? 1800+i*650 : 5200*Math.pow(1.3,i-5); const act = i<=2? Math.round(proj*(.82+R()*.3)) : null; return {month:m, projected:Math.round(proj), actual:act}; });

  const spend: SpendRow[]=[
    {tool:'Claude Pro / API Usage', vendor:'Anthropic, PBC', cost:21.78, category:'AI / LLM', status:'Active', renewal:'2026-10-19', real:true},
    {tool:'Airtable — Success & Operations Workspace', vendor:'Airtable', cost:24, category:'Ops / Backend', status:'Active', renewal:'2026-10-20', real:true},
    {tool:'Loom (Starter)', vendor:'Atlassian', cost:0, category:'Video / Comms', status:'Active', renewal:null, real:true},
    {tool:'Vercel Pro (acrylics.world + ANT Connector)', vendor:'Vercel', cost:20, category:'Hosting', status:'Not in table', renewal:null, real:false},
    {tool:'Supabase (ACRYLICS backend)', vendor:'Supabase', cost:25, category:'Database', status:'Not in table', renewal:null, real:false}
  ];

  const sprintNames=['Auth Module, Role Scaffolding & Design System','Search APIs','Tools ready','Community API','Booking Engine','Marketplace Cart','Payouts & Fees','QA Hardening'];
  const sprints: Sprint[]=sprintNames.map((n,i)=>{ const s=new Date(new Date('2026-07-27').getTime()+i*14*DAY); const done=s.getTime()<TODAY.getTime()-14*DAY; const cur=!done&&s<=TODAY; const com=rint(22,34);
    return {name:n, start:iso(s), end:iso(s.getTime()+13*DAY), committed:com, completed: done? Math.round(com*(.72+R()*.26)) : cur? Math.round(com*.45):null, cycle: done? +(2.2+R()*2.4).toFixed(1):null, state: done?'Closed':cur?'Active':'Planned'}; });

  const backlog: BacklogItem[]=([
    ['ACR-101 Booking slot hold & deposit intent','BOS','f3','Core',8,'In Progress',1],['ACR-102 Reschedule flow','BOS','f3','Feature',5,'To Do',0],
    ['ACR-110 Technique facet index','BOS','f4','Core',5,'Code Review',0],['ACR-111 Borough geo filter','BOS','f4','Enhancement',3,'Testing',0],
    ['ACR-120 Cart across sellers','Marketplace ','f6','Core',8,'In Progress',1],['ACR-121 Per-brand shipping calc','Marketplace ','f6','Feature',5,'To Do',0],
    ['ACR-130 Stripe Connect onboarding','Marketplace ','f8','Core',8,'In Progress',0],['ACR-140 Trend tag pages','Community','f13','Feature',3,'Testing',0],
    ['ACR-141 Save looks to board','Community','f13','Enhancement',3,'To Do',0],['ACR-150 Profile image CDN + lazy load','BOS','f2','Ops/Infra',3,'Code Review',0],
    ['ACR-151 Claim & verify business','BOS','f2','Core',5,'In Progress',1],['ACR-160 Remove legacy Base44 routes','BOS',null,'Cleanup',2,'To Do',0]
  ] as [string,string,string|null,string,number,string,number][]).map((b,i)=>({id:'bl'+i, title:b[0], product:b[1].trim(), feature:b[2], epic:b[3], points:b[4], eng:b[5], blocked:!!b[6]}));

  const deployments: Deployment[]=[]; for(let i=0;i<14;i++){ const d=new Date(TODAY.getTime()-i*rint(10,40)*3600e3*1.6); const st= i===5?'ERROR': i===9?'CANCELED':'READY';
    deployments.push({id:'dpl_'+Math.floor(R()*1e12).toString(36), state:st, target: i%3===0?'production':'preview', branch: i%3===0?'main':pick(['feat/booking-deposits','feat/multi-cart','fix/profile-lcp','feat/trend-tags']),
      commit:Math.floor(R()*1e10).toString(16).slice(0,7), message:pick(['Booking: deposit intent','Cart: seller split','Perf: lazy-load profile images','Trends: tag pages','Auth: role guard','Search: technique facets']),
      createdAt:d.toISOString(), buildSec:rint(38,140), url:'acrylics-'+Math.floor(R()*1e6).toString(36)+'-vcg.vercel.app', current: i===0});
  }
  deployments.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); deployments.forEach(d=>d.current=false); const curDep=deployments.find(d=>d.target==='production'&&d.state==='READY'); if(curDep) curDep.current=true;
  const uptime: UptimeDay[]=[]; for(let i=29;i>=0;i--){ const r=R(); uptime.push({date:iso(TODAY.getTime()-i*DAY), pct: r<.06? 98.1 : r<.12? 99.6 : 100}); }

  const pages=['Home','Services','Artist / Salon Profile','Search (View All)','Category','City','Trends','Topic Tag','Article','Archive (View All)','Log In','Forgot / Reset Password','Marketplace','Cart','Checkout','Pricing','Sign Up','Business Claim'];
  const pagePerf: PagePerf[]=pages.map(p=>({page:p, views:rint(120,4800), conv:+(R()*.09).toFixed(3), bounce:+(.28+R()*.4).toFixed(2), time:rint(18,190), lcp:+(1.4+R()*2.6).toFixed(1), status: wpick(['Live','In Progress','Planned'],[4,3,2])}));

  const health: HealthRow[]=[
    {comp:'acrylics.world web app (Vercel)', owner:'DEVANT', sev:'P3 (Low)', uptime:.9991, sec:'Patched', debt:'Image CDN migration'},
    {comp:'Supabase API & Auth', owner:'Maaz Khurshid', sev:'P2 (Medium)', uptime:.9987, sec:'Monitoring', debt:'RLS policy review for seller tables'},
    {comp:'Payments (Stripe Connect)', owner:'Maaz Khurshid', sev:'P1 (High)', uptime:null, sec:'Open', debt:'Webhook retries not idempotent'},
    {comp:'Search index', owner:'DEVANT', sev:'P3 (Low)', uptime:.9995, sec:'Patched', debt:'Technique facet backfill'},
    {comp:'Airtable ↔ product sync', owner:'OPANT', sev:'P2 (Medium)', uptime:null, sec:'Monitoring', debt:'Endpoints not deployed yet'}
  ];

  const objectives: Objective[]=[
    {id:'o1', name:'Launch the ACRYLICS MVP publicly on Dec 1, 2026', owner:'Isis Darks', krs:[{n:'Launch gates met',c:1,t:4,u:''},{n:'Core booking + checkout features in QA',c:2,t:4,u:''},{n:'Critical open bugs',c:3,t:0,u:'',inv:true}]},
    {id:'o2', name:'Close the discovery gap between trends and artists', owner:'PRANT', krs:[{n:'Search → profile click-through',c:31,t:45,u:'%'},{n:'Profiles with technique tags',c:58,t:90,u:'%'}]},
    {id:'o3', name:'Make BOS worth paying for', owner:'PRANT', krs:[{n:'Trial → paid conversion',c:22,t:35,u:'%'},{n:'Paid BOS accounts',c:84,t:300,u:''}]},
    {id:'o4', name:'Reach 10,000 users in the first 12 months', owner:'Isis Darks', krs:[{n:'Total users',c:640,t:10000,u:''},{n:'Monthly active users',c:412,t:6000,u:''}]}
  ];

  const gates: Gate[]=[
    {pics:'p2', name:'Product QA', owner:'PRANT', status:'In Progress', evidence:'Booking + checkout regression suite at 71%'},
    {pics:'p2', name:'Funnel Instrumentation', owner:'MANT', status:'Not Started', evidence:'Product analytics source not chosen yet'},
    {pics:'p2', name:'Onboarding Path', owner:'SUCANT', status:'In Progress', evidence:'Creator onboarding checklist drafted'},
    {pics:'p2', name:'Financial Reconciliation', owner:'FINANT', status:'Met', evidence:'Stripe → Revenue & Forecasts mapping approved'}
  ];
  const gtm: GtmLaunch[]=[
    {pics:'p2', name:'ACRYLICS MVP Public Launch', date:'2026-12-01', status:'In Progress', personas:['Angels','Creators','Pros','Moguls','Sellers'], assets:['Email Announcement','Product Demo Video','Social Graphics','Press Release'], sample:true},
    {name:'Nail Networks Launch', date:'2026-12-15', status:'Planning', personas:[], assets:[], sample:false},
    {name:'ACRYLICS Trends content drop', date:'2027-01-12', status:'Planning', personas:['Pros','Moguls','Trends B2B'], assets:['Blog Post','Social Graphics'], sample:true}
  ];
  const experiments: Experiment[]=[
    {name:'Booking CTA: "Book now" vs "Check availability"', feature:'f3', status:'Running', metric:'Booking start rate', control:.112, variant:.131, users:1840},
    {name:'Pricing page: annual toggle default', feature:null, status:'Draft', metric:'Trial starts', control:null, variant:null, users:0},
    {name:'Trends feed: save-to-board button', feature:'f13', status:'Concluded', metric:'Saves per session', control:.8, variant:1.3, users:2210}
  ];
  const releases: Release[]=[
    {version:'v0.9.2', date:'2026-09-25', env:'Staging', status:'Scheduled', features:['f2','f13'], notes:'Profiles + trend tags to staging for QA'},
    {version:'v0.9.1', date:'2026-09-11', env:'Live', status:'Rolled Out', features:['f1'], notes:'Vertical search live on preview domain'},
    {version:'v0.9.0', date:'2026-08-28', env:'Development', status:'Rolled Back', features:['f1'], notes:'Search index regression, rolled back'}
  ];

  /* P.I.C.S + P.I.C.S Roadmaps — copied from the P.I.C.S Operations page (rows verified live 2026-09-20) */
  const pics: RawPics[] = [{"id":"p1","type":"Project","name":"VCG Restructure","stage":"Execution","start":"2026-08-03","end":"2026-11-13","parentId":null,"tagged":false,"rows":[],"checklist":[]},{"id":"p_launch","type":"Initiative","name":"ACRYLICS MVP Launch","stage":"Ongoing","start":"2026-07-20","end":"2026-12-01","parentId":null,"tagged":true,"rows":[],"checklist":[]},{"id":"p2","type":"Project","name":"ACRYLICS MVP Build","stage":"Implementation","start":"2026-07-20","end":"2026-12-01","parentId":"p_launch","tagged":true,"rows":[{"label":"Auth Module, Role Scaffolding & Design System","type":"Sprint","date":"2026-08-07","phase":"Phase 1","status":"Completed"},{"label":"ACRYLICS Figma access and homepage design","type":"Task","date":"2026-08-07","phase":"Phase 1","status":"Completed"},{"label":"ACR-001 — Design tokens and theme setup","type":"Task","date":"2026-08-07","phase":"Phase 1","status":"Completed"},{"label":"ACRYLICS MVP Sprint Review","type":"Task","date":"2026-08-07","phase":"Phase 1","status":"Completed"},{"label":"ACRYLICS MVP Build Review","type":"Task","date":"2026-08-14","phase":"Phase 1","status":"In Progress"},{"label":"Search APIs","type":"Sprint","date":"2026-08-14","phase":"Phase 1","status":"Completed"},{"label":"ACRYLICS MVP Build Review","type":"Task","date":"2026-08-14","phase":"Phase 1","status":"In Progress"},{"label":"ACRYLICS MVP Build Initiation","type":"Task","date":"2026-08-21","phase":"Phase 1","status":"At Risk"},{"label":"ACRYLICS MVP Build Initiation","type":"Task","date":"2026-08-21","phase":"Phase 1","status":"Completed"},{"label":"ACRYLICS MVP Build Initiation","type":"Task","date":"2026-08-21","phase":"Phase 1","status":"Not Started"},{"label":"ACRYLICS MVP Build Initiation","type":"Task","date":"2026-08-21","phase":"Phase 1","status":"Not Started"},{"label":"ACRYLICS MVP Build Initiation","type":"Task","date":"2026-08-21","phase":"Phase 1","status":"Not Started"},{"label":"Sprint reviewed, blockers surfaced, next sprint aligned","type":"Meeting","date":"2026-08-21","phase":"Phase 1","status":"Not Started"},{"label":"Milestone 1 deployment reviewed and approved","type":"Meeting","date":"2026-08-28","phase":"Phase 1","status":"In Progress"},{"label":"Phase 1 stable","type":"Task","date":"2026-08-28","phase":"Phase 1","status":"Not Started"},{"label":"Sprint reviewed, blockers surfaced, next sprint aligned","type":"Meeting","date":"2026-08-28","phase":"Phase 1","status":"In Progress"},{"label":"ACRYLICS MVP Build Initiation","type":"Task","date":"2026-08-28","phase":"Phase 1","status":"In Progress"},{"label":"ACRYLICS MVP Build Initiation","type":"Task","date":"2026-08-28","phase":"Phase 1","status":"In Progress"},{"label":"ACRYLICS MVP Build Initiation","type":"Task","date":"2026-08-28","phase":"Phase 1","status":"In Progress"},{"label":"Tools ready","type":"Sprint","date":"2026-08-28","phase":"Phase 1","status":"Not Started"},{"label":"Milestone 1 Preview Build","type":"Milestone","date":"2026-09-25","phase":"Phase 1","status":"Not Started"},{"label":"Community API","type":"Sprint","date":"2026-09-04","phase":"Phase 2","status":"Not Started"},{"label":"ACRYLICS MVP Build Review","type":"Task","date":"2026-09-04","phase":"Phase 2","status":"Not Started"},{"label":"Sprint reviewed, blockers surfaced, next sprint aligned","type":"Meeting","date":"2026-09-04","phase":"Phase 2","status":"Not Started"},{"label":"Monetization & Brevo Logic","type":"Sprint","date":"2026-09-11","phase":"Phase 2","status":"Not Started"},{"label":"Monetization UI","type":"Sprint","date":"2026-09-11","phase":"Phase 2","status":"Not Started"},{"label":"Sprint reviewed, blockers surfaced, next sprint aligned","type":"Meeting","date":"2026-09-11","phase":"Phase 2","status":"Not Started"},{"label":"ACRYLICS MVP Build Review","type":"Task","date":"2026-09-11","phase":"Phase 2","status":"Not Started"},{"label":"Advanced Tools & Final Launch Sprint (Milestone 2) — cross-functional roadmap phase.","type":"Sprint","date":"2026-09-18","phase":"Phase 2","status":"Not Started"},{"label":"ACRYLICS MVP Build Review","type":"Task","date":"2026-09-18","phase":"Phase 2","status":"Not Started"},{"label":"ACRYLICS MVP Build Review","type":"Task","date":"2026-09-18","phase":"Phase 2","status":"Not Started"},{"label":"EOS tools active","type":"Sprint","date":"2026-09-25","phase":"Phase 2","status":"Not Started"},{"label":"Milestone 2 Production Build","type":"Milestone","date":"2026-09-25","phase":"Phase 2","status":"Not Started"},{"label":"Trends & Intelligence Sprint — cross-functional roadmap phase.","type":"Sprint","date":"2026-10-09","phase":"Phase 2","status":"Not Started"},{"label":"Post-Launch Stabilization Sprint — cross-functional roadmap phase.","type":"Sprint","date":"2026-09-25","phase":"Phase 3","status":"Not Started"},{"label":"Feedback & Metrics Sprint — cross-functional roadmap phase.","type":"Sprint","date":"2026-10-02","phase":"Phase 3","status":"Not Started"},{"label":"Post-Deployment Monitoring Report","type":"Sprint","date":"2026-10-02","phase":"Phase 3","status":"Not Started"},{"label":"Product Q&A Log","type":"Sprint","date":"2026-10-02","phase":"Phase 3","status":"Not Started"},{"label":"User Feedback Log","type":"Sprint","date":"2026-10-09","phase":"Phase 3","status":"Not Started"},{"label":"Performance Tuning Patch","type":"Sprint","date":"2026-10-16","phase":"Phase 3","status":"Not Started"},{"label":"Performance & Bug Resolution Sprint — cross-functional roadmap phase.","type":"Sprint","date":"2026-10-16","phase":"Phase 3","status":"Not Started"},{"label":"Project Documentation","type":"Sprint","date":"2026-10-23","phase":"Phase 3","status":"Not Started"},{"label":"Stakeholder Handover Package","type":"Sprint","date":"2026-10-23","phase":"Phase 3","status":"Not Started"},{"label":"Go-to-Market Production Deployment","type":"Milestone","date":"2026-10-30","phase":"Phase 3","status":"Not Started"},{"label":"Market Launch deployment reviewed and executed","type":"Meeting","date":"2026-10-30","phase":"Phase 3","status":"Not Started"},{"label":"Post-Launch KPI Report","type":"Sprint","date":"2026-11-06","phase":"Phase 3","status":"Not Started"}],"checklist":[{"item":"D1 — List a product","due":"2026-09-25","status":"Not Started"},{"item":"C4 — Walk away from the payment [$ payment]","due":"2026-09-25","status":"Not Started"},{"item":"F2 — Check client records","due":"2026-09-25","status":"Not Started"},{"item":"G4 — Check the footer and legal pages","due":"2026-09-25","status":"Not Started"},{"item":"E4 — Manage your subscription [$ payment]","due":"2026-09-25","status":"Not Started"},{"item":"E2 — See what you're owed from a sale [$ payment]","due":"2026-09-25","status":"Not Started"},{"item":"C5 — Accept a booking [$ payment]","due":"2026-09-25","status":"Not Started"},{"item":"D3 — Try a declined card [$ payment]","due":"2026-09-25","status":"Not Started"},{"item":"G2 — Look at the Community page","due":"2026-09-25","status":"Not Started"},{"item":"C3 — Book and pay a deposit [$ payment]","due":"2026-09-25","status":"Not Started"},{"item":"B2 — Add a service with a deposit","due":"2026-09-25","status":"Not Started"},{"item":"C6 — Decline a booking and check the refund [$ payment]","due":"2026-09-25","status":"Not Started"},{"item":"D4 — Track the order both ways","due":"2026-09-25","status":"Not Started"},{"item":"E1 — Connect your payout account [$ payment]","due":"2026-09-25","status":"Not Started"},{"item":"F4 — Invite a team member","due":"2026-09-25","status":"Not Started"},{"item":"G1 — Use the Help Centre","due":"2026-09-25","status":"Not Started"},{"item":"A2 — Log out and back in","due":"2026-09-25","status":"Not Started"},{"item":"D2 — Buy it [$ payment]","due":"2026-09-25","status":"Not Started"},{"item":"A5 — Sign up as a business [$ payment]","due":"2026-09-25","status":"Not Started"},{"item":"A4 — Sign in with Google","due":"2026-09-25","status":"Not Started"},{"item":"F3 — Check the revenue summary","due":"2026-09-25","status":"Not Started"},{"item":"F1 — Use the calendar","due":"2026-09-25","status":"Not Started"},{"item":"C7 — Cancel as the customer","due":"2026-09-25","status":"Not Started"},{"item":"B3 — Set your hours and booking rules","due":"2026-09-25","status":"Not Started"},{"item":"B4 — Appear in search","due":"2026-09-25","status":"Not Started"},{"item":"B1 — Fill in your storefront","due":"2026-09-25","status":"Not Started"},{"item":"A6 — Finish business onboarding","due":"2026-09-25","status":"Not Started"},{"item":"A3 — Reset a forgotten password","due":"2026-09-25","status":"Not Started"},{"item":"G3 — Open the community channels","due":"2026-09-25","status":"Not Started"},{"item":"C2 — Book with no deposit","due":"2026-09-25","status":"Not Started"},{"item":"C1 — Find an artist","due":"2026-09-25","status":"Not Started"},{"item":"A1 — Sign up as a customer","due":"2026-09-25","status":"Not Started"},{"item":"E3 — See the booking deposit arrive [$ payment]","due":"2026-09-25","status":"Not Started"}]},{"id":"p2_spider","type":"Sprint","name":"SPIDER Build | ACRYLICS MVP Build","stage":"Not Started","start":"2026-09-07","end":"2026-10-09","parentId":"p2","tagged":true,"rows":[],"checklist":[{"item":"SPIDER Build — Supabase Schema & Scheduling Config (Phase 1)","due":"2026-09-11","status":"Not Started"},{"item":"SPIDER Build — Live Scraping Deployment (Phase 1)","due":"2026-09-18","status":"Not Started"},{"item":"SPIDER Build — Cleaned, Enriched, Market-Ready Dataset (Phase 2)","due":"2026-10-02","status":"Not Started"},{"item":"SPIDER Build — Trends Search & Discovery Live in Market (Phase 2)","due":"2026-10-09","status":"Not Started"}]},{"id":"p2_disc","type":"Sprint","name":"Discovery & Booking | ACRYLICS MVP Build","stage":"Execution","start":"2026-08-10","end":"2026-08-14","parentId":"p2","tagged":true,"rows":[{"label":"Search functional","type":"Task","date":"2026-08-13","phase":"Phase 1","status":"Completed"},{"label":"Booking UI ready","type":"Task","date":"2026-08-18","phase":"Phase 1","status":"Completed"}],"checklist":[]},{"id":"p2_mkt","type":"Sprint","name":"Marketplace & Payments | ACRYLICS MVP Build","stage":"Execution","start":"2026-08-17","end":"2026-08-21","parentId":"p2","tagged":true,"rows":[{"label":"Payments functional","type":"Task","date":"2026-08-20","phase":"Phase 1","status":"Completed"},{"label":"Marketplace UI ready","type":"Task","date":"2026-08-25","phase":"Phase 1","status":"Completed"}],"checklist":[]},{"id":"p2_comm","type":"Sprint","name":"Community Foundation | ACRYLICS MVP Build","stage":"Execution","start":"2026-08-31","end":"2026-09-04","parentId":"p2","tagged":true,"rows":[{"label":"Community API ready","type":"Task","date":"2026-09-08","phase":"Phase 2","status":"In Review"},{"label":"Community UI ready","type":"Task","date":"2026-09-10","phase":"Phase 2","status":"In Review"}],"checklist":[]},{"id":"p2_post","type":"Sprint","name":"Post-Launch Stabilization | ACRYLICS MVP Build","stage":"Not Started","start":"2026-09-21","end":"2026-09-25","parentId":"p2","tagged":true,"rows":[],"checklist":[{"item":"Post-Launch Stabilization — Cross-Functional Ops Summary (Phase 3)","due":null,"status":"Not Started"}]},{"id":"p2_doc","type":"Sprint","name":"Documentation & Handover | ACRYLICS MVP Build","stage":"Not Started","start":"2026-10-19","end":"2026-10-23","parentId":"p2","tagged":true,"rows":[],"checklist":[{"item":"Documentation & Handover — Cross-Functional Ops Summary (Phase 3)","due":null,"status":"Not Started"}]},{"id":"p3","type":"Initiative","name":"Grant ANT Rollout","stage":"Discovery","start":"2026-09-14","end":"2026-12-19","parentId":null,"tagged":false,"rows":[],"checklist":[]},{"id":"p3b","type":"Initiative","name":"ANT Connector Build","stage":"Facilitation & Negotiation","start":"2026-08-17","end":"2026-08-28","parentId":"p1","tagged":true,"rows":[],"checklist":[]},{"id":"p4","type":"Campaign","name":"Fall Fundraising Campaign","stage":"Assessment","start":"2026-07-06","end":"2026-09-28","parentId":null,"tagged":false,"rows":[{"label":"Donor segment list","type":"Task","date":"2026-07-10","phase":"Phase 1","status":"Completed"},{"label":"Campaign brief","type":"Milestone","date":"2026-07-13","phase":"Phase 1","status":"Completed"},{"label":"Sprint — creative","type":"Sprint","date":"2026-07-20","phase":"Phase 2","status":"Completed"},{"label":"Email sequence build","type":"Task","date":"2026-07-27","phase":"Phase 2","status":"Completed"},{"label":"Mid-campaign check-in","type":"Milestone","date":"2026-08-17","phase":"Phase 3","status":"Completed"},{"label":"Results analysis","type":"Task","date":"2026-09-14","phase":"Phase 4","status":"Completed"}],"checklist":[{"item":"Donor thank-you letters","due":"2026-08-01","status":"Completed"},{"item":"Mid-campaign report","due":"2026-08-18","status":"Completed"},{"item":"Final results deck","due":"2026-09-22","status":"Not Started"}]},{"id":"p5","type":"Initiative","name":"Nail Networks Expansion","stage":"Closed","start":"2026-04-06","end":"2026-08-28","parentId":null,"tagged":false,"rows":[{"label":"Partner outreach","type":"Task","date":"2026-04-10","phase":"Phase 1","status":"Completed"},{"label":"MOU signed","type":"Milestone","date":"2026-05-04","phase":"Phase 1","status":"Completed"},{"label":"Sprint — onboarding","type":"Sprint","date":"2026-06-01","phase":"Phase 2","status":"Completed"},{"label":"Network live","type":"Milestone","date":"2026-08-24","phase":"Phase 3","status":"Completed"}],"checklist":[{"item":"Final compliance sign-off","due":"2026-08-20","status":"Completed"},{"item":"Handoff documentation","due":"2026-08-27","status":"Completed"}]},{"id":"p6","type":"Sprint","name":"Q4 Ops Sprint","stage":"Implementation","start":"2026-09-07","end":"2026-10-19","parentId":null,"tagged":false,"rows":[{"label":"Backlog grooming","type":"Task","date":"2026-09-08","phase":"Phase 1","status":"Completed"},{"label":"Sprint kickoff","type":"Sprint","date":"2026-09-08","phase":"Phase 1","status":"Completed"},{"label":"Vendor review","type":"Task","date":"2026-09-15","phase":"Phase 1","status":"Completed"},{"label":"Mid-sprint checkpoint","type":"Milestone","date":"2026-09-22","phase":"Phase 2","status":"Not Started"},{"label":"Ops runbook update","type":"Task","date":"2026-09-29","phase":"Phase 2","status":"Not Started"}],"checklist":[{"item":"Update on-call rotation","due":"2026-09-19","status":"Completed"},{"item":"Vendor contract renewal","due":"2026-09-26","status":"Not Started"},{"item":"Runbook publish","due":"2026-10-03","status":"Not Started"}]},{"id":"p7","type":"Campaign","name":"Holiday Mixer Planning","stage":"Strategy & Negotiation","start":"2026-09-21","end":"2026-11-30","parentId":null,"tagged":false,"rows":[],"checklist":[]},{"id":"p8","type":"Initiative","name":"Nail Networks Partner Outreach","stage":"Engagement & Measurement","start":"2026-07-01","end":"2026-10-30","parentId":null,"tagged":false,"rows":[],"checklist":[]},{"id":"p9","type":"Sprint","name":"Ops Systems Audit","stage":"Paused","start":"2026-08-01","end":"2026-09-30","parentId":null,"tagged":false,"rows":[],"checklist":[]},{"id":"p10","type":"Project","name":"Fashion & Art Inspiration Dashboard","stage":"Ongoing","start":"2026-06-15","end":"2026-12-31","parentId":null,"tagged":true,"rows":[],"checklist":[]},{"id":"p_gtm","type":"Campaign","name":"ACRYLICS GTM Campaign","stage":"Not Started","start":"2026-10-01","end":"2027-06-30","parentId":null,"tagged":false,"rows":[],"checklist":[]}];
  /* CAC (Blended) values copied from the Channels table */
  const channels=[{name:'Instagram',cac:58},{name:'TikTok',cac:39},{name:'Pinterest',cac:44},{name:'Reddit',cac:31},{name:'YouTube',cac:67},{name:'Email',cac:21},{name:'Community',cac:18},{name:'Site / Product',cac:12}];
  const featRoad: Record<string,string>={f1:'p2_disc',f2:'p2_disc',f3:'p2_disc',f4:'p2_disc',f6:'p2_mkt',f8:'p2_mkt',f13:'p2_comm',f14:'p2_comm',f16:'p2_spider',f15:'p2_post'};
  features.forEach(f=>f.pics=featRoad[f.id]||null);

  /* PRANT sweep findings = IT & Systems Registry rows (existing fields only: Asset Name, System Type, Health/Build Status,
     Fix Needed, Related Page, Environment, Last Swept, Sync Status, Tags, Notes, Related ANT Request(s)).
     sw1–sw3 are the open review actions from the "ACRYLICS Phase 1 Review" round in Airtable; the rest are examples. */
  const ants=['PRANT','DEVANT','OPANT','QAANT','WRANT','CRANT','LANT','FINANT','MANT','SUCANT'].map((n,i)=>({id:'ant'+i,name:n}));
  const team=['Isis Darks','Zaid Habib Qureshi','Maaz Khurshid','Bamidele Eribo','Eloisa Melchor'].map((n,i)=>({id:'tm'+i,name:n}));
  const H=(h: string)=>h==='Broken'?'High':['Small Kinks','Incomplete'].includes(h)?'Medium':'Low';
  const sweep: Sweep={ lastRun:new Date(TODAY.getTime()-5*3600e3).toISOString(), findings:([
    {id:'sw1', asset:'Footer & legal pages', type:'ACRYLICS Feature', health:'Broken', page:'Home', env:'Production', sync:'Synced', swept:'2026-09-28', tags:['Mission Critical'],
      fix:'Footer links to Terms of Service and Privacy Policy return a 404. Launch test G4 cannot pass until both pages are published and linked.', notes:'', antReqs:[], task:null},
    {id:'sw2', asset:'Checkout — declined card (D3)', type:'ACRYLICS Feature', health:'Broken', page:'Checkout', env:'Staging', sync:'Synced', swept:'2026-09-28', tags:['Mission Critical'],
      fix:'Declined-card flow needs a re-test. The payment error screen shows no message, so a customer does not know the card failed.', notes:'', antReqs:[], task:null},
    {id:'sw3', asset:'Payout account connection (E1)', type:'ACRYLICS Feature', health:'Small Kinks', page:'Seller payouts', env:'Staging', sync:'Synced', swept:'2026-09-28', tags:[],
      fix:'Confirm the "Connect your payout account" copy before sellers see it.', notes:'', antReqs:[], task:null},
    {id:'sw4', asset:'Artist / Salon Profile', type:'Intranet Page/Route', health:'Small Kinks', page:'Artist / Salon Profile', env:'Production', sync:'Synced', swept:'2026-09-27', tags:['Scheduled for Update'],
      fix:'Loads in 3.7s on phones (goal under 2.5s). Portfolio images load all at once.', notes:'Lazy-load portfolio images; keep the first 6 eager.', antReqs:[{id:'recANT1',title:'Fix: Artist / Salon Profile',ant:'DEVANT'}], task:null},
    {id:'sw5', asset:'Stripe webhooks', type:'Tool/Integration', health:'Small Kinks', page:'', env:'Production', sync:'Partial Sync', swept:'2026-09-27', tags:['Third-Party'],
      fix:'Webhook retries can record the same deposit twice.', notes:'', antReqs:[{id:'recANT2',title:'Fix: Stripe webhooks',ant:'DEVANT'}], task:null},
    {id:'sw6', asset:'Search index', type:'Database/Table', health:'Incomplete', page:'Search (View All)', env:'Production', sync:'Synced', swept:'2026-09-26', tags:['Out of Scope'],
      fix:'Technique facets missing for 12% of profiles.', notes:'', antReqs:[], task:null}
  ] as Omit<Finding,'sev'|'status'|'assignee'>[]).map(f=>({...f, sev:H(f.health), status:(f.tags||[]).includes('Out of Scope')?'Dismissed':(f.antReqs.length||f.task)?'Assigned':'To do', assignee:f.antReqs.length?f.antReqs[0].ant:f.task?f.task.assignee:''})) };

  /* extra product launches running alongside the MVP (sample) */
  pics.push(
    {id:'s_trends_beta', type:'Sprint', name:'Trends Feed Beta Test', stage:'Execution & Implementation', start:'2026-09-21', end:'2026-10-16', parentId:null, sample:true,
      rows:[{label:'Recruit 40 beta testers (Pros + Creators)',type:'Task',date:'2026-09-25',phase:'Phase 1',status:'Completed'},{label:'Beta opens to testers',type:'Milestone',date:'2026-10-01',phase:'Phase 1',status:'Not Started'},{label:'Mid-beta feedback review',type:'Meeting',date:'2026-10-08',phase:'Phase 2',status:'Not Started'},{label:'Go / no-go for public release',type:'Milestone',date:'2026-10-16',phase:'Phase 2',status:'Not Started'}],
      checklist:[{item:'Save looks to a board',due:'2026-10-09',status:'In Progress'},{item:'Trend tags show on artist profiles',due:'2026-10-09',status:'Not Started'},{item:'Feed loads in under 2.5s on mobile',due:'2026-10-09',status:'Blocked'},{item:'Beta survey sent',due:'2026-10-12',status:'Not Started'}]},
    {id:'s_feedback_circle', type:'Initiative', name:'ACRYLICS Community Feedback Circle', stage:'Strategy & Negotiation', start:'2026-10-05', end:'2026-12-18', parentId:null, sample:true,
      rows:[{label:'Invite founding artists',type:'Task',date:'2026-10-09',phase:'Phase 1',status:'Not Started'},{label:'First monthly feedback session',type:'Milestone',date:'2026-10-22',phase:'Phase 1',status:'Not Started'},{label:'Holiday live demo event',type:'Milestone',date:'2026-12-10',phase:'Phase 2',status:'Not Started'}],
      checklist:[{item:'Session format agreed',due:'2026-10-07',status:'Not Started'},{item:'Feedback form wired to User Feedback & Insights',due:'2026-10-14',status:'Not Started'},{item:'Event landing page live on acrylics.world',due:'2026-11-20',status:'Not Started'}]}
  );
  /* checklist items: ids + the P.I.C.S Checklist fields the drawer edits (Related Roadmap, owners, General Notes) */
  const picsOut: Pics[]=pics.map(p=>({...p, checklist:(p.checklist||[]).map((c,i)=>{ const o: ChecklistItem={...c, id:c.id||('cl_'+p.id+'_'+i), type:c.type||'Deliverable', notes:c.notes||'', owners:c.owners||[]};
    if(p.id==='p2'){ o.roadmap='ACRYLICS MVP Build | Phase 1'; o.owners=['Maaz Khurshid','Zaid Habib Qureshi']; o.num=i+1; } return o; })}));
  return {mode:'sample', pics:picsOut, channels, sweep, ants, team, syncedAt:null, personas, areas, features, themes, feedback, accounts, weeks, adoption, wau, cohorts, revenue, spend, sprints, backlog,
    site:{url:CFG.siteUrl, status:'unknown', http:null, ms:null, checkedAt:null, ssl:null, deployments, uptime, vitals:{lcp:2.3,inp:180,cls:.06}, errorRate:.004},
    pagePerf, sitemapTotal:52, health, objectives, gates, gtm, experiments, releases};
}
