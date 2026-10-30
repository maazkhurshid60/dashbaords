"use client";

/* UPDATES (vUpdates + upModal) — Announcements for the Home page and each department page. */
import { useState } from "react";
import { Modal } from "@/components/ui";
import { DAY, TODAY, iso } from "@/lib/product-data";
import type { Announcement } from "@/lib/product-types";
import { cx } from "@/lib/utils";
import { fmtD, fmtDT } from "@/components/product-suite/format";
import { matchQ } from "@/components/product-suite/logic";
import { ChipBtn, Empty, H5, Kpi, KpiRow, Pill, Small } from "@/components/product-suite/primitives";
import { Field } from "@/components/product-suite/drawers";
import { HiddenNote } from "@/components/product-suite/Shell";
import { useSuite } from "@/components/product-suite/useSuite";
import { UP_DESTS, UP_PAGES, UP_ST_TONE, UP_TYPE_TONE, UP_TYPES, tidy, upStatus } from "./comms";
import { useCommsActions } from "./useCommsActions";

export function UpdatesView() {
  const { D, S, q, has, act } = useSuite();
  const c = useCommsActions();
  if (!has("Announcements"))
    return (
      <div className="space-y-6">
        <section className="card px-6 py-9 text-center">
          <div className="text-[16px] font-extrabold">Updates need the Announcements table in Airtable</div>
          <p className="mx-auto mb-4 mt-1.5 max-w-[560px] text-[12.5px] text-muted">
            Every update — which page it&apos;s on, who posted it, when it goes live and expires, and where else it was sent (Slack, email) — is saved there. Until
            Omni builds it, this tab stays empty.
          </p>
          <button type="button" className="btn btn-brand" onClick={act.preview}>
            Preview the Updates design
          </button>
        </section>
        <HiddenNote list={[["Announcements", "Updates for the Home page and every department page"]]} />
      </div>
    );
  const all = (D.announcements || []).map((a) => ({ ...a, st: upStatus(a) }));
  const list = all
    .filter((a) => (S.upPage === "All" || a.page === S.upPage) && (S.upStatus === "All" || a.st === S.upStatus) && (S.upType === "All" || a.type === S.upType) && matchQ(q, a.title, a.body, a.by, a.page))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.date || "").localeCompare(a.date || ""));
  const cnt = (k: string) => all.filter((a) => a.st === k).length;
  const wkEnd = iso(TODAY.getTime() + 7 * DAY);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Small>
          Posting as <b className="text-ink">{D.me || "Isis Darks"}</b> · {D.meRole || "Admin — can post to every page"}
        </Small>
        <button type="button" className="btn btn-brand" onClick={c.upNew}>
          + Create new
        </button>
      </div>
      <KpiRow>
        <Kpi num={cnt("Live")} lbl="Live now" explain="showing on intranet pages" onClick={() => c.upSt("Live")} active={S.upStatus === "Live"} tone="good" />
        <Kpi num={cnt("Scheduled")} lbl="Scheduled" explain="go live on their date" onClick={() => c.upSt("Scheduled")} active={S.upStatus === "Scheduled"} tone="info" />
        <Kpi num={cnt("Draft")} lbl="Drafts" explain="not published yet" onClick={() => c.upSt("Draft")} active={S.upStatus === "Draft"} tone="warn" />
        <Kpi
          num={all.filter((a) => a.st === "Live" && a.expires && a.expires.slice(0, 10) <= wkEnd).length}
          lbl="Expiring this week"
          explain="come down automatically"
          onClick={() => c.upSt("Live")}
          tone="purple"
        />
      </KpiRow>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
        <nav className="card p-3" aria-label="Pages">
          <H5 first className="px-2 pt-1">
            Pages
          </H5>
          {["All", ...UP_PAGES(D)].map((p) => {
            const n = p === "All" ? all.length : all.filter((a) => a.page === p).length;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={S.upPage === p}
                onClick={() => c.upPage(p)}
                className={cx("flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-semibold", S.upPage === p ? "bg-brand-soft" : "hover:bg-plane")}
              >
                <span className="truncate">{p === "All" ? "All pages" : p === "Home" ? "⌂ Home page" : p}</span>
                <b className={n ? "text-brand" : "text-muted"}>{n}</b>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {["All", "Live", "Scheduled", "Draft", "Expired"].map((k) => (
              <ChipBtn key={k} on={S.upStatus === k} onClick={() => c.upSt(k)}>
                {k === "All" ? "Any status" : k}
              </ChipBtn>
            ))}
            <span className="w-2" />
            {["All", ...UP_TYPES].map((k) => (
              <ChipBtn key={k} on={S.upType === k} onClick={() => c.upType(k)}>
                {k === "All" ? "Any type" : k}
              </ChipBtn>
            ))}
          </div>
          {list.length ? (
            list.map((a) => (
              <article key={a.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {a.pinned && <Pill tone="bad">📌 Pinned</Pill>}
                    <Pill>{a.page === "Home" ? "⌂ Home" : a.page}</Pill>
                    <Pill tone={UP_TYPE_TONE[a.type] || "plain"}>{a.type || "News"}</Pill>
                    <Pill tone={UP_ST_TONE[a.st]}>{a.st}</Pill>
                  </div>
                  <Small>
                    {a.st === "Scheduled" ? "Goes live " : ""}
                    {fmtDT(a.date)}
                    {a.expires ? " · until " + fmtD(a.expires.slice(0, 10)) : ""}
                  </Small>
                </div>
                <div className="mb-1 mt-2 text-[15px] font-extrabold">{a.title}</div>
                <div className="whitespace-pre-wrap text-[12.5px] text-ink-2">{a.body}</div>
                {(a.files || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.files!.map((f) => (
                      <Pill key={f}>📎 {f}</Pill>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Small>
                      by <b>{a.by || "—"}</b>
                      {a.dept ? " · " + a.dept : ""}
                    </Small>
                    {(a.to || []).map((d) => (
                      <Pill key={d} tone={a.st === "Live" ? "good" : "plain"}>
                        {a.st === "Live" ? "✓ " : ""}
                        {d}
                      </Pill>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" className="btn btn-sm" onClick={() => c.upEdit(a.id)}>
                      Edit
                    </button>
                    {a.st === "Draft" ? (
                      <button type="button" className="btn btn-sm btn-brand" onClick={() => void c.upPublish(a.id)}>
                        Publish
                      </button>
                    ) : a.st === "Live" ? (
                      <button type="button" className="btn btn-sm" onClick={() => void c.upUnpub(a.id)}>
                        Take down
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <Empty>No updates match these filters.</Empty>
          )}
        </div>
      </div>
      <HiddenNote list={[["Announcements", "Updates for the Home page and every department page"]]} />
    </div>
  );
}

/* ---------------- create / edit modal ---------------- */
const toLocalInput = (s: string) => (s ? s.slice(0, 16) : "");
export function UpModal() {
  const { modal, D, closeAll } = useSuite();
  if (modal?.kind !== "up") return null;
  const a = modal.id ? (D.announcements || []).find((x) => x.id === modal.id) : undefined;
  return <UpModalBody key={modal.id || "new"} a={a} onClose={closeAll} />;
}
function UpModalBody({ a, onClose }: { a?: Announcement; onClose: () => void }) {
  const { D, toast } = useSuite();
  const c = useCommsActions();
  const [v, setV] = useState({
    title: a?.title || "",
    body: a?.body || "",
    page: a?.page || "Home",
    type: a?.type || "News",
    to: a?.to || ([] as string[]),
    pinned: !!a?.pinned,
    date: toLocalInput(a?.date || ""),
    expires: a?.expires ? a.expires.slice(0, 10) : "",
  });
  const save = (status: string) =>
    void c.upSave(a?.id || "", status, {
      title: v.title.trim(),
      body: v.body.trim(),
      page: v.page,
      type: v.type,
      to: v.to,
      pinned: v.pinned,
      date: v.date ? new Date(v.date).toISOString() : new Date().toISOString(),
      expires: v.expires || "",
    });
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={a ? "Edit update" : "Create new update"}
      subtitle="Shows on the page you pick. Department leads can post to their department page; admins can post anywhere."
      footer={
        <>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (!v.body.trim()) {
                toast("Write a message first");
                return;
              }
              setV((o) => ({ ...o, ...tidy(o.body, o.title) }));
              toast("✨ Tidied · example — live, the ANT Connector rewrites it");
            }}
          >
            ✨ Tidy the wording
          </button>
          <button type="button" className="btn" onClick={() => save("Draft")}>
            Save draft
          </button>
          <button type="button" className="btn btn-brand" onClick={() => save("Published")}>
            {a ? "Save & publish" : "Publish"}
          </button>
        </>
      }
    >
      <Field label="Title">
        <input autoFocus className="field" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="e.g. Launch tests are ready to pick up" />
      </Field>
      <Field label="Message">
        <textarea className="field" rows={5} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} placeholder="What changed, what people should do, and by when." />
      </Field>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label="Post on page">
          <select className="field" value={v.page} onChange={(e) => setV({ ...v, page: e.target.value })}>
            {UP_PAGES(D).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select className="field" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>
            {UP_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Go live">
          <input className="field" type="datetime-local" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
          <Small className="mt-1">blank = now</Small>
        </Field>
        <Field label="Take down on">
          <input className="field" type="date" value={v.expires} onChange={(e) => setV({ ...v, expires: e.target.value })} />
          <Small className="mt-1">blank = stays up</Small>
        </Field>
      </div>
      <div className="field-label mt-4">Also send to</div>
      <div className="flex flex-wrap gap-2">
        {UP_DESTS.map((d) => (
          <label key={d} className="chip cursor-pointer">
            <input
              type="checkbox"
              className="accent-brand"
              checked={v.to.includes(d)}
              onChange={() => setV({ ...v, to: v.to.includes(d) ? v.to.filter((x) => x !== d) : [...v.to, d] })}
            />
            {d}
          </label>
        ))}
      </div>
      <label className="chip mt-3 cursor-pointer">
        <input type="checkbox" className="accent-brand" checked={v.pinned} onChange={(e) => setV({ ...v, pinned: e.target.checked })} /> 📌 Pin to the top of the page
      </label>
    </Modal>
  );
}
