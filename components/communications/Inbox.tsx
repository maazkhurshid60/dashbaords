"use client";

/* INBOX (vInbox, ticketPane, attachmentsBlock, rangeBar, srcIcon, intentPill) */
import { useState } from "react";
import { IconExternal } from "@/components/icons";
import { AT, atUrl } from "@/lib/product-data";
import type { Ticket } from "@/lib/product-types";
import { cx } from "@/lib/utils";
import { fmtDT } from "@/components/product-suite/format";
import { liveOpts, matchQ } from "@/components/product-suite/logic";
import { AirtableLink, ChipBtn, Empty, H5, Kpi, KpiRow, Pill, Seg, Small, selectCls } from "@/components/product-suite/primitives";
import { HiddenNote } from "@/components/product-suite/Shell";
import { useSuite } from "@/components/product-suite/useSuite";
import {
  ATT_IC, INTENT_TONE, INTENTS, RANGES, SRC, ageTone, ageTxt, attExt, autoClosed, bucket, fmtSize, gmailLink, hoursAgo, inRange, inboxes, intentLabel,
  rangeBounds, rangeLabel, visibleTickets, who,
} from "./comms";
import { useCommsActions } from "./useCommsActions";

export function SrcIcon({ ch, size = 30 }: { ch: string; size?: number }) {
  const s = SRC[ch] || { n: ch, ic: "•", c: "#9a9fad" };
  return (
    <span
      title={s.n}
      aria-label={s.n}
      className="grid shrink-0 place-items-center rounded-full text-white"
      style={{ background: s.c, width: size, height: size, fontSize: Math.round(size * 0.46) }}
    >
      {s.ic}
    </span>
  );
}
export const IntentPill = ({ i }: { i: string }) => (i ? <Pill tone={INTENT_TONE[i] || "plain"}>{intentLabel(i)}</Pill> : null);

/** Range picker shared by Inbox and Insights. */
export function RangeBar() {
  const { S } = useSuite();
  const c = useCommsActions();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Seg label="Date range" value={S.range} onChange={c.trange} options={RANGES.map(([k, l]) => ({ id: k, label: l }))} />
      {S.range === "custom" && (
        <>
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            From <input type="date" className={selectCls} value={S.from} onChange={(e) => c.tfrom(e.target.value)} />
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            To <input type="date" className={selectCls} value={S.to} onChange={(e) => c.tto(e.target.value)} />
          </label>
        </>
      )}
    </div>
  );
}
export function useRange() {
  const { S } = useSuite();
  const b = rangeBounds(S.range, S.from, S.to);
  return { b, label: rangeLabel(S.range, b) };
}

export function InboxView() {
  const { D, S, q, has } = useSuite();
  const c = useCommsActions();
  const { b, label } = useRange();
  const all = visibleTickets(D, has).filter((t) => inRange(t, b));
  const counts: Record<string, number> = { needs: 0, drafts: 0, answered: 0, closed: 0, all: all.length };
  all.forEach((t) => {
    counts[bucket(t)]++;
    if (bucket(t) === "needs" && t.draft) counts.drafts++;
  });
  const inQ = (t: Ticket) => S.queue === "all" || (S.queue === "drafts" ? bucket(t) === "needs" && !!t.draft : bucket(t) === S.queue);
  const list = all
    .filter(inQ)
    .filter((t) => S.src === "All" || t.channel === S.src)
    .filter((t) => S.box === "All" || String(t.to).includes(S.box))
    .filter((t) => matchQ(q, t.subject, t.from, t.body, t.notes))
    .sort((a, b2) => (S.queue === "needs" || S.queue === "drafts" ? a.date.localeCompare(b2.date) : b2.date.localeCompare(a.date)));
  const selId = S.ticket && all.some((t) => t.id === S.ticket) ? S.ticket : list[0]?.id || null;
  const sel = all.find((t) => t.id === selId);
  const srcs = ["All", ...Object.keys(SRC).filter((k) => all.some((t) => t.channel === k) || (k !== "SMS" && (k !== "Community" || has("Communications.Channel: Community"))))];
  const boxes = inboxes(visibleTickets(D, has));
  return (
    <div className="space-y-6">
      <KpiRow>
        <Kpi num={counts.needs} lbl="Needs a reply" explain="waiting on a person" onClick={() => c.tq("needs")} active={S.queue === "needs"} tone={counts.needs ? "bad" : "good"} />
        <Kpi num={counts.drafts} lbl="AI draft ready" explain="review, edit, send" onClick={() => c.tq("drafts")} active={S.queue === "drafts"} tone="info" />
        <Kpi num={counts.answered} lbl="Answered" explain={"Status Replied · " + label} onClick={() => c.tq("answered")} active={S.queue === "answered"} tone="good" />
        <Kpi num={all.filter(autoClosed).length} lbl="Closed automatically" explain={"noise the sweep cleared · " + label} onClick={() => c.tq("closed")} active={S.queue === "closed"} tone="purple" />
      </KpiRow>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Seg
          label="Queue"
          value={S.queue}
          onChange={c.tq}
          options={(
            [
              ["needs", "Needs a reply"],
              ["drafts", "AI drafts"],
              ["answered", "Answered"],
              ["closed", "Closed"],
              ["all", "All"],
            ] as const
          ).map(([k, l]) => ({
            id: k,
            label: (
              <>
                {l} <span className="text-muted">{counts[k]}</span>
              </>
            ),
          }))}
        />
        <RangeBar />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">From</span>
          {srcs.map((k) => (
            <ChipBtn key={k} on={S.src === k} onClick={() => c.tsrc(k)}>
              {k !== "All" && <span className="size-2 rounded-full" style={{ background: SRC[k].c }} />}
              {k === "All" ? "All sources" : SRC[k].ic + " " + SRC[k].n}
              <span className="opacity-70">{k === "All" ? all.length : all.filter((t) => t.channel === k).length}</span>
            </ChipBtn>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {boxes.length > 1 && (
            <select aria-label="Gmail account" className={selectCls} value={S.box} onChange={(e) => c.tbox(e.target.value)}>
              <option value="All">All Gmail accounts</option>
              {boxes.map((bx) => (
                <option key={bx}>{bx}</option>
              ))}
            </select>
          )}
          <Small>
            {all.length} messages · {label}
          </Small>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="card scroll-thin max-h-[720px] min-w-0 overflow-y-auto p-2">
          {list.length ? (
            list.map((t) => {
              const h = hoursAgo(t.date);
              const bk = bucket(t);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={selId === t.id}
                  onClick={() => c.ticket(t.id)}
                  className={cx("flex w-full gap-3 rounded-2xl p-3 text-left transition", selId === t.id ? "bg-brand-soft" : "hover:bg-plane")}
                >
                  <SrcIcon ch={t.channel} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span className={cx("truncate text-[12.5px]", bk === "needs" ? "font-extrabold" : "font-semibold")}>{who(t.from)}</span>
                      <span className={cx("shrink-0 text-[11px] font-bold", bk === "needs" ? ageTone(h) : "text-muted")}>{ageTxt(h)}</span>
                    </div>
                    <div className={cx("truncate text-[12.5px]", bk === "needs" ? "font-bold text-ink" : "text-ink-2")}>{t.subject}</div>
                    <div className="truncate text-[11.5px] text-muted">{(t.notes || t.body || "").replace(/^\[.*?\]\s*/, "").slice(0, 110)}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <IntentPill i={t.intent} />
                      {t.intent === "Complaint" && bk === "needs" && <Pill tone="bad">Urgent</Pill>}
                      {bk === "needs" && t.draft && <Pill tone="info">✨ Draft ready</Pill>}
                      {t.assignee && <Pill>→ {t.assignee}</Pill>}
                      {(t.attachments || []).length > 0 && <Pill>📎 {t.attachments!.length}</Pill>}
                      {t.ex && <Pill tone="warn">Example</Pill>}
                      {t.votes ? <Pill>▲ {t.votes}</Pill> : null}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <Empty className="m-2 py-10">{S.queue === "needs" ? "✓ Nothing needs a reply" : "Nothing here"}</Empty>
          )}
        </div>
        <div className="card min-w-0 p-5">{sel ? <TicketPane key={sel.id + "|" + sel.draft} t={sel} /> : <Empty className="py-16">Pick a message on the left</Empty>}</div>
      </div>
      <HiddenNote list={[["Communications.Channel: Community", "Community help board messages"]]} />
    </div>
  );
}

function AttachmentsBlock({ t }: { t: Ticket }) {
  const at = t.attachments || [];
  if (!at.length) return null;
  return (
    <>
      <H5>Attachments · {at.length}</H5>
      <div className="grid gap-2">
        {at.map((a) => {
          const e = attExt(a.name);
          const img = ATT_IC[e] === "IMG" && (a.thumb || a.url);
          return (
            <div key={a.name} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-2.5">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(a.thumb || a.url) as string} alt="" className="size-10 rounded-lg object-cover" />
              ) : (
                <span className="grid size-10 place-items-center rounded-lg bg-plane text-[10px] font-black text-ink-2">{ATT_IC[e] || "FILE"}</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-bold" title={a.name}>
                  {a.name}
                </div>
                <Small>{[e.toUpperCase(), fmtSize(a.size)].filter(Boolean).join(" · ")}</Small>
              </div>
              {a.url ? (
                <span className="flex gap-1.5">
                  <a className="btn btn-sm" href={a.url} target="_blank" rel="noopener">
                    Open
                  </a>
                  <a className="btn btn-sm" href={a.url} download={a.name}>
                    Download
                  </a>
                </span>
              ) : (
                <a className="btn btn-sm" href={gmailLink(t)} target="_blank" rel="noopener" title="This file hasn't been copied into Airtable yet — it opens from the Gmail message">
                  Open in Gmail <IconExternal width={12} height={12} />
                </a>
              )}
            </div>
          );
        })}
      </div>
      {t.attSummary && <Small className="mt-2">✨ {t.attSummary}</Small>}
    </>
  );
}

function TicketPane({ t }: { t: Ticket }) {
  const { D, S } = useSuite();
  const c = useCommsActions();
  const [reply, setReply] = useState(t.draft || "");
  const b = bucket(t);
  const team = D.team || [];
  const note = (t.notes || "")
    .replace(/^\[SUCANT[^\]]*\]\s*/, "")
    .replace(/Intent and needs-response are recorded[\s\S]*$/, "")
    .trim();
  const srcName = SRC[t.channel]?.n || t.channel;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <SrcIcon ch={t.channel} size={18} /> {srcName} · {fmtDT(t.date)}
          </div>
          <div className="mt-1 text-[17px] font-extrabold leading-snug">{t.subject}</div>
          <div className="mt-0.5 break-words text-[12px] text-muted">
            From <b className="text-ink">{who(t.from)}</b> <span>{(String(t.from).match(/<(.*?)>/) || [])[1] || ""}</span> · to {t.to}
          </div>
        </div>
        <Pill tone={b === "needs" ? "bad" : b === "answered" ? "good" : "plain"}>{b === "needs" ? "Needs a reply" : b === "answered" ? "Answered" : "Closed"}</Pill>
      </div>
      <div className="my-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          About
          <select className={selectCls} value={t.intent} onChange={(e) => void c.tIntent(t.id, e.target.value)}>
            {liveOpts(D, "comms.intent", INTENTS, t.intent).map((i) => (
              <option key={i} value={i}>
                {intentLabel(i)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          Owner
          <select className={selectCls} value={team.find((m) => m.name === t.assignee)?.id || ""} onChange={(e) => void c.tAssign(t.id, e.target.value)}>
            <option value="">Nobody yet</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        {t.ex && <Pill tone="warn">Example message</Pill>}
        {t.reopened && <Pill tone="warn">Reopened</Pill>}
      </div>
      {note && (
        <div className="rounded-2xl bg-brand-soft/60 p-3">
          <div className="text-[12px] font-bold">
            ✨ What this is about <span className="font-medium text-muted">· AI summary from the sweep</span>
          </div>
          <div className="mt-1 whitespace-pre-wrap text-[12.5px] text-ink-2">{note.slice(0, 900)}</div>
        </div>
      )}
      <H5>
        Message{" "}
        {t.channel === "Email" && (
          <a className="ml-1 normal-case tracking-normal text-brand" href={gmailLink(t)} target="_blank" rel="noopener">
            open in Gmail ↗
          </a>
        )}
      </H5>
      <div className="scroll-thin max-h-72 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-plane p-3 text-[13px] leading-relaxed text-ink">
        {t.body || "(The full message is in Gmail — this row only has the subject.)"}
      </div>
      <AttachmentsBlock t={t} />
      {(b !== "closed" || t.draft) && (
        <>
          <H5>
            Your reply{" "}
            {t.draftLink && (
              <a className="ml-1 normal-case tracking-normal text-brand" href={t.draftLink} target="_blank" rel="noopener">
                open the Gmail draft ↗
              </a>
            )}
          </H5>
          <textarea
            className="field"
            rows={6}
            aria-label="Your reply"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t.channel === "Email" ? "Write a reply, or let AI write the first draft…" : "Write a reply…"}
          />
        </>
      )}
      {S.confirmSend === t.id && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-warn-soft p-3">
          <div className="text-[12.5px]">
            <b>Send this reply?</b> It goes out through the Deploy Response automation {t.channel === "Email" ? "from Gmail" : "to the " + srcName}.
          </div>
          <div className="flex gap-1.5">
            <button type="button" className="btn btn-sm btn-brand" onClick={() => void c.tSendYes(t.id)}>
              Yes, send
            </button>
            <button type="button" className="btn btn-sm" onClick={c.tSendNo}>
              Not yet
            </button>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {b !== "closed" && (
          <>
            <button type="button" className="btn" onClick={() => void c.tDraft(t.id)}>
              ✨ {t.draft ? "Rewrite" : "Write it for me"}
            </button>
            <button type="button" className="btn btn-brand" onClick={() => c.tSend(t.id, reply)}>
              Send reply
            </button>
          </>
        )}
        <button type="button" className="btn" onClick={() => void c.tSave(t.id, reply)}>
          Save draft
        </button>
        {b === "closed" ? (
          <button type="button" className="btn" onClick={() => void c.tReopen(t.id)}>
            Reopen
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => void c.tClose(t.id)}>
            Close — no reply needed
          </button>
        )}
        <span className="sm:ml-auto">
          <AirtableLink href={atUrl(AT.comms.id, t.id)} />
        </span>
      </div>
    </div>
  );
}
