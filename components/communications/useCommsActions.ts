"use client";

/* Communications actions — every change writes to the Communications table (live) or
   previews (example data): tWrite / tDraft / tSend / tClose / tReopen / upWrite … */
import { AT } from "@/lib/product-data";
import type { Announcement, Ticket } from "@/lib/product-types";
import { notAnOption } from "@/components/product-suite/logic";
import { useSuite } from "@/components/product-suite/useSuite";
import { aiDraft, customDefaults } from "./comms";

type TicketChange = Partial<Pick<Ticket, "status" | "intent" | "draft" | "needs">> & { gen?: boolean; deploy?: boolean; assigneeId?: string };
export type UpRecord = Omit<Announcement, "id">;

export function useCommsActions() {
  const { D, set, update, write, toast, api, built, cfg, closeAll, setModal } = useSuite();
  const tk = (id: string) => (D.tickets || []).find((t) => t.id === id);

  async function tWrite(t: Ticket, ch: TicketChange, label: string) {
    /* only write Status / Intent values the live Communications table actually has */
    const off = (["status", "intent"] as const).find((k) => k in ch && notAnOption(D, "comms." + k, ch[k]));
    if (off) {
      toast(`“${ch[off]}” isn't a Communications ${off === "status" ? "Status" : "Intent"} option in Airtable — nothing was saved`);
      return;
    }
    const m = AT.comms.f || {};
    const f: Record<string, unknown> = {};
    if ("status" in ch) f[m.status] = ch.status;
    if ("intent" in ch) f[m.intent] = ch.intent;
    if ("draft" in ch) f[m.draft] = ch.draft;
    if ("needs" in ch) f[m.needs] = ch.needs;
    if ("gen" in ch) f[m.gen] = ch.gen;
    if ("deploy" in ch) f[m.deploy] = ch.deploy;
    if ("assigneeId" in ch) f[m.assignee] = ch.assigneeId ? [ch.assigneeId] : [];
    const { gen: _g, deploy: _d, assigneeId, ...rest } = ch;
    void _g;
    void _d;
    const local: Partial<Ticket> = { ...rest };
    if (assigneeId !== undefined || "assigneeId" in ch) local.assignee = (D.team || []).find((x) => x.id === assigneeId)?.name || "";
    const apply = (d: typeof D) => {
      const x = (d.tickets || []).find((y) => y.id === t.id);
      if (x) Object.assign(x, local);
    };
    if (t.ex || !/^rec\w{14}$/.test(t.id)) {
      update(apply);
      toast(label + " · example message, not saved");
      return;
    }
    await write("comms", t.id, f, apply, label);
  }

  /** one update → Announcements (by field name; the table is on the Omni build list) */
  async function upWrite(id: string, rec: UpRecord, label: string) {
    const cur = (D.announcements || []).find((a) => a.id === id);
    const newId = "a" + Date.now();
    const apply = (d: typeof D) => {
      const list = (d.announcements = d.announcements || []);
      const c = list.find((a) => a.id === id);
      if (c) Object.assign(c, rec);
      else list.unshift({ id: newId, ...rec });
    };
    const badOpt = (
      [["announcements.page", rec.page, "Target Page"], ["announcements.type", rec.type, "Type"], ["announcements.status", rec.status, "Status"]] as const
    ).find(([k, val]) => notAnOption(D, k, val));
    if (badOpt) {
      toast(`“${badOpt[1]}” isn't an Announcements ${badOpt[2]} option in Airtable — nothing was saved`);
      return;
    }
    if (D.mode === "live" && built("Announcements")) {
      const fields: Record<string, unknown> = {
        Title: rec.title, Message: rec.body, Page: rec.page, Type: rec.type, "Send To": rec.to, Pinned: rec.pinned, "Publish At": rec.date, Status: rec.status,
      };
      if (rec.expires) fields["Expires On"] = rec.expires;
      try {
        const j = await api(cfg.ep.write, {
          method: "POST",
          body: JSON.stringify(cur && /^rec/.test(id) ? { table: "Announcements", recordId: id, fields } : { table: "Announcements", create: true, fields }),
        });
        if (!j.ok) throw new Error(j.error);
        update(apply);
        toast(label + " · saved");
      } catch (e) {
        toast("Save failed: " + (e instanceof Error ? e.message : String(e)));
      }
    } else {
      update(apply);
      toast(label + " · preview only, not saved");
    }
  }

  return {
    tWrite,
    upWrite,
    tq: (q: string) => set({ queue: q, ticket: null, tab: "inbox" }),
    tsrc: (s: string) => set({ src: s, ticket: null }),
    ticket: (id: string) => set({ ticket: id, confirmSend: null }),
    openTicket(id: string) {
      set({ tab: "inbox", queue: "all", src: "All", ticket: id });
      window.location.hash = "inbox";
    },
    async tDraft(id: string) {
      const t = tk(id);
      if (!t) return;
      if (D.mode === "live" && !t.ex) {
        await tWrite(t, { gen: true }, "AI draft requested — it appears here and in Gmail drafts in a minute");
        return;
      }
      const draft = aiDraft(t);
      update((d) => {
        const x = (d.tickets || []).find((y) => y.id === id);
        if (x) x.draft = draft;
      });
      toast("✨ Draft written · example — live, this ticks Generate Draft");
    },
    async tSave(id: string, text: string) {
      const t = tk(id);
      if (t) await tWrite(t, { draft: text }, "Draft saved");
    },
    tSend(id: string, text: string) {
      const t = tk(id);
      if (!t) return;
      if (!text.trim()) {
        toast("Write a reply first — or press “Write it for me”");
        return;
      }
      update((d) => {
        const x = (d.tickets || []).find((y) => y.id === id);
        if (x) x.draft = text;
      });
      set({ confirmSend: id });
    },
    tSendNo: () => set({ confirmSend: null }),
    async tSendYes(id: string) {
      const t = tk(id);
      if (!t) return;
      set({ confirmSend: null });
      await tWrite(t, { draft: t.draft, deploy: true, status: "Replied", needs: false }, "Reply sent");
    },
    async tClose(id: string) {
      const t = tk(id);
      if (t) await tWrite(t, { status: "Closed", needs: false }, "Closed");
    },
    async tReopen(id: string) {
      const t = tk(id);
      if (t) await tWrite(t, { status: "Open", needs: true }, "Reopened");
    },
    async tIntent(id: string, v: string) {
      const t = tk(id);
      if (t) await tWrite(t, { intent: v }, "Marked as " + (v === "Spam/Irrelevant" ? "noise" : v));
    },
    async tAssign(id: string, v: string) {
      const t = tk(id);
      if (t) await tWrite(t, { assigneeId: v }, v ? "Owner set" : "Owner removed");
    },
    tbox: (v: string) => set({ box: v, ticket: null }),
    trange(r: string) {
      set((s) => ({ range: r, ticket: null, ...(r === "custom" && !s.from ? customDefaults() : {}) }));
    },
    tfrom: (v: string) => set({ from: v }),
    tto: (v: string) => set({ to: v }),
    /* Updates */
    upNew: () => setModal({ kind: "up", id: null }),
    upEdit: (id: string) => setModal({ kind: "up", id }),
    upPage: (p: string) => set({ upPage: p }),
    upSt: (s: string) => set((st) => ({ upStatus: st.upStatus === s ? "All" : s })),
    upType: (t: string) => set({ upType: t }),
    async upSave(id: string, status: string, rec: Omit<UpRecord, "status" | "by" | "dept">) {
      if (!rec.title || !rec.body) {
        toast("Add a title and a message");
        return;
      }
      const full: UpRecord = { ...rec, status, by: D.me || "You", dept: rec.page === "Home" ? "" : rec.page };
      await upWrite(id, full, status === "Draft" ? "Draft saved" : "Published to " + (rec.page === "Home" ? "the Home page" : rec.page));
      closeAll();
    },
    async upPublish(id: string) {
      const a = (D.announcements || []).find((x) => x.id === id);
      if (a) {
        const { id: _i, ...rest } = a;
        void _i;
        await upWrite(id, { ...rest, status: "Published", date: new Date().toISOString() }, "Published");
      }
    },
    async upUnpub(id: string) {
      const a = (D.announcements || []).find((x) => x.id === id);
      if (a) {
        const { id: _i, ...rest } = a;
        void _i;
        await upWrite(id, { ...rest, status: "Draft" }, "Taken down — moved back to drafts");
      }
    },
  };
}
