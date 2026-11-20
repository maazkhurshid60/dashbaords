"use client";

import { useMemo, useState } from "react";
import {
  DAY,
  INBOX_VIEWS,
  SOURCE_GROUPS,
  ago,
  fmtDateTime,
  groupOfChannel,
  groupOfSource,
  hit,
  inboxMatch,
  isOpen,
  isOpenOpp,
  replyDue,
  ts,
  type InboxView,
} from "@/lib/crm-logic";
import { nowMs } from "@/lib/crm-logic";
import type { ChatSession, Msg } from "@/lib/crm-types";
import { ActivityList, Chip, Com, DetailsCard, Empty, H, Stat, TaskForm, TaskList, cx } from "./bits";
import { OppMiniList, StagePath, contactSpecs } from "./records";
import { useCrm } from "./store";

const LIST_MAX = 250;

/* 24-hour reply promise chip (COM-5 / COM-23): green → amber at 12h left → red at 4h / overdue. */
function DueChip({ m }: { m: Msg }) {
  const { D } = useCrm();
  if (!isOpen(m) || m.direction === "Outgoing") return null;
  const due = replyDue(m, D);
  if (!due) return null;
  const left = due - nowMs();
  const h = Math.round(left / 3600000);
  const tone = left < 0 ? "bad" : left < 4 * 3600000 ? "bad" : left < 12 * 3600000 ? "warn" : "good";
  return <Chip tone={tone}>{left < 0 ? `${Math.abs(Math.round(left / DAY)) || "<1"}d past 24h` : `${h}h left`}</Chip>;
}

export function Inbox() {
  const { D, nav, setPanel, isAdmin } = useCrm();
  const [view, setView] = useState<InboxView>((nav.inboxView as InboxView) || "needs");
  const [source, setSource] = useState<string>(""); // Inbox Sources id or "grp:<group>"
  const [range, setRange] = useState<"all" | "today" | "week" | "month">("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string>(nav.inboxMsg || "");
  const now = nowMs();

  const counts = useMemo(() => Object.fromEntries(INBOX_VIEWS.map((v) => [v.id, D.msgs.filter((m) => inboxMatch(v.id, m, D, now)).length])), [D, now]);
  const srcOf = (m: Msg) => D.sources.find((s) => m.sourceIds.includes(s.id));
  const grpOf = (m: Msg) => {
    const s = srcOf(m);
    return s ? groupOfSource(s) : groupOfChannel(m.channel);
  };
  const list = useMemo(() => {
    const min = range === "today" ? now - DAY : range === "week" ? now - 7 * DAY : range === "month" ? now - 30 * DAY : 0;
    return D.msgs
      .filter((m) => inboxMatch(view, m, D, now))
      .filter((m) => !source || (source.startsWith("grp:") ? grpOf(m) === source.slice(4) : m.sourceIds.includes(source)))
      .filter((m) => ts(m.date) >= min)
      .filter((m) => hit(q, m.subject, m.from, m.body))
      .sort((a, b) => ts(b.date) - ts(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, view, source, range, q, now]);
  const cur = D.msgs.find((m) => m.id === sel) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {INBOX_VIEWS.filter((v) => v.id !== "all").map((v) => (
          <Stat key={v.id} label={v.label} value={counts[v.id]} active={view === v.id} tone={v.id === "past24" && counts[v.id] ? "bad" : undefined} onClick={() => setView(v.id)} />
        ))}
        <Com id="COM-4" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_340px_1fr]">
        {/* rail (COM-6 / COM-30) */}
        <nav className="scroll-thin max-h-[300px] space-y-4 overflow-y-auto text-[13px] lg:max-h-[680px]">
          <div>
            <div className="eyebrow mb-1">
              Views
              <Com id="COM-6" />
            </div>
            {INBOX_VIEWS.map((v) => (
              <button key={v.id} type="button" onClick={() => setView(v.id)} className={cx("flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left", view === v.id ? "bg-brand-soft font-semibold text-brand" : "hover:bg-plane")}>
                <span>{v.label}</span>
                <span className="text-muted">{counts[v.id]}</span>
              </button>
            ))}
          </div>
          <div>
            <div className="eyebrow mb-1 flex items-center justify-between">
              <span>
                Inboxes & sites
                <Com id="COM-30" />
              </span>
              <button type="button" className="text-[11px] font-semibold text-brand" onClick={() => setPanel({ kind: "sources" })}>
                Manage
              </button>
            </div>
            <button type="button" onClick={() => setSource("")} className={cx("w-full rounded-lg px-2 py-1 text-left", !source ? "font-semibold text-brand" : "hover:bg-plane")}>
              All inboxes
            </button>
            {SOURCE_GROUPS.map((g) => {
              const srcs = D.sources.filter((s) => groupOfSource(s) === g);
              return (
                <div key={g} className="mt-1">
                  <button type="button" onClick={() => setSource("grp:" + g)} className={cx("w-full rounded-lg px-2 py-1 text-left text-[12px] font-bold uppercase tracking-wide", source === "grp:" + g ? "text-brand" : "text-ink-2 hover:bg-plane")}>
                    {g}
                  </button>
                  {srcs.map((s) => {
                    const open = D.msgs.filter((m) => m.sourceIds.includes(s.id) && isOpen(m)).length;
                    return (
                      <button key={s.id} type="button" onClick={() => setSource(s.id)} className={cx("flex w-full items-center gap-2 rounded-lg py-1 pl-4 pr-2 text-left", source === s.id ? "bg-brand-soft text-brand" : "hover:bg-plane")}>
                        <span className={cx("size-2 shrink-0 rounded-full", s.status === "Connected" ? "bg-good" : s.status === "Error" ? "bg-bad" : "bg-warn")} title={s.status} />
                        <span className="flex-1 truncate">{s.name}</span>
                        <span className="text-muted">{open || ""}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-sm w-full" onClick={() => setPanel({ kind: "notify" })}>
            🔔 Notification settings
          </button>
          {isAdmin && (
            <button type="button" className="btn btn-sm w-full" onClick={() => setPanel({ kind: "sources" })}>
              ＋ Connect a source
            </button>
          )}
        </nav>

        {/* list */}
        <section className="card flex h-[460px] flex-col overflow-hidden lg:h-[680px]">
          <header className="space-y-2 border-b border-line p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold">
                {INBOX_VIEWS.find((v) => v.id === view)?.label} <span className="text-muted">· {list.length}</span>
              </span>
              <select className="field w-auto py-1 text-[12px]" value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
            </div>
            <input className="field" placeholder="Search messages…" value={q} onChange={(e) => setQ(e.target.value)} />
          </header>
          <ul className="scroll-thin flex-1 divide-y divide-line overflow-y-auto">
            {list.slice(0, LIST_MAX).map((m) => {
              const s = srcOf(m);
              return (
                <li key={m.id}>
                  <button type="button" onClick={() => setSel(m.id)} className={cx("w-full px-3 py-2.5 text-left", sel === m.id ? "bg-brand-soft" : "hover:bg-plane")}>
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="flex-1 truncate font-semibold text-ink">{m.from || "Unknown sender"}</span>
                      <span className="text-muted">{ago(m.date, now)}</span>
                    </div>
                    <div className="truncate text-[13px]">{m.subject || "(no subject)"}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Chip>{s?.name || m.channel || "Email"}</Chip>
                      {m.outboundCampaign && <Chip tone="teal">{m.outboundCampaign}</Chip>}
                      {!m.contactIds.length && m.direction !== "Outgoing" && <Chip tone="warn">New person</Chip>}
                      {m.draft && isOpen(m) && <Chip tone="brand">AI draft</Chip>}
                      <DueChip m={m} />
                    </div>
                  </button>
                </li>
              );
            })}
            {list.length > LIST_MAX && <li className="p-3 text-center text-[12px] text-muted">Showing the newest {LIST_MAX} of {list.length} — narrow with search or dates.</li>}
            {!list.length && (
              <li className="p-4">
                <Empty>{D.msgs.length ? "Nothing in this view." : "No messages in Airtable › Communications yet."}</Empty>
              </li>
            )}
          </ul>
        </section>

        {/* reader */}
        <section className="card h-[560px] overflow-hidden lg:h-[680px]">{cur ? <Reader key={cur.id} m={cur} /> : <div className="p-6"><Empty>Pick a message to read it.</Empty></div>}</section>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- reader (COM-31) */
function Reader({ m }: { m: Msg }) {
  const { D, setPanel, name } = useCrm();
  const chat = D.chatSessions.find((c) => m.chatIds.includes(c.id)) || null;
  const [tab, setTab] = useState<"conv" | "contact" | "opp" | "journey">("conv");
  const contact = D.contacts.find((c) => m.contactIds.includes(c.id)) || null;
  const opps = D.opps.filter((o) => m.oppIds.includes(o.id) || (contact && (o.contactIds.includes(contact.id) || o.companyIds.some((x) => contact.companyIds.includes(x)))));
  const tasks = D.tasks.filter((t) => t.msgIds.includes(m.id) || (contact && t.contactIds.includes(contact.id)));
  const tabs: [typeof tab, string][] = [
    ["conv", "Conversation"],
    ["contact", "Contact info"],
    ["opp", "Opportunity"],
    ...(chat ? ([["journey", "Site journey"]] as [typeof tab, string][]) : []),
  ];
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line px-4 pt-3">
        <div className="text-[16px] font-bold">{m.subject || "(no subject)"}</div>
        {/* one-line person strip */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-2">
          {contact ? (
            <Chip tone="brand" onClick={() => setPanel({ kind: "contact", id: contact.id })}>
              {contact.name || contact.email}
            </Chip>
          ) : (
            <Chip tone="warn">New person · {m.from}</Chip>
          )}
          {contact?.stage && <Chip>{contact.stage}</Chip>}
          <Chip>{opps.filter((o) => isOpenOpp(o, D.stages)).length} open opportunities</Chip>
          <Chip>{tasks.filter((t) => !t.completed).length} open tasks</Chip>
          {m.assigneeIds[0] && <Chip tone="teal">→ {name(m.assigneeIds[0])}</Chip>}
          <DueChip m={m} />
        </div>
        <div className="scroll-thin mt-2 flex gap-4 overflow-x-auto whitespace-nowrap text-[13px]">
          {tabs.map(([id, l]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={cx("border-b-2 pb-2", tab === id ? "border-brand font-semibold text-brand" : "border-transparent text-ink-2")}>
              {l}
            </button>
          ))}
          <Com id="COM-31" />
        </div>
      </header>
      <div className="scroll-thin flex-1 space-y-5 overflow-y-auto p-4">
        {tab === "conv" && (chat ? <ChatThread m={m} s={chat} /> : <Conversation m={m} />)}
        {tab === "contact" && <ContactTab m={m} />}
        {tab === "opp" && <OppTab m={m} />}
        {tab === "journey" && chat && <Journey s={chat} />}
      </div>
    </div>
  );
}

function MsgActions({ m }: { m: Msg }) {
  const { D, write, busy } = useCrm();
  const [task, setTask] = useState(false);
  const contact = m.contactIds;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" onClick={() => setTask((t) => !t)}>
          Follow-up task
        </button>
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => write("updateMessage", { id: m.id, fields: { "Snoozed Until": new Date(nowMs() + DAY).toISOString() } }, "Snoozed until tomorrow")}>
          Snooze 1 day
        </button>
        {isOpen(m) ? (
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => write("updateMessage", { id: m.id, fields: { Status: "Closed", "Needs Response": false } }, "Closed — no reply needed")}>
            Close — no reply needed
          </button>
        ) : (
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => write("updateMessage", { id: m.id, fields: { Status: "Open", Reopened: true, "Needs Response": true } }, "Reopened")}>
            Reopen
          </button>
        )}
        <select className="field w-auto py-1 text-[12px]" value={m.assigneeIds[0] || ""} onChange={(e) => write("updateMessage", { id: m.id, fields: { Assignee: e.target.value ? [e.target.value] : [] } }, "Assigned")}>
          <option value="">Unassigned</option>
          {D.members.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <Com id="COM-5" />
      </div>
      {task && <TaskForm tab="Inbox" link={{ msgIds: [m.id], contactIds: contact, oppIds: m.oppIds, title: `Follow up: ${m.subject}` }} onDone={() => setTask(false)} />}
    </div>
  );
}

function Conversation({ m }: { m: Msg }) {
  const { D } = useCrm();
  const community = groupOfChannel(m.channel) === "Community" || D.sources.some((s) => m.sourceIds.includes(s.id) && groupOfSource(s) === "Community");
  return (
    <>
      <MsgActions m={m} />
      <article className="rounded-xl border border-line p-4 text-[13.5px]">
        <div className="mb-2 flex flex-wrap gap-x-3 text-[12px] text-ink-2">
          <span>
            <b>From</b> {m.from}
          </span>
          {m.to && (
            <span>
              <b>To</b> {m.to}
            </span>
          )}
          <span>{fmtDateTime(m.date)}</span>
          {m.intent && <Chip>{m.intent}</Chip>}
        </div>
        {m.aiSummary && <p className="mb-2 rounded-lg bg-plane p-2 text-[12.5px] text-ink-2">AI summary: {m.aiSummary}</p>}
        <div className="whitespace-pre-wrap">{m.body || <span className="text-muted">(no body)</span>}</div>
        {m.threadUrl && (
          <a className="mt-2 inline-block text-[12px] text-brand underline" href={m.threadUrl} target="_blank" rel="noreferrer">
            Open thread
          </a>
        )}
      </article>
      <Composer m={m} community={community} />
    </>
  );
}

async function aiDraft(prompt: string): Promise<{ ok: boolean; text: string }> {
  try {
    const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ant: "Communications", message: prompt }) });
    const j = (await r.json()) as { ok: boolean; reply?: string; error?: string };
    return j.ok ? { ok: true, text: j.reply || "" } : { ok: false, text: r.status === 503 ? "AI drafting isn't connected yet (ANTHROPIC_API_KEY not set)." : j.error || "AI draft failed" };
  } catch {
    return { ok: false, text: "AI draft failed" };
  }
}

const historyFor = (m: Msg, msgs: Msg[]) =>
  msgs
    .filter((x) => x.id !== m.id && x.contactIds.some((c) => m.contactIds.includes(c)))
    .slice(0, 5)
    .map((x) => `- ${x.date.slice(0, 10)} ${x.direction}: ${x.subject}`)
    .join("\n");

/* Reply composer (COM-7; community: COM-30). */
function Composer({ m, community }: { m: Msg; community: boolean }) {
  const { D, write, busy, toast } = useCrm();
  const senders = D.sources.filter((s) => groupOfSource(s) === "Email");
  const defFrom = D.sources.find((s) => m.sourceIds.includes(s.id));
  const [from, setFrom] = useState(defFrom?.replyFrom || defFrom?.address || senders[0]?.replyFrom || senders[0]?.address || "");
  const [body, setBody] = useState(m.draft);
  const [vis, setVis] = useState(community ? "Public reply" : "Private (email / DM)");
  const [tpl, setTpl] = useState("");
  const [thinking, setThinking] = useState(false);
  const templates = D.answers.filter((a) => a.category === "Reply template" || community);
  const suggestion = community ? D.answers.find((a) => a.category === "Chatbot answer" && a.approved && hit(a.title.split(" ")[0] || "", m.subject, m.body)) : null;
  return (
    <section className="space-y-2 rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <label className="flex items-center gap-1.5">
          Send from
          <select className="field w-auto py-1" value={from} onChange={(e) => setFrom(e.target.value)}>
            {!from && <option value="">—</option>}
            {senders.map((s) => {
              const a = s.replyFrom || s.address;
              return (
                <option key={s.id} value={a}>
                  {s.name} {a ? `· ${a}` : ""}
                </option>
              );
            })}
          </select>
        </label>
        <select
          className="field w-auto py-1"
          value={tpl}
          onChange={(e) => {
            setTpl(e.target.value);
            const a = D.answers.find((x) => x.id === e.target.value);
            if (a) setBody(a.body);
          }}
        >
          <option value="">Templates…</option>
          {templates.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-sm"
          disabled={thinking}
          onClick={async () => {
            setThinking(true);
            const tplBody = D.answers.find((x) => x.id === tpl)?.body || "";
            const r = await aiDraft(
              `Write a short, warm reply email for VCG / ACRYLICS.\nIncoming message from ${m.from}, subject "${m.subject}":\n${m.body.slice(0, 3000)}\n${tplBody ? `\nStart from this template:\n${tplBody}` : ""}\nPrevious history:\n${historyFor(m, D.msgs) || "none"}\nReturn only the reply body.`,
            );
            setThinking(false);
            if (r.ok) setBody(r.text);
            else toast(r.text);
          }}
        >
          {thinking ? "Writing…" : "✨ Write it for me"}
        </button>
        {community && (
          <select className="field w-auto py-1" value={vis} onChange={(e) => setVis(e.target.value)}>
            <option>Public reply</option>
            <option>Private (email / DM)</option>
          </select>
        )}
        <Com id="COM-7" />
      </div>
      {suggestion && (
        <div className="rounded-lg bg-teal-soft p-2 text-[12.5px]">
          <b>Answer Library suggestion:</b> {suggestion.title}{" "}
          <button type="button" className="font-semibold text-teal underline" onClick={() => setBody(suggestion.body)}>
            Use it
          </button>
        </div>
      )}
      <textarea className="field min-h-32" placeholder="Write a reply…" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="btn btn-sm" disabled={busy || body === m.draft} onClick={() => write("updateMessage", { id: m.id, fields: { "Reply Draft": body } }, "Draft saved")}>
          Save draft
        </button>
        {community && (
          <button type="button" className="btn btn-sm" disabled={busy || !body.trim()} onClick={() => write("saveAnswer", { fields: { "Answer Title": m.subject.slice(0, 120) || "Community answer", "Answer Body": body, "Answer Category": "Chatbot answer", Approved: false } }, "Saved to Answer Library")}>
            Save to Answer Library
          </button>
        )}
        <button type="button" className="btn btn-sm btn-brand" disabled={busy || !body.trim()} onClick={() => write("sendReply", { id: m.id, body, from, visibility: community ? vis : "Private (email / DM)" }, "Reply saved · marked Replied")}>
          Send reply
        </button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- chatbot thread (COM-21/23) */
function ChatThread({ m, s }: { m: Msg; s: ChatSession }) {
  const { D, write, busy, toast } = useCrm();
  const msgs = D.chatMessages.filter((x) => x.sessionIds.includes(s.id)).sort((a, b) => ts(a.sentAt) - ts(b.sentAt));
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const handed = s.status === "Handed off" && ts(s.handedOffAt);
  const left = handed ? ts(s.handedOffAt) + DAY - nowMs() : 0;
  const pctLeft = Math.max(0, Math.min(100, (left / DAY) * 100));
  return (
    <>
      {handed ? (
        <div className="rounded-xl border border-line p-3 text-[12.5px]">
          <div className="flex justify-between">
            <b>Handed off by AI · {fmtDateTime(s.handedOffAt)}</b>
            <span>{left > 0 ? `${Math.round(left / 3600000)}h left` : "Past 24h"}</span>
          </div>
          {s.handoffReason && <div className="text-ink-2">Reason: {s.handoffReason}</div>}
          <div className="mt-2 h-1.5 rounded-full bg-plane">
            <div className={cx("h-full rounded-full", left < 4 * 3600000 ? "bg-bad" : left < 12 * 3600000 ? "bg-warn" : "bg-good")} style={{ width: `${pctLeft}%` }} />
          </div>
          <Com id="COM-23" />
        </div>
      ) : s.status === "Resolved by AI" ? (
        <div className="flex items-center justify-between rounded-xl bg-plane p-3 text-[13px]">
          <span>Resolved by AI</span>
          <button type="button" className="btn btn-sm" onClick={() => write("saveChatSession", { id: s.id, fields: { Status: "Handed off" } }, "Chat reopened")}>
            Reopen
          </button>
        </div>
      ) : null}
      <div className="space-y-2">
        {msgs.map((x) =>
          x.senderType === "System" ? (
            <div key={x.id} className="text-center text-[11.5px] text-muted">
              {x.text}
            </div>
          ) : (
            <div key={x.id} className={cx("flex", x.senderType === "Visitor" ? "justify-start" : "justify-end")}>
              <div className={cx("max-w-[80%] rounded-2xl px-3 py-2 text-[13px]", x.senderType === "Visitor" ? "bg-plane" : x.senderType === "AI" ? "bg-lav text-ink" : "bg-brand text-white")}>
                <div className="text-[10.5px] font-semibold opacity-70">
                  {x.senderName || x.senderType} · {fmtDateTime(x.sentAt)}
                </div>
                <div className="whitespace-pre-wrap">{x.text}</div>
              </div>
            </div>
          ),
        )}
        {!msgs.length && <Empty>No chat messages recorded for this session.</Empty>}
      </div>
      <section className="space-y-2 rounded-xl border border-line p-3">
        <textarea className="field min-h-24" placeholder={s.online ? "Reply in the chat…" : "Visitor has left — reply goes by email with the transcript"} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn btn-sm"
            disabled={thinking}
            onClick={async () => {
              setThinking(true);
              const r = await aiDraft(`Draft a short chat reply for a website visitor. Transcript:\n${msgs.map((x) => `${x.senderType}: ${x.text}`).join("\n").slice(-4000)}`);
              setThinking(false);
              if (r.ok) setText(r.text);
              else toast(r.text);
            }}
          >
            ✨ Draft with AI
          </button>
          <button type="button" className="btn btn-sm" disabled={busy || !text.trim()} onClick={() => write("saveAnswer", { fields: { "Answer Title": m.subject.slice(0, 120) || "Chat answer", "Answer Body": text, "Answer Category": "Chatbot answer", Approved: false } }, "Taught the AI (Answer Library)")}>
            Teach the AI this answer
          </button>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => write("saveChatSession", { id: s.id, fields: { Status: "AI" } }, "Handed back to AI")}>
            Hand back to AI
          </button>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => write("updateMessage", { id: m.id, fields: { Status: "Closed", "Needs Response": false } }, "Chat closed")}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-sm btn-brand"
            disabled={busy || !text.trim()}
            onClick={async () => {
              const r = await write("sendChatReply", { session: s.id, text, via: s.online ? "Chat" : "Email" }, s.online ? "Sent to chat" : "Saved · send by email");
              if (r?.ok) setText("");
            }}
          >
            {s.online ? "Send to chat" : "Send by email"}
          </button>
        </div>
        <Com id="COM-21" />
      </section>
    </>
  );
}

function Journey({ s }: { s: ChatSession }) {
  const { D, name } = useCrm();
  const views = D.pageViews.filter((v) => v.sessionIds.includes(s.id)).sort((a, b) => (a.step ?? 0) - (b.step ?? 0));
  const rows: [string, string][] = [
    ["Landing page", s.landingIds.map(name).join(", ")],
    ["Chat started on", s.chatStartIds.map(name).join(", ")],
    ["Source", s.referrer],
    ["UTM", s.utm],
    ["Time on site", s.timeOnSite != null ? `${Math.round(s.timeOnSite / 60)} min` : ""],
    ["Visits", s.visits != null ? String(s.visits) : ""],
    ["Device", s.device],
    ["City", s.city],
    ["Signed in", s.signedIn],
  ];
  return (
    <section className="space-y-3 text-[13px]">
      <p className="text-[12px] text-muted">
        Internal only — never shown to the visitor.
        <Com id="COM-22" />
      </p>
      <dl className="divide-y divide-line">
        {rows.map(([l, v]) => (
          <div key={l} className="grid grid-cols-[140px_1fr] py-1.5">
            <dt className="font-semibold text-ink-2">{l}</dt>
            <dd>{v || <span className="text-muted">—</span>}</dd>
          </div>
        ))}
      </dl>
      <H>Pages visited</H>
      <ol className="space-y-1">
        {views.map((v) => (
          <li key={v.id} className="flex gap-2">
            <span className="w-14 text-muted">{v.seconds != null ? `+${Math.round(v.seconds)}s` : ""}</span>
            <span className="flex-1 truncate">{v.name || v.url}</span>
          </li>
        ))}
      </ol>
      {!views.length && <Empty>No page views recorded.</Empty>}
    </section>
  );
}

/* ---------------------------------------------------------------- contact + opportunity tabs (COM-33) */
function emailOf(from: string) {
  return (from.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [""])[0];
}

function ContactTab({ m }: { m: Msg }) {
  const { D, write, opts, setPanel } = useCrm();
  const c = D.contacts.find((x) => m.contactIds.includes(x.id));
  if (!c) {
    const email = emailOf(m.from);
    const nm = m.from.replace(/<.*>/, "").replace(/"/g, "").trim();
    return (
      <>
        <p className="text-[13px] text-ink-2">This sender isn&apos;t a contact yet. Add them — the message will be linked.</p>
        <DetailsCard
          title="New contact"
          startEditing
          specs={contactSpecs({ name: nm && nm !== email ? nm : "", email, source: m.channel === "Chatbot" ? "Chatbot" : /form/i.test(m.channel) ? "Site contact form" : "Inbound email", stage: "Lead" }, opts)}
          onSave={async (f) => {
            const base = { Name: nm && nm !== email ? nm : email, Email: email, "Lead Source": m.channel === "Chatbot" ? "Chatbot" : /form/i.test(m.channel) ? "Site contact form" : "Inbound email", "Lifecycle Stage": "Lead" };
            const fields = Object.fromEntries(Object.entries({ ...base, ...f }).filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && !v.length)));
            const r = await write("saveContact", { tab: "Inbox", fields }, "Contact added");
            const id = r?.records?.[0]?.record.id;
            if (id) await write("updateMessage", { id: m.id, fields: { Contact: [id] } }, "Message linked to contact");
            return !!r?.ok;
          }}
        />
      </>
    );
  }
  return (
    <>
      <div className="flex justify-end">
        <button type="button" className="btn btn-sm" onClick={() => setPanel({ kind: "contact", id: c.id })}>
          Open contact record
        </button>
        <Com id="COM-33" />
      </div>
      <DetailsCard key={c.id} specs={contactSpecs(c, opts)} onSave={async (f) => !!(await write("saveContact", { id: c.id, tab: "Inbox", fields: f }))?.ok} />
      <section>
        <H>Recent activity</H>
        <ActivityList items={D.activities.filter((a) => a.contactIds.includes(c.id)).slice(0, 8)} />
      </section>
      <TaskList tab="Inbox" tasks={D.tasks.filter((t) => t.contactIds.includes(c.id) || t.msgIds.includes(m.id))} link={{ contactIds: [c.id], msgIds: [m.id], picsIds: c.picsIds }} />
    </>
  );
}

function OppTab({ m }: { m: Msg }) {
  const { D, write, setPanel, busy } = useCrm();
  const c = D.contacts.find((x) => m.contactIds.includes(x.id));
  const opps = D.opps.filter((o) => m.oppIds.includes(o.id) || (c && (o.contactIds.includes(c.id) || o.companyIds.some((x) => c.companyIds.includes(x)))));
  const newOpp = async () => {
    let cid = c?.id;
    if (!cid) {
      const email = emailOf(m.from);
      const r = await write("saveContact", { tab: "Inbox", fields: { Name: m.from.replace(/<.*>/, "").replace(/"/g, "").trim() || email, Email: email, "Lifecycle Stage": "Lead", "Lead Source": "Inbound email" } }, "Contact added");
      cid = r?.records?.[0]?.record.id;
      if (!cid) return;
      await write("updateMessage", { id: m.id, fields: { Contact: [cid] } }, "Message linked");
    }
    const disc = D.stages.find((s) => s.type === "Lead-in") || D.stages[0];
    const r = await write(
      "saveDeal",
      { tab: "Inbox", fields: { "Opportunity Name": m.subject || "New opportunity", "Pipeline Stage": disc ? [disc.id] : [], "Primary Contact": [cid], Company: c?.companyIds || [], "Source Message": [m.id] } },
      "Opportunity created in Discovery",
    );
    const id = r?.records?.[0]?.record.id;
    if (id) setPanel({ kind: "opp", id });
  };
  return (
    <>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-sm btn-brand" disabled={busy} onClick={newOpp}>
          ＋ New opportunity
        </button>
        <Com id="COM-33" />
      </div>
      {opps.map((o) => (
        <div key={o.id} className="space-y-2 rounded-xl border border-line p-3">
          <OppMiniList opps={[o]} />
          <StagePath o={o} />
          {o.nextStep && <div className="text-[12.5px] text-ink-2">Next step: {o.nextStep}</div>}
        </div>
      ))}
      {!opps.length && <Empty>No opportunities for this person or their company.</Empty>}
    </>
  );
}

/* ---------------------------------------------------------------- manage inboxes (COM-30) */
export function SourcesPanel() {
  const { D, write, isAdmin, opts, busy } = useCrm();
  const [nm, setNm] = useState("");
  const [type, setType] = useState("");
  const [addr, setAddr] = useState("");
  return (
    <div className="space-y-3">
      {D.sources.map((s) => {
        const msgs = D.msgs.filter((m) => m.sourceIds.includes(s.id));
        const open = msgs.filter(isOpen).length;
        const overdue = msgs.filter((m) => inboxMatch("past24", m, D)).length;
        const ai = msgs.filter((m) => m.answeredByAI).length;
        return (
          <div key={s.id} className="rounded-xl border border-line p-3 text-[13px]">
            <div className="flex items-center gap-2">
              <span className={cx("size-2 rounded-full", s.status === "Connected" ? "bg-good" : s.status === "Error" ? "bg-bad" : "bg-warn")} />
              <b className="flex-1">{s.name}</b>
              <Chip>{s.type}</Chip>
              {s.website && <Chip tone="teal">{s.website}</Chip>}
              <Chip tone={s.status === "Connected" ? "good" : "warn"}>{s.status || "—"}</Chip>
            </div>
            <div className="mt-1 text-[12px] text-ink-2">
              {s.address} · {s.platform} · {open} open · {msgs.length} total · {overdue} overdue · {ai} answered by AI · {s.slackChannel || "no Slack channel"} · last synced {s.lastSynced ? ago(s.lastSynced) : "never"}
            </div>
            {isAdmin && (
              <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                {(
                  [
                    ["AI Drafts", s.aiDrafts, "AI drafts"],
                    ["Intranet Alerts", s.intranetAlerts, "Intranet alerts"],
                    ...(groupOfSource(s) === "Community" ? ([["AI Auto-Reply (Community)", s.aiAutoReply, "Community auto-answer"]] as const) : []),
                  ] as const
                ).map(([f, v, l]) => (
                  <label key={f} className="flex items-center gap-1">
                    <input type="checkbox" checked={v} disabled={busy} onChange={(e) => write("saveSource", { id: s.id, fields: { [f]: e.target.checked } }, `${l} ${e.target.checked ? "on" : "off"}`)} /> {l}
                  </label>
                ))}
                <input
                  className="field w-40 py-0.5"
                  defaultValue={s.slackChannel}
                  placeholder="#slack-channel"
                  onBlur={(e) => e.target.value !== s.slackChannel && write("saveSource", { id: s.id, fields: { "Slack Channel": e.target.value } }, "Slack channel saved")}
                />
              </div>
            )}
          </div>
        );
      })}
      {!D.sources.length && <Empty>No rows in Airtable › Inbox Sources.</Empty>}
      {isAdmin && (
        <div className="space-y-2 rounded-xl bg-plane p-3">
          <H>Connect a source</H>
          <input className="field" placeholder="Source name" value={nm} onChange={(e) => setNm(e.target.value)} />
          <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Source type…</option>
            {opts("Inbox Sources.Source Type").map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <input className="field" placeholder="Address / URL" value={addr} onChange={(e) => setAddr(e.target.value)} />
          <button
            type="button"
            className="btn btn-sm btn-brand"
            disabled={busy || !nm || !type}
            onClick={async () => {
              const r = await write("saveSource", { connect: true, fields: { "Source Name": nm, "Source Type": type, "Address / URL": addr, Status: "To connect" } }, "Source added (To connect)");
              if (r?.ok) setNm("");
            }}
          >
            Add source
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- notification settings (COM-24) */
export function NotifyPanel() {
  const { D, write, opts, busy } = useCrm();
  const events = opts("Notification Rules.Events");
  return (
    <div className="space-y-3">
      {D.rules.map((r) => (
        <div key={r.id} className="space-y-2 rounded-xl border border-line p-3 text-[13px]">
          <b>{r.inbox || "(inbox)"}</b>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["Intranet", r.intranet],
                ["Slack", r.slack],
                ["Email", r.email],
              ] as const
            ).map(([f, v]) => (
              <label key={f} className="flex items-center gap-1">
                <input type="checkbox" checked={v} disabled={busy} onChange={(e) => write("saveNotificationRules", { id: r.id, fields: { [f]: e.target.checked } }, "Notification rule saved")} /> {f}
              </label>
            ))}
            <input className="field w-40 py-0.5" defaultValue={r.slackChannel} placeholder="#channel" onBlur={(e) => e.target.value !== r.slackChannel && write("saveNotificationRules", { id: r.id, fields: { "Slack Channel": e.target.value } }, "Slack channel saved")} />
            <input className="field w-40 py-0.5" defaultValue={r.quietHours} placeholder="Quiet hours" onBlur={(e) => e.target.value !== r.quietHours && write("saveNotificationRules", { id: r.id, fields: { "Quiet Hours": e.target.value } }, "Quiet hours saved")} />
          </div>
          <div className="flex flex-wrap gap-1">
            {events.map((ev) => (
              <Chip key={ev} tone={r.events.includes(ev) ? "brand" : "gray"} onClick={() => write("saveNotificationRules", { id: r.id, fields: { Events: r.events.includes(ev) ? r.events.filter((x) => x !== ev) : [...r.events, ev] } }, "Events saved")}>
                {ev}
              </Chip>
            ))}
          </div>
          {r.slack && (
            <div className="flex items-center gap-2 rounded-lg bg-plane p-2 text-[12px]">
              <span className="flex-1">
                Slack preview → {r.slackChannel || "#channel"}: “New message in {r.inbox} — reply within 24h”
              </span>
              <button type="button" className="btn btn-sm" onClick={() => write("notifySlack", { channel: r.slackChannel }, "Test not sent")}>
                Send test to Slack
              </button>
            </div>
          )}
        </div>
      ))}
      {!D.rules.length && <Empty>No rows in Airtable › Notification Rules.</Empty>}
      <Com id="COM-24" />
    </div>
  );
}
