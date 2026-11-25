import type { Metadata } from "next";
import type { ReactNode } from "react";
import { loadPics } from "@/lib/pics-live";
import { accessFor, getShare } from "@/lib/pics-shares";
import type { PicsRecord } from "@/lib/types";

/* A shared P.I.C.S, opened from a link made by the Share dialog (OPS-22).
   Rendered without the app shell (see AppShell) and reachable without the team password (see proxy.ts), so this
   page does its own checks: the token must exist, not be expired, and either carry a personal key (?k=) or the
   share must be "anyone with the link". It only ever renders the sections the sender ticked under "Include". */
export const metadata: Metadata = { title: "Shared P.I.C.S", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const fmt = (d?: string | null) => (d ? new Date(d.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—");

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-shell px-4">
      <div className="card w-full max-w-md space-y-2 p-8">
        <div className="eyebrow text-brand">VCG Intranet</div>
        <h1 className="text-[22px] font-extrabold">{title}</h1>
        <p className="text-[13.5px] text-ink-2">{children}</p>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-[15px] font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

const Empty = ({ what }: { what: string }) => <p className="text-[13px] text-muted">No {what} yet.</p>;

export default async function SharedPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ k?: string }> }) {
  const [{ token }, { k }] = await Promise.all([params, searchParams]);

  let lookup;
  try {
    lookup = await getShare(token);
  } catch {
    return <Notice title="Something went wrong">We couldn&apos;t open this link right now. Please try again in a moment.</Notice>;
  }
  if (!lookup.ok) {
    return lookup.reason === "expired" ? (
      <Notice title="This link has expired">Ask the person who shared it with you to send a new one.</Notice>
    ) : (
      <Notice title="Link not found">This link isn&apos;t valid. Check that you copied all of it.</Notice>
    );
  }
  const share = lookup.share;
  const access = accessFor(share, k);
  if (!access) {
    return <Notice title="This is private">This page is only for the people it was shared with. Open the personal link you were sent.</Notice>;
  }
  if (share.kind !== "pics") {
    return <Notice title="Not available yet">Shared review rounds can&apos;t be opened from a link yet.</Notice>;
  }

  let rec: PicsRecord | undefined;
  try {
    rec = (await loadPics()).data.records.find((r) => r.id === share.targetId);
  } catch {
    /* handled below */
  }
  if (!rec) return <Notice title="Nothing to show">The shared item couldn&apos;t be found. It may have been removed.</Notice>;

  const inc = share.include;
  const tasks = rec.roadmapRows.filter((r) => /task/i.test(r.type));
  const phases = rec.roadmapRows.filter((r) => !/task/i.test(r.type));
  const done = rec.checklist.filter((c) => c.status === "done").length;
  const late = rec.checklist.filter((c) => c.status === "overdue").length;

  return (
    <main className="min-h-screen bg-shell px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="space-y-2">
          <div className="eyebrow text-brand">Shared with {access.who ?? "you"} · VCG Intranet</div>
          <h1 className="text-[26px] font-extrabold leading-tight">{rec.name}</h1>
          <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
            <span className="rounded-full bg-white px-3 py-1">{rec.type}</span>
            <span className="rounded-full bg-white px-3 py-1">{rec.stage}</span>
            <span className="rounded-full bg-white px-3 py-1">Your access: {access.role}</span>
            <span className="rounded-full bg-white px-3 py-1">{share.expiresAt ? `Link works until ${fmt(share.expiresAt)}` : "Link doesn't expire"}</span>
          </div>
          <p className="text-[12.5px] text-muted">
            View only{access.role !== "Viewer" ? ` — ${access.role.toLowerCase()} actions from a shared link aren't available yet` : ""}.
          </p>
          {share.message && <p className="rounded-xl bg-white p-3 text-[13px] text-ink-2">{share.message}</p>}
        </header>

        {inc["Overview"] && <Section title="Overview">{rec.overview ? <p className="whitespace-pre-line text-[13.5px] text-ink-2">{rec.overview}</p> : <Empty what="overview" />}</Section>}

        {inc["Timeline & KPIs"] && (
          <Section title="Timeline & KPIs">
            <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
              {[
                ["Start", fmt(rec.start)],
                ["End", fmt(rec.end)],
                ["Checklist done", `${done} of ${rec.checklist.length}`],
                ["Overdue", String(late)],
              ].map(([a, b]) => (
                <div key={a}>
                  <dt className="text-muted">{a}</dt>
                  <dd className="font-bold">{b}</dd>
                </div>
              ))}
            </dl>
            {rec.leads.length > 0 && <p className="text-[13px] text-ink-2">Leads: {rec.leads.map((l) => l.name || l.i).join(", ")}</p>}
          </Section>
        )}

        {inc["Roadmap & phases"] && (
          <Section title="Roadmap & phases">
            {phases.length ? <RowList rows={phases} /> : <Empty what="roadmap items" />}
          </Section>
        )}

        {inc["Tasks"] && <Section title="Tasks">{tasks.length ? <RowList rows={tasks} /> : <Empty what="tasks" />}</Section>}

        {inc["Checklists"] && (
          <Section title="Checklists">
            {rec.checklist.length ? (
              <ul className="divide-y divide-line text-[13px]">
                {rec.checklist.map((c, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 py-2">
                    <span>{c.item}</span>
                    <span className="shrink-0 text-muted">
                      {c.status === "done" ? "Done" : c.status === "overdue" ? "Overdue" : "Upcoming"} · {fmt(c.due)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty what="checklist items" />
            )}
          </Section>
        )}

        {inc["Feedback rounds"] && (
          <Section title="Feedback rounds">
            {rec.reviewRounds?.length ? (
              <ul className="divide-y divide-line text-[13px]">
                {rec.reviewRounds.map((r, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 py-2">
                    <span>{r.name}</span>
                    <span className="shrink-0 text-muted">
                      {r.status}
                      {r.due ? ` · ${fmt(r.due)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty what="feedback rounds" />
            )}
          </Section>
        )}
      </div>
    </main>
  );
}

function RowList({ rows }: { rows: PicsRecord["roadmapRows"] }) {
  return (
    <ul className="divide-y divide-line text-[13px]">
      {rows.map((r, i) => (
        <li key={i} className="flex items-start justify-between gap-3 py-2">
          <span>
            {r.label}
            <span className="ml-2 text-muted">{[r.type, r.phase].filter(Boolean).join(" · ")}</span>
          </span>
          <span className="shrink-0 text-muted">
            {r.status ? `${r.status} · ` : ""}
            {fmt(r.date)}
          </span>
        </li>
      ))}
    </ul>
  );
}
