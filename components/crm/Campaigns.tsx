"use client";

import { useState } from "react";
import { ago, fmtDate, fmtDateTime, pct, ts } from "@/lib/crm-logic";
import { Chip, Com, Drawer, Empty, H, Stat } from "./bits";
import { useCrm } from "./store";

/* Campaigns tab (COM-32 / COM-36): Snov.io + Brevo connection bar, channel/status/date filters,
   status cards, campaign table → drawer with steps, activity, Launch / Pause / Resume. */
export function Campaigns() {
  const { D, setPanel, isAdmin, toast } = useCrm();
  const [ch, setCh] = useState("");
  const [st, setSt] = useState("");
  const [from, setFrom] = useState("");
  const list = D.campaigns.filter((c) => (!ch || c.channel === ch) && (!st || c.status === st) && (!from || ts(c.started) >= ts(from)));
  const sum = (k: "prospects" | "sent" | "opened" | "clicked" | "replied" | "bounced") => list.reduce((s, c) => s + c[k], 0);
  const sent = sum("sent");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {["Snov.io", "Brevo"].map((p) => {
          const src = D.sources.find((s) => s.platform === p);
          return (
            <div key={p} className="card flex flex-1 items-center gap-3 px-4 py-3 text-[13px]">
              <span className={`size-2.5 rounded-full ${src?.status === "Connected" ? "bg-good" : "bg-warn"}`} />
              <b>{p}</b>
              <span className="text-ink-2">{src ? `${src.status}${src.lastSynced ? ` · synced ${ago(src.lastSynced)}` : ""}` : "Not connected"}</span>
              <span className="text-[12px] text-muted">{p === "Snov.io" ? "Cold outreach sequences" : "Marketing / newsletters"} → Email Campaigns + Campaign Activity</span>
              {isAdmin && (
                <button type="button" className="btn btn-sm ml-auto" onClick={() => toast(`${p} isn't connected yet — needs an API key`)}>
                  Connect
                </button>
              )}
            </div>
          );
        })}
        <Com id="COM-32" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="seg">
          {["", "Snov.io", "Brevo"].map((x) => (
            <button key={x} type="button" aria-pressed={ch === x} onClick={() => setCh(x)}>
              {x || "All channels"}
            </button>
          ))}
        </div>
        <div className="seg">
          {["", "Active", "Paused", "Draft", "Completed"].map((x) => (
            <button key={x} type="button" aria-pressed={st === x} onClick={() => setSt(x)}>
              {x || "All"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-[12.5px]">
          Started after <input className="field w-auto py-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <Com id="COM-36" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Stat label="Prospects" value={sum("prospects")} />
        <Stat label="Sent" value={sent} />
        <Stat label="Open rate" value={`${pct(sum("opened"), sent)}%`} />
        <Stat label="Click rate" value={`${pct(sum("clicked"), sent)}%`} />
        <Stat label="Reply rate" value={`${pct(sum("replied"), sent)}%`} />
        <Stat label="Bounce rate" value={`${pct(sum("bounced"), sent)}%`} />
      </div>
      <div className="card scroll-thin max-h-[640px] overflow-auto">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-line text-left text-[11.5px] text-muted">
              {["Campaign", "Channel", "Status", "Steps", "Prospects", "Sent", "Opened", "Clicked", "Replied", "Bounced", "Owner"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="cursor-pointer border-b border-line hover:bg-plane" onClick={() => setPanel({ kind: "campaign", id: c.id })}>
                <td className="px-3 py-2 font-semibold">{c.name}</td>
                <td className="px-3 py-2">
                  <Chip tone={c.channel === "Brevo" ? "teal" : "brand"}>{c.channel || "—"}</Chip>
                </td>
                <td className="px-3 py-2">{c.status}</td>
                <td className="px-3 py-2">{c.steps ? c.steps.split(/\n+/).filter(Boolean).length : 0}</td>
                {(["prospects", "sent", "opened", "clicked", "replied", "bounced"] as const).map((k) => (
                  <td key={k} className="px-3 py-2">
                    {c[k]}
                  </td>
                ))}
                <td className="px-3 py-2">{c.ownerIds.map((o) => D.members.find((m) => m.id === o)?.name).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <div className="p-4">
            <Empty>{D.campaigns.length ? "No campaigns match." : "No rows in Airtable › Email Campaigns yet — they appear once Snov.io / Brevo sync is connected."}</Empty>
          </div>
        )}
      </div>
    </div>
  );
}

export function CampaignDrawer({ id }: { id: string }) {
  const { D, setPanel, write, isAdmin, busy, go } = useCrm();
  const c = D.campaigns.find((x) => x.id === id);
  if (!c) return null;
  const ev = D.campaignEvents.filter((e) => e.campaignIds.includes(c.id)).sort((a, b) => ts(b.at) - ts(a.at));
  return (
    <Drawer
      title={c.name}
      sub={`${c.channel} · ${c.status}${c.started ? ` · started ${fmtDate(c.started)}` : ""}`}
      onClose={() => setPanel(null)}
      actions={
        isAdmin ? (
          <>
            {c.status === "Draft" && (
              <button type="button" className="btn btn-sm btn-brand" disabled={busy} onClick={() => write("snovAction", { id: c.id, verb: "launch" }, "Campaign set Active")}>
                Launch
              </button>
            )}
            {c.status === "Active" && (
              <button type="button" className="btn btn-sm" disabled={busy} onClick={() => write("snovAction", { id: c.id, verb: "pause" }, "Campaign paused")}>
                Pause
              </button>
            )}
            {c.status === "Paused" && (
              <button type="button" className="btn btn-sm btn-brand" disabled={busy} onClick={() => write("snovAction", { id: c.id, verb: "resume" }, "Campaign resumed")}>
                Resume
              </button>
            )}
          </>
        ) : undefined
      }
    >
      <section>
        <H>Workflow steps</H>
        {c.steps ? (
          <ol className="list-decimal space-y-1 pl-5 text-[13px]">
            {c.steps.split(/\n+/).filter(Boolean).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        ) : (
          <Empty>No steps recorded.</Empty>
        )}
      </section>
      <section>
        <H>Activity</H>
        {ev.slice(0, 60).map((e) => (
          <div key={e.id} className="flex items-center gap-2 border-b border-line py-1.5 text-[13px]">
            <Chip tone={e.type === "Replied" ? "good" : e.type === "Bounced" ? "bad" : "gray"}>{e.type}</Chip>
            <span className="flex-1 truncate">{e.email || e.event}</span>
            {e.type === "Replied" && e.msgIds[0] && (
              <button type="button" className="text-[12px] text-brand underline" onClick={() => go("Inbox", { inboxView: "all", inboxMsg: e.msgIds[0] })}>
                Open in Inbox
              </button>
            )}
            <span className="text-muted">{fmtDateTime(e.at)}</span>
          </div>
        ))}
        {!ev.length && <Empty>No campaign activity yet.</Empty>}
      </section>
      <section className="text-[13px] text-ink-2">
        <H>Details</H>
        <div>Recipient list: {c.list || "—"}</div>
        <div>Unsubscribed: {c.unsubscribed}</div>
        <div>Last synced: {c.lastSynced ? fmtDateTime(c.lastSynced) : "never"}</div>
        {c.notes && <p className="mt-1 whitespace-pre-wrap">{c.notes}</p>}
      </section>
    </Drawer>
  );
}
