"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { PageFooter, TopBar } from "@/components/AppShell";
import { DataSourceBadge, type Source } from "@/components/DataSource";
import { CardHead, Modal, StatusPill, useToast } from "@/components/ui";
import { IconArrowRight, IconChevron, IconChevronLeft, IconPlus, IconSearch } from "@/components/icons";
import { cx, fmt } from "@/lib/utils";
import {
  HIERARCHY,
  openAntChat,
  placeholders,
  PRIORITIES,
  QUEUE_TYPES,
  REQUEST_STATUSES,
  type Ant,
  type AntData,
  type AntRequest,
  type AntRequestDetail,
  type Prompt,
  type QuickAssist,
} from "@/lib/ant-types";
import { ChatPanel } from "./ChatPanel";

/* ANT Connector home — sections in the order of the client's master design (VCG_ANT_Connector_Master):
   hero search → Prompt Library carousel → ANT Request queue → department quick-access → Ask-an-ANT chat,
   followed by the ANT directory (Orchestrator → Master → Command) and Quick Assists. Live Airtable data only. */

const RUNNABLE = ["Not Started", "Pending", "In the Qeue"];
const lower = (s: string) => s.toLowerCase();

const TABS = [
  ["overview", "Overview"],
  ["requests", "Requests"],
  ["ants", "ANTs"],
  ["quick-assists", "Quick Assists"],
  ["chat", "Chat"],
] as const;
type Tab = (typeof TABS)[number][0];
const HASH_ALIAS: Record<string, Tab> = { directory: "ants", prompts: "overview" };
const BTN = "btn whitespace-nowrap";
const BTN_SM = "btn btn-sm min-h-8 whitespace-nowrap";

/* Tab state lives in the URL hash (#requests, #ants, #quick-assists, #chat; #prompts → Overview scrolled to prompts). */
const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const readHash = () => window.location.hash.replace(/^#/, "");
function hashToTab(h: string): Tab {
  if (HASH_ALIAS[h]) return HASH_ALIAS[h];
  return TABS.find(([k]) => k === h)?.[0] ?? "overview";
}
function goTab(t: Tab) {
  const url = t === "overview" ? window.location.pathname + window.location.search : `#${t}`;
  history.pushState(null, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function AntConnector({ data, source }: { data: AntData; source: Source }) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [antOpen, setAntOpen] = useState<Ant | null>(null);
  const [promptOpen, setPromptOpen] = useState<Prompt | null>(null);
  const [reqOpen, setReqOpen] = useState<string | null>(null);
  const [newReq, setNewReq] = useState(false);
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const tab = hashToTab(hash);

  useEffect(() => {
    if (hash === "prompts") document.getElementById("prompts")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  const antById = useMemo(() => new Map(data.ants.map((a) => [a.id, a])), [data.ants]);
  const qaById = useMemo(() => new Map(data.quickAssists.map((x) => [x.id, x])), [data.quickAssists]);
  const antNames = (ids: string[]) => ids.map((id) => antById.get(id)?.name).filter(Boolean).join(", ");

  /* Send something to the Chat tab (its panel is always mounted, so it receives the open-chat event). */
  const toChat = (text: string, antId?: string, quickAssistId?: string) => {
    openAntChat({ text, antId, quickAssistId });
    goTab("chat");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const launchQa = (x: QuickAssist) => toChat(x.preset || x.title, x.antIds[0], x.id);

  const needle = lower(q.trim());
  const hits = useMemo(() => {
    if (!needle) return null;
    const m = (...v: string[]) => v.some((s) => lower(s).includes(needle));
    return {
      ants: data.ants.filter((a) => m(a.name, a.overview, a.functions, a.departments.join(" "))).slice(0, 6),
      qas: data.quickAssists.filter((x) => x.active && m(x.title, x.preset)).slice(0, 6),
      prompts: data.prompts.filter((p) => p.status !== "Archived" && m(p.name, p.template, p.description)).slice(0, 6),
    };
  }, [needle, data]);

  const openCount = data.requests.filter((r) => !["Completed", "Cancelled"].includes(r.status)).length;
  const counts: Partial<Record<Tab, number>> = {
    requests: openCount,
    ants: data.ants.filter((a) => a.active).length,
    "quick-assists": data.quickAssists.filter((x) => x.active).length,
  };
  const recent = useMemo(
    () => [...data.requests].sort((a, b) => String(b.submitted || "").localeCompare(String(a.submitted || ""))).slice(0, 5),
    [data.requests],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <TopBar title="ANT Connector" />
      <main className="flex flex-col gap-5 px-5 pb-10 pt-2 sm:px-8">
        <nav aria-label="ANT site" className="seg self-start">
          <Link href="/ant" aria-current="page" className="flex h-[30px] items-center whitespace-nowrap rounded-full bg-white px-3.5 text-[12px] font-bold shadow-card">
            ANT Connector
          </Link>
          <Link href="/social-impact" className="flex h-[30px] items-center whitespace-nowrap rounded-full px-3.5 text-[12px] font-bold text-ink-2 hover:text-ink">
            Social Impact
          </Link>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink-2">VCG’s AI agents (ANTs), their quick assists and prompts, and the ANT Request queue — team only.</p>
          <DataSourceBadge source={source} />
        </div>

        <div role="tablist" aria-label="ANT Connector sections" className="scroll-thin -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              aria-controls={`ant-tab-${k}`}
              onClick={() => goTab(k)}
              className={cx(
                "-mb-px flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 text-[13px] font-bold transition",
                tab === k ? "border-brand text-ink" : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              {l}
              {counts[k] != null && <span className="rounded-full bg-plane px-1.5 text-[10.5px] font-extrabold text-muted">{counts[k]}</span>}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div id="ant-tab-overview" role="tabpanel" className="flex flex-col gap-5">
            {/* Hero search */}
            <section className="card bg-gradient-to-br from-brand-soft to-white p-5 sm:p-6" aria-label="Search">
              <div className="eyebrow mb-1.5">Ask the ANTs</div>
              <h2 className="max-w-2xl text-[20px] font-extrabold leading-tight tracking-tight sm:text-[24px]">What do you need done?</h2>
              <form
                className="mt-3 flex max-w-2xl items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-card focus-within:ring-2 focus-within:ring-brand"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (q.trim()) toChat(q.trim());
                }}
              >
                <IconSearch width={17} height={17} className="shrink-0 text-muted" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search ANTs, quick assists and prompts — or press Enter to ask"
                  aria-label="Search ANTs, quick assists and prompts"
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted"
                />
                <button type="submit" className={cx(BTN, "btn-brand shrink-0")} disabled={!q.trim()}>
                  Ask <IconArrowRight width={15} height={15} />
                </button>
              </form>
              {hits && (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <HitList title="ANTs" empty={!hits.ants.length}>
                    {hits.ants.map((a) => (
                      <HitRow key={a.id} onClick={() => setAntOpen(a)} title={a.name} sub={a.hierarchy || "ANT"} />
                    ))}
                  </HitList>
                  <HitList title="Quick Assists" empty={!hits.qas.length}>
                    {hits.qas.map((x) => (
                      <HitRow key={x.id} onClick={() => launchQa(x)} title={x.title} sub={antNames(x.antIds) || "Launch in chat"} />
                    ))}
                  </HitList>
                  <HitList title="Prompts" empty={!hits.prompts.length}>
                    {hits.prompts.map((p) => (
                      <HitRow key={p.id} onClick={() => setPromptOpen(p)} title={p.name || "Untitled prompt"} sub={p.type} />
                    ))}
                  </HitList>
                </div>
              )}
            </section>

            <PromptCarousel prompts={data.prompts} antNames={antNames} onOpen={setPromptOpen} />

            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              {/* Recent requests */}
              <section className="card min-w-0 p-5" aria-label="Recent requests">
                <CardHead
                  eyebrow="ANT Request queue"
                  title="Recent requests"
                  right={
                    <>
                      <button type="button" className={BTN_SM} onClick={() => setNewReq(true)}>
                        <IconPlus width={14} height={14} /> New
                      </button>
                      <button type="button" className={cx(BTN_SM, "btn-dark")} onClick={() => goTab("requests")}>
                        All {openCount} open <IconArrowRight width={13} height={13} />
                      </button>
                    </>
                  }
                />
                <ul className="mt-3 divide-y divide-line">
                  {recent.length === 0 && <li className="rounded-2xl bg-plane p-5 text-center text-[12.5px] text-muted">No requests yet.</li>}
                  {recent.map((r) => (
                    <RequestRow key={r.id} r={r} antNames={antNames} onOpen={setReqOpen} />
                  ))}
                </ul>
              </section>

              {/* Compact Ask-an-ANT entry */}
              <section className="card flex min-w-0 flex-col p-5" aria-label="Ask an ANT">
                <CardHead eyebrow="Ask an ANT" title="Chat with Claude" sub="Pick an ANT in the chat — its brain shapes the answer." />
                <QuickChat onSend={(t) => toChat(t)} />
                <button type="button" className={cx(BTN_SM, "mt-3 self-start")} onClick={() => goTab("chat")}>
                  Open chat <IconArrowRight width={13} height={13} />
                </button>
              </section>
            </div>

            {/* Department quick access */}
            <section className="card p-5" aria-label="Departments">
              <CardHead
                eyebrow="Department quick access"
                title="Departments"
                sub="Opens the ANT directory filtered by department."
                right={
                  <Link href="/departments" className={BTN_SM}>
                    Department wiki
                  </Link>
                }
              />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {data.departments.map((d) => {
                  const n = data.ants.filter((a) => a.departments.includes(d.name)).length;
                  const open = data.requests.filter((r) => r.departments.includes(d.name) && r.status !== "Completed" && r.status !== "Cancelled").length;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      title={d.name}
                      onClick={() => {
                        setDept(d.name);
                        goTab("ants");
                      }}
                      className={cx("min-h-8 rounded-2xl px-3 py-2.5 text-left transition hover:bg-lav", dept === d.name ? "bg-brand-soft ring-2 ring-brand" : "bg-plane")}
                    >
                      <div className="truncate text-[12.5px] font-bold">{d.name}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted">
                        {n} ANT{n === 1 ? "" : "s"} · {open} open
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {tab === "requests" && (
          <div id="ant-tab-requests" role="tabpanel">
            <RequestQueue requests={data.requests} antNames={antNames} onOpen={setReqOpen} onNew={() => setNewReq(true)} />
          </div>
        )}
        {tab === "ants" && (
          <div id="ant-tab-ants" role="tabpanel">
            <Directory ants={data.ants} q={needle} dept={dept} setDept={setDept} departments={data.departments.map((d) => d.name)} onOpen={setAntOpen} />
          </div>
        )}
        {tab === "quick-assists" && (
          <div id="ant-tab-quick-assists" role="tabpanel">
            <QuickAssists list={data.quickAssists} antNames={antNames} departments={data.departments.map((d) => d.name)} onLaunch={launchQa} />
          </div>
        )}
        {/* Chat stays mounted (hidden) so launches from other tabs reach it and conversations survive tab switches. */}
        <div id="ant-tab-chat" role="tabpanel" hidden={tab !== "chat"}>
          <section id="chat" className="card overflow-hidden" aria-label="Ask an ANT">
            <div className="px-5 pt-5 sm:px-6">
              <CardHead eyebrow="Ask an ANT" title="Chat with Claude" sub="Pick an ANT — its brain, functions and expected outputs shape the answer. Save a useful chat to ANT Requests." />
            </div>
            <div className="mt-3 h-[min(600px,calc(100vh-260px))] min-h-[380px]">
              <ChatPanel listen />
            </div>
          </section>
        </div>

        <PageFooter meta={`${data.ants.length} ANTs · ${data.quickAssists.length} quick assists · ${data.prompts.length} prompts · ${data.requests.length} requests`} />
      </main>

      <AntDrawer
        ant={antOpen}
        onClose={() => setAntOpen(null)}
        qas={(antOpen?.quickAssistIds || []).map((id) => qaById.get(id)).filter((x): x is QuickAssist => !!x)}
        prompts={data.prompts.filter((p) => antOpen && (p.antIds.includes(antOpen.id) || antOpen.promptIds.includes(p.id)))}
        requests={data.requests.filter((r) => antOpen && r.antIds.includes(antOpen.id)).slice(0, 8)}
        onChat={(a) => (setAntOpen(null), toChat("", a.id))}
        onLaunch={(x) => (setAntOpen(null), launchQa(x))}
        onPrompt={(p) => (setAntOpen(null), setPromptOpen(p))}
        onRequest={(id) => (setAntOpen(null), setReqOpen(id))}
      />
      <PromptModal prompt={promptOpen} antNames={antNames} onClose={() => setPromptOpen(null)} onSend={(text, antId) => (setPromptOpen(null), toChat(text, antId))} />
      <RequestModal id={reqOpen} antNames={antNames} qaName={(id) => qaById.get(id)?.title || ""} onClose={() => setReqOpen(null)} />
      <NewRequestModal open={newReq} onClose={() => setNewReq(false)} data={data} />
    </div>
  );
}

function QuickChat({ onSend }: { onSend: (text: string) => void }) {
  const [t, setT] = useState("");
  return (
    <form
      className="mt-3 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (t.trim()) onSend(t.trim());
      }}
    >
      <input className="field min-w-0 flex-1" value={t} onChange={(e) => setT(e.target.value)} placeholder="Ask anything…" aria-label="Ask an ANT" />
      <button type="submit" className={cx(BTN, "btn-brand shrink-0")} disabled={!t.trim()}>
        Send
      </button>
    </form>
  );
}

function RequestRow({ r, antNames, onOpen }: { r: AntRequest; antNames: (ids: string[]) => string; onOpen: (id: string) => void }) {
  const meta = [r.num != null && `#${r.num}`, antNames(r.antIds), r.location, r.departments.join(", "), fmt(r.submitted)].filter(Boolean).join(" · ");
  return (
    <li>
      <button type="button" onClick={() => onOpen(r.id)} className="flex min-h-8 w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-plane">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold" title={r.title}>
            {r.title || "(untitled request)"}
          </div>
          <div className="truncate text-[11.5px] text-muted" title={meta}>
            {meta}
          </div>
        </div>
        {r.priority && <span className="chip hidden shrink-0 whitespace-nowrap sm:inline-flex">{r.priority}</span>}
        <StatusPill status={r.status || "—"} className="shrink-0 whitespace-nowrap" />
      </button>
    </li>
  );
}

/* ---------------------------------------------------------------- search hits */
function HitList({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-card">
      <div className="eyebrow mb-1.5 px-1">{title}</div>
      {empty ? <div className="px-1 py-2 text-[12px] text-muted">No matches</div> : <ul>{children}</ul>}
    </div>
  );
}
function HitRow({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full rounded-xl px-2 py-1.5 text-left hover:bg-plane">
        <div className="truncate text-[12.5px] font-bold">{title}</div>
        <div className="truncate text-[11px] text-muted">{sub}</div>
      </button>
    </li>
  );
}

/* ---------------------------------------------------------------- prompt carousel */
function PromptCarousel({ prompts, antNames, onOpen }: { prompts: Prompt[]; antNames: (ids: string[]) => string; onOpen: (p: Prompt) => void }) {
  const [filter, setFilter] = useState<"active" | "omni" | "all">("active");
  const track = useRef<HTMLDivElement>(null);
  const list = prompts.filter((p) => (filter === "all" ? p.status !== "Archived" : filter === "omni" ? p.omniReady : p.status === "Active"));
  const scroll = (d: number) => track.current?.scrollBy({ left: d * 320, behavior: "smooth" });
  return (
    <section id="prompts" className="card scroll-mt-6 p-5 sm:p-6" aria-label="Prompt Library">
      <CardHead
        eyebrow="Prompt Library"
        title="Prompts"
        sub="Fill in the blanks and send to the chat."
        right={
          <>
            <div className="seg">
              {(
                [
                  ["active", "Active"],
                  ["omni", "Omni-Ready"],
                  ["all", "All"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                  {l}
                </button>
              ))}
            </div>
            <button type="button" className="btn size-9 !px-0" aria-label="Previous prompts" onClick={() => scroll(-1)}>
              <IconChevronLeft width={16} height={16} />
            </button>
            <button type="button" className="btn size-9 !px-0" aria-label="Next prompts" onClick={() => scroll(1)}>
              <IconChevronLeft width={16} height={16} className="rotate-180" />
            </button>
          </>
        }
      />
      <div ref={track} className="scroll-thin mt-4 flex snap-x gap-3 overflow-x-auto pb-2">
        {list.length === 0 && <div className="w-full rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">No prompts in this view.</div>}
        {list.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(p)}
            className="flex w-[290px] shrink-0 snap-start flex-col rounded-2xl bg-plane p-4 text-left transition hover:bg-lav"
          >
            <div className="flex flex-wrap gap-1.5">
              {p.type && <span className="chip !bg-white">{p.type}</span>}
              {p.omniReady && <span className="chip !bg-teal-soft !text-teal">Omni-Ready</span>}
            </div>
            <div className="mt-2 line-clamp-2 text-[13.5px] font-bold">{p.name || "Untitled prompt"}</div>
            <div className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-ink-2">{p.description || p.template}</div>
            <div className="mt-auto truncate pt-3 text-[11px] font-semibold text-muted">{antNames(p.antIds) || "Any ANT"}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function PromptModal({ prompt, antNames, onClose, onSend }: { prompt: Prompt | null; antNames: (ids: string[]) => string; onClose: () => void; onSend: (text: string, antId?: string) => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [lastId, setLastId] = useState<string | null>(null);
  if ((prompt?.id ?? null) !== lastId) {
    setLastId(prompt?.id ?? null);
    setVals({});
  }
  if (!prompt) return null;
  const blanks = placeholders(prompt.template);
  const filled = prompt.template.replace(/\[([^\]\n]{1,80})\]/g, (all, k: string) => vals[k]?.trim() || all);
  return (
    <Modal
      open
      onClose={onClose}
      title={prompt.name || "Prompt"}
      subtitle={[prompt.type, prompt.status, antNames(prompt.antIds)].filter(Boolean).join(" · ")}
      footer={
        <>
          <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(filled)}>
            Copy
          </button>
          <button type="button" className="btn btn-brand" onClick={() => onSend(filled, prompt.antIds[0])}>
            Send to chat
          </button>
        </>
      }
    >
      {prompt.description && <p className="mb-4 text-[12.5px] leading-relaxed text-ink-2">{prompt.description}</p>}
      {blanks.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {blanks.map((b) => (
            <label key={b} className="block">
              <span className="field-label">{b}</span>
              <input className="field" value={vals[b] || ""} onChange={(e) => setVals({ ...vals, [b]: e.target.value })} />
            </label>
          ))}
        </div>
      )}
      <div className="field-label">Prompt</div>
      <div className="whitespace-pre-wrap rounded-2xl bg-plane p-4 text-[12.5px] leading-relaxed">{filled}</div>
      {prompt.outputFormat && (
        <>
          <div className="field-label mt-4">Output format</div>
          <div className="whitespace-pre-wrap text-[12.5px] text-ink-2">{prompt.outputFormat}</div>
        </>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------- request queue */
function RequestQueue({ requests, antNames, onOpen, onNew }: { requests: AntRequest[]; antNames: (ids: string[]) => string; onOpen: (id: string) => void; onNew: () => void }) {
  const [status, setStatus] = useState("open");
  const [loc, setLoc] = useState("");
  const PAGE = 10;
  const [limit, setLimit] = useState(PAGE);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    requests.forEach((r) => (c[r.status || "—"] = (c[r.status || "—"] || 0) + 1));
    return c;
  }, [requests]);
  const locations = [...new Set(requests.map((r) => r.location).filter(Boolean))].sort();
  const list = requests.filter(
    (r) => (status === "all" ? true : status === "open" ? !["Completed", "Cancelled"].includes(r.status) : r.status === status) && (!loc || r.location === loc),
  );
  return (
    <section id="requests" className="card scroll-mt-6 p-5 sm:p-6" aria-label="ANT Request queue">
      <CardHead
        eyebrow="ANT Request queue"
        title="Requests"
        right={
          <button type="button" className={cx(BTN, "btn-dark")} onClick={onNew}>
            <IconPlus width={15} height={15} /> New ANT request
          </button>
        }
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {[["open", "Open", requests.filter((r) => !["Completed", "Cancelled"].includes(r.status)).length] as const, ...REQUEST_STATUSES.map((s) => [s, s === "In the Qeue" ? "In the Queue" : s, counts[s] || 0] as const), ["all", "All", requests.length] as const].map(
          ([k, l, n]) => (
            <button
              key={k}
              type="button"
              aria-pressed={status === k}
              onClick={() => (setStatus(k), setLimit(PAGE))}
              className={cx("chip h-8 shrink-0 cursor-pointer whitespace-nowrap px-3", status === k && "!bg-ink !text-white")}
            >
              {l} <span className="font-extrabold">{n}</span>
            </button>
          ),
        )}
        <select aria-label="Request location" value={loc} onChange={(e) => (setLoc(e.target.value), setLimit(PAGE))}className="h-8 rounded-full border border-line-2 bg-white px-3 text-[11.5px] font-semibold">
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {list.length === 0 && <li className="rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">No requests in this view.</li>}
        {list.slice(0, limit).map((r) => (
          <RequestRow key={r.id} r={r} antNames={antNames} onOpen={onOpen} />
        ))}
      </ul>
      {list.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] font-semibold text-muted">
            Showing {Math.min(limit, list.length)} of {list.length}
          </span>
          {list.length > limit && (
            <button type="button" className={BTN_SM} onClick={() => setLimit(limit + PAGE)}>
              Show {Math.min(PAGE, list.length - limit)} more
            </button>
          )}
          {limit > PAGE && (
            <button type="button" className={BTN_SM} onClick={() => setLimit(PAGE)}>
              Collapse
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function RequestModal({ id, antNames, qaName, onClose }: { id: string | null; antNames: (ids: string[]) => string; qaName: (id: string) => string; onClose: () => void }) {
  const toast = useToast();
  const [r, setR] = useState<AntRequestDetail | null>(null);
  const [err, setErr] = useState("");
  const [running, setRunning] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  if (id !== loaded) {
    setLoaded(id);
    setR(null);
    setErr("");
    if (id)
      fetch(`/api/ant/request?id=${id}`)
        .then((x) => x.json())
        .then((j: { ok?: boolean; request?: AntRequestDetail; error?: string }) => (j.ok && j.request ? setR(j.request) : setErr(j.error || "Couldn't load")))
        .catch((e) => setErr(String(e)));
  }
  if (!id) return null;
  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/ant/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: id }) });
      const j = (await res.json()) as { ok?: boolean; output?: string; error?: string };
      if (!j.ok) throw new Error(res.status === 503 ? "AI not connected yet — add ANTHROPIC_API_KEY" : j.error || "Run failed");
      setR((x) => (x ? { ...x, output: j.output || "", status: "Completed" } : x));
      toast("Claude completed the request");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={r?.title || (err ? "ANT Request" : "Loading…")}
      subtitle={r ? [r.num != null && `#${r.num}`, antNames(r.antIds), r.location, fmt(r.submitted)].filter(Boolean).join(" · ") : undefined}
      footer={
        r && RUNNABLE.includes(r.status) ? (
          <button type="button" className="btn btn-brand" disabled={running} onClick={run}>
            {running ? "Running…" : "Run with Claude"}
          </button>
        ) : undefined
      }
    >
      {err && <div className="rounded-2xl bg-bad-soft p-4 text-[12.5px] text-bad">{err}</div>}
      {r && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <StatusPill status={r.status || "—"} />
            {r.priority && <span className="chip">{r.priority}</span>}
            {r.queueType && <span className="chip">{r.queueType}</span>}
            {r.origin && <span className="chip">Origin: {r.origin}</span>}
            {r.due && <span className="chip">Due {fmt(r.due)}</span>}
            {r.departments.map((d) => (
              <span key={d} className="chip">
                {d}
              </span>
            ))}
            {r.quickAssistIds.map((q) => qaName(q) && <span key={q} className="chip !bg-brand-soft !text-brand">{qaName(q)}</span>)}
          </div>
          <Block label="Description" text={r.description} />
          <Block label="Output summary" text={r.output} />
          {r.outputUrls && <Block label="Output links" text={r.outputUrls} />}
          {r.transcript && (
            <details className="rounded-2xl bg-plane p-4">
              <summary className="cursor-pointer text-[12px] font-bold">Transcript</summary>
              <div className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-ink-2">{r.transcript}</div>
            </details>
          )}
        </div>
      )}
    </Modal>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      {text ? <div className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-ink-2">{text}</div> : <div className="text-[12px] text-muted">—</div>}
    </div>
  );
}

function NewRequestModal({ open, onClose, data }: { open: boolean; onClose: () => void; data: AntData }) {
  const toast = useToast();
  const blank = { title: "", description: "", antId: "", departmentId: "", quickAssistId: "", priority: "Normal", queueType: "", dueDate: "" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/ant/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "new", ...f }) });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!j.ok) throw new Error(j.error || "Couldn't create the request");
      toast("ANT request created — it appears in the queue within a minute");
      setF(blank);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't create the request");
    } finally {
      setBusy(false);
    }
  }
  const qas = data.quickAssists.filter((x) => x.active && (!f.antId || x.antIds.includes(f.antId)));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New ANT request"
      subtitle="Saved to ANT Requests · Location Hub · Status Not Started"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-brand" disabled={busy || !f.title.trim()} onClick={submit}>
            {busy ? "Saving…" : "Create request"}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="field-label">Title *</span>
          <input className="field" value={f.title} onChange={set("title")} maxLength={200} />
        </label>
        <label className="block sm:col-span-2">
          <span className="field-label">Description</span>
          <textarea className="field min-h-28" value={f.description} onChange={set("description")} />
        </label>
        <label className="block">
          <span className="field-label">ANT</span>
          <select className="field" value={f.antId} onChange={set("antId")}>
            <option value="">—</option>
            {data.ants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.active ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Quick Assist</span>
          <select className="field" value={f.quickAssistId} onChange={set("quickAssistId")}>
            <option value="">—</option>
            {qas.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Department</span>
          <select className="field" value={f.departmentId} onChange={set("departmentId")}>
            <option value="">—</option>
            {data.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Priority</span>
          <select className="field" value={f.priority} onChange={set("priority")}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Queue type</span>
          <select className="field" value={f.queueType} onChange={set("queueType")}>
            <option value="">—</option>
            {QUEUE_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Due date</span>
          <input type="date" className="field" value={f.dueDate} onChange={set("dueDate")} />
        </label>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- directory */
function Directory({
  ants,
  q,
  dept,
  setDept,
  departments,
  onOpen,
}: {
  ants: Ant[];
  q: string;
  dept: string;
  setDept: (d: string) => void;
  departments: string[];
  onOpen: (a: Ant) => void;
}) {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const n = lower(search.trim()) || q;
  const list = ants.filter(
    (a) =>
      (showInactive || a.active) &&
      (!dept || a.departments.includes(dept)) &&
      (!n || [a.name, a.overview, a.functions, a.departments.join(" ")].some((s) => lower(s).includes(n))),
  );
  const groups = [...HIERARCHY, ""].map((h) => ({ h, list: list.filter((a) => (h ? a.hierarchy === h : !(HIERARCHY as readonly string[]).includes(a.hierarchy))) }));
  return (
    <section id="directory" className="card scroll-mt-6 p-5 sm:p-6" aria-label="ANT directory">
      <CardHead
        eyebrow="ANT directory"
        title="ANTs"
        sub="Orchestrators route work, Master ANTs own a department, Command ANTs handle specialised roles."
        right={
          <>
            <input type="search" className="field h-9 w-48 !rounded-full" placeholder="Search ANTs" aria-label="Search ANTs" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select aria-label="Department" value={dept} onChange={(e) => setDept(e.target.value)} className="h-9 rounded-full border border-line-2 bg-white px-3 text-[12px] font-semibold">
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-2">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Inactive
            </label>
          </>
        }
      />
      {groups.map((g) => g.list.length > 0 && <AntGroup key={g.h || "none"} label={g.h || "Hierarchy not set"} list={g.list} onOpen={onOpen} />)}
      {list.length === 0 && <div className="mt-4 rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">No ANTs match.</div>}
    </section>
  );
}

const GROUP_PREVIEW = 6;
function AntGroup({ label, list, onOpen }: { label: string; list: Ant[]; onOpen: (a: Ant) => void }) {
  const [open, setOpen] = useState(true);
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, GROUP_PREVIEW);
  return (
    <div className="mt-4">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-full pr-2 text-left">
        <IconChevron width={14} height={14} className={cx("shrink-0 text-muted transition-transform", !open && "-rotate-90")} />
        <span className="eyebrow">
          {label} · {list.length}
        </span>
      </button>
      {open && (
        <>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {shown.map((a) => {
              const depts = a.departments.join(", ");
              return (
                <button key={a.id} type="button" onClick={() => onOpen(a)} className="flex min-w-0 flex-col rounded-2xl bg-plane px-3.5 py-3 text-left transition hover:bg-lav">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-extrabold" title={a.name}>
                      {a.name}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      {!a.active && <span className="chip whitespace-nowrap !bg-white">Inactive</span>}
                      {a.brainChars < 300 && <span className="chip whitespace-nowrap !bg-warn-soft !text-warn">{a.brainChars ? "Thin brain" : "No brain"}</span>}
                    </span>
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[12px] text-ink-2" title={a.overview || a.functions}>
                    {a.overview || a.functions || "No overview yet."}
                  </div>
                  {depts && (
                    <div className="mt-1 truncate text-[11px] font-semibold text-muted" title={depts}>
                      {depts}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {list.length > GROUP_PREVIEW && (
            <button type="button" className="btn btn-sm mt-2 min-h-8 whitespace-nowrap" onClick={() => setAll(!all)}>
              {all ? "Show fewer" : `Show all (${list.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function AntDrawer({
  ant,
  onClose,
  qas,
  prompts,
  requests,
  onChat,
  onLaunch,
  onPrompt,
  onRequest,
}: {
  ant: Ant | null;
  onClose: () => void;
  qas: QuickAssist[];
  prompts: Prompt[];
  requests: AntRequest[];
  onChat: (a: Ant) => void;
  onLaunch: (x: QuickAssist) => void;
  onPrompt: (p: Prompt) => void;
  onRequest: (id: string) => void;
}) {
  if (!ant) return null;
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={ant.name}
      subtitle={[ant.hierarchy || "Hierarchy not set", ant.active ? "Active" : "Inactive", ant.departments.join(", ")].filter(Boolean).join(" · ")}
      footer={
        <button type="button" className="btn btn-brand" onClick={() => onChat(ant)}>
          Chat with {ant.name}
        </button>
      }
    >
      <div className="space-y-5">
        <Block label="Overview" text={ant.overview} />
        <Block label="Functions" text={ant.functions} />
        <Block label="Expected outputs" text={ant.outputs} />
        <Block label="Triggers & workflows" text={ant.triggers} />
        <div className="text-[11.5px] text-muted">
          ANT BRAIN: {ant.brainChars ? `${ant.brainChars.toLocaleString()} characters (used as the chat’s system prompt)` : "empty — chat falls back to functions and outputs"}
          {ant.brainUrls && <div className="mt-1 whitespace-pre-wrap break-all">References: {ant.brainUrls}</div>}
        </div>
        <SubList label={`Quick Assists · ${qas.length}`}>
          {qas.map((x) => (
            <Row key={x.id} title={x.title} sub={x.trigger} onClick={() => onLaunch(x)} action="Launch" />
          ))}
        </SubList>
        <SubList label={`Prompts · ${prompts.length}`}>
          {prompts.map((p) => (
            <Row key={p.id} title={p.name || "Untitled prompt"} sub={[p.type, p.status].filter(Boolean).join(" · ")} onClick={() => onPrompt(p)} action="Open" />
          ))}
        </SubList>
        <SubList label={`Recent requests · ${requests.length}`}>
          {requests.map((r) => (
            <Row key={r.id} title={r.title || "(untitled)"} sub={`${r.status || "—"} · ${fmt(r.submitted)}`} onClick={() => onRequest(r.id)} action="Open" />
          ))}
        </SubList>
      </div>
    </Modal>
  );
}

function SubList({ label, children }: { label: string; children: ReactNode[] }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      {children.length ? <ul className="divide-y divide-line rounded-2xl bg-plane px-2">{children}</ul> : <div className="text-[12px] text-muted">None linked.</div>}
    </div>
  );
}
function Row({ title, sub, onClick, action }: { title: string; sub: string; onClick: () => void; action: string }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-2 py-2.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-bold">{title}</div>
          {sub && <div className="truncate text-[11px] text-muted">{sub}</div>}
        </div>
        <span className="text-[11.5px] font-bold text-brand">{action}</span>
      </button>
    </li>
  );
}

/* ---------------------------------------------------------------- quick assists */
const QA_PAGE = 12;
function QuickAssists({
  list,
  antNames,
  departments,
  onLaunch,
}: {
  list: QuickAssist[];
  antNames: (ids: string[]) => string;
  departments: string[];
  onLaunch: (x: QuickAssist) => void;
}) {
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [limit, setLimit] = useState(QA_PAGE);
  const n = lower(search.trim());
  const shown = list.filter(
    (x) => (all || x.active) && (!dept || x.departments.includes(dept)) && (!n || [x.title, x.preset, x.trigger, antNames(x.antIds)].some((s) => lower(s || "").includes(n))),
  );
  const reset = () => setLimit(QA_PAGE);
  return (
    <section id="quick-assists" className="card p-5 sm:p-6" aria-label="Quick Assists">
      <CardHead eyebrow="ANT Quick Assists" title="Quick Assists" sub="Launching one opens the chat with its request preset and assigned ANT." />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          className="field h-9 w-full !rounded-full sm:w-56"
          placeholder="Search quick assists"
          aria-label="Search quick assists"
          value={search}
          onChange={(e) => (setSearch(e.target.value), reset())}
        />
        <select aria-label="Department" value={dept} onChange={(e) => (setDept(e.target.value), reset())} className="h-9 rounded-full border border-line-2 bg-white px-3 text-[12px] font-semibold">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <label className="flex min-h-8 items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold text-ink-2">
          <input type="checkbox" checked={all} onChange={(e) => (setAll(e.target.checked), reset())} /> Show inactive
        </label>
      </div>
      {shown.length === 0 && <div className="mt-4 rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">No quick assists match.</div>}
      <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {shown.slice(0, limit).map((x) => {
          const meta = [antNames(x.antIds), x.trigger, x.departments.join(", ")].filter(Boolean).join(" · ");
          return (
            <li key={x.id} className={cx("min-w-0 rounded-2xl bg-plane", open === x.id && "md:col-span-2 xl:col-span-3")}>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id}>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[13px] font-bold" title={x.title}>
                      {x.title}
                    </span>
                    {!x.active && <span className="chip shrink-0 whitespace-nowrap !bg-white">Inactive</span>}
                    <IconChevron width={14} height={14} className={cx("shrink-0 text-muted transition-transform", open === x.id && "rotate-180")} />
                  </div>
                  <div className="truncate text-[11.5px] text-muted" title={meta}>
                    {meta || "—"}
                  </div>
                </button>
                <button type="button" className="btn btn-sm btn-brand min-h-8 w-[76px] shrink-0 whitespace-nowrap" onClick={() => onLaunch(x)}>
                  Launch
                </button>
              </div>
              {open === x.id && (
                <div className="mx-3 mb-3 rounded-xl bg-white p-3 text-[12px] leading-relaxed text-ink-2">
                  <div className="scroll-thin max-h-48 overflow-y-auto whitespace-pre-wrap">{x.preset || "No request preset."}</div>
                  {x.tables.length > 0 && <div className="mt-2 text-[11px] text-muted">Tables: {x.tables.join(", ")}</div>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {shown.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] font-semibold text-muted">
            Showing {Math.min(limit, shown.length)} of {shown.length}
          </span>
          {shown.length > limit && (
            <button type="button" className="btn btn-sm min-h-8 whitespace-nowrap" onClick={() => setLimit(limit + QA_PAGE)}>
              Show {Math.min(QA_PAGE, shown.length - limit)} more
            </button>
          )}
          {limit > QA_PAGE && (
            <button type="button" className="btn btn-sm min-h-8 whitespace-nowrap" onClick={reset}>
              Collapse
            </button>
          )}
        </div>
      )}
    </section>
  );
}
