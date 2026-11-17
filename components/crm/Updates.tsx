"use client";

import { useState } from "react";
import { fmtDate, ts } from "@/lib/crm-logic";
import { nowMs } from "@/lib/crm-logic";
import type { Announcement } from "@/lib/crm-types";
import { Chip, Com, Empty, H, cx } from "./bits";
import { useCrm } from "./store";

const FILTERS = ["All", "Announcements", "Updates", "Opportunity activity", "Wins", "Following"] as const;
type F = (typeof FILTERS)[number];

const live = (a: Announcement) => a.status === "Published" && (!a.expires || ts(a.expires) >= nowMs() - 86400000);

/* Updates (COM-18 / COM-19): feed + filters, admin composer → Announcements, live preview. */
export function Updates() {
  const { D, isAdmin, me, name, setPanel } = useCrm();
  const [f, setF] = useState<F>("All");
  const followed = new Set(D.opps.filter((o) => me && o.followedByIds.includes(me.id)).map((o) => o.id));
  const match = (a: Announcement, x: F) =>
    x === "All" ||
    (x === "Announcements" && a.type === "Announcement") ||
    (x === "Updates" && a.type === "Update") ||
    (x === "Opportunity activity" && (a.type === "Deal update" || a.oppIds.length > 0)) ||
    (x === "Wins" && a.type === "Win") ||
    (x === "Following" && a.oppIds.some((o) => followed.has(o)));
  const feed = D.announcements.filter((a) => match(a, f)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || ts(b.publishDate || b.created) - ts(a.publishDate || a.created));
  const month = new Date().toISOString().slice(0, 7);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {isAdmin ? <Composer /> : <p className="text-[13px] text-ink-2">Team members read updates on the Home page, department pages, Slack or email.</p>}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((x) => (
            <Chip key={x} tone={f === x ? "brand" : "gray"} onClick={() => setF(x)}>
              {x} · {D.announcements.filter((a) => match(a, x)).length}
            </Chip>
          ))}
          <Com id="COM-18" />
        </div>
        <div className="space-y-3">
          {feed.map((a) => (
            <article key={a.id} className="card p-4 text-[13px]">
              <div className="flex flex-wrap items-center gap-1.5">
                {a.pinned && <Chip tone="warn">📌 Pinned</Chip>}
                <Chip tone={a.type === "Win" ? "good" : "brand"}>{a.type || "Update"}</Chip>
                <Chip tone={a.status === "Published" ? "good" : "gray"}>{a.status || "Draft"}</Chip>
                <span className="ml-auto text-[12px] text-muted">
                  {a.postedByIds.map(name).join(", ")} · {fmtDate(a.publishDate || a.created)}
                </span>
              </div>
              <h4 className="mt-2 text-[15px] font-bold">{a.title}</h4>
              <p className="mt-1 whitespace-pre-wrap text-ink-2">{a.body}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
                {a.publishTo.map((p) => (
                  <Chip key={p} tone={(p === "Slack" && !a.slackSentAt) || (p === "Email" && !a.emailSentAt) ? "warn" : "teal"}>
                    ✓ {p === "Slack" ? `Slack ${a.slackChannel}` : p === "Email" ? "Team email" : p}
                    {(p === "Slack" && !a.slackSentAt) || (p === "Email" && !a.emailSentAt) ? " (not sent)" : ""}
                  </Chip>
                ))}
                {a.oppIds.map((o) => (
                  <Chip key={o} tone="brand" onClick={() => setPanel({ kind: "opp", id: o })}>
                    {name(o)}
                  </Chip>
                ))}
              </div>
            </article>
          ))}
          {!feed.length && <Empty>No updates yet.</Empty>}
        </div>
      </div>
      <aside className="space-y-4">
        <section className="card p-4">
          <H>Live on the Home page</H>
          {D.announcements.filter((a) => live(a) && (a.publishTo.includes("Home page") || a.page === "Home")).slice(0, 5).map((a) => (
            <div key={a.id} className="border-b border-line py-1.5 text-[13px]">
              {a.title}
            </div>
          ))}
        </section>
        <section className="card p-4">
          <H>Latest in Slack</H>
          {D.announcements.filter((a) => a.publishTo.includes("Slack")).slice(0, 5).map((a) => (
            <div key={a.id} className="border-b border-line py-1.5 text-[13px]">
              {a.slackChannel || "#general"} · {a.title} {!a.slackSentAt && <span className="text-warn">(not sent — Slack not connected)</span>}
            </div>
          ))}
        </section>
        <section className="card p-4">
          <H>Following</H>
          {[...followed].map((o) => (
            <Chip key={o} tone="brand" onClick={() => setPanel({ kind: "opp", id: o })}>
              {name(o)}
            </Chip>
          ))}
          {!followed.size && <p className="text-[12.5px] text-muted">Follow opportunities to see them here.</p>}
        </section>
        <section className="card p-4">
          <H>Wins this month</H>
          {D.announcements.filter((a) => a.type === "Win" && (a.publishDate || a.created).startsWith(month)).map((a) => (
            <div key={a.id} className="py-1 text-[13px]">
              🏆 {a.title}
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}

function Composer() {
  const { write, opts, busy, me } = useCrm();
  const [type, setType] = useState("Announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [to, setTo] = useState<string[]>(["Home page"]);
  const [channel, setChannel] = useState("#general");
  const [expires, setExpires] = useState("");
  const [pinned, setPinned] = useState(false);
  const types = opts("Announcements.Type").filter((t) => ["Announcement", "Update", "Win"].includes(t));
  const dests = opts("Announcements.Publish To");
  return (
    <section className="card space-y-3 p-4">
      <H>
        New update
        <Com id="COM-19" />
      </H>
      <div className="seg">
        {(types.length ? types : ["Announcement", "Update", "Win"]).map((t) => (
          <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>
      <input className="field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="field min-h-24" placeholder="Message (use @name to mention)" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        Publish to
        {dests.map((d) => (
          <Chip key={d} tone={to.includes(d) ? "brand" : "gray"} onClick={() => setTo(to.includes(d) ? to.filter((x) => x !== d) : [...to, d])}>
            {d}
          </Chip>
        ))}
        {to.includes("Slack") && <input className="field w-36 py-1" value={channel} onChange={(e) => setChannel(e.target.value)} />}
        <label className="flex items-center gap-1">
          Expires <input className="field w-auto py-1" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin
        </label>
      </div>
      {title && (
        <div className="grid gap-2 sm:grid-cols-2">
          {to.map((d) => (
            <div key={d} className={cx("rounded-lg border border-line p-2 text-[12px]", d === "Slack" && "bg-plane font-mono")}>
              <div className="mb-1 text-[10.5px] font-bold uppercase text-muted">Preview · {d === "Slack" ? `Slack ${channel}` : d}</div>
              <b>{title}</b>
              <div className="whitespace-pre-wrap text-ink-2">{body}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-brand"
          disabled={busy || !title.trim()}
          onClick={async () => {
            const r = await write(
              "postUpdate",
              {
                fields: {
                  Title: title.trim(),
                  Body: body,
                  Type: type,
                  Status: "Published",
                  "Publish Date": new Date().toISOString().slice(0, 10),
                  "Publish To": to,
                  ...(to.includes("Slack") ? { "Slack Channel": channel } : {}),
                  ...(expires ? { Expires: expires } : {}),
                  Pinned: pinned,
                  "Posted By": me ? [me.id] : [],
                },
              },
              "Update deployed",
            );
            if (r?.ok) {
              setTitle("");
              setBody("");
            }
          }}
        >
          Deploy update
        </button>
      </div>
    </section>
  );
}
