import "server-only";
import { randomBytes } from "node:crypto";
import { AirtableError, createRecord, listRecords, str } from "./airtable.server";
import { bad, text } from "./pics-airtable";
import { PICS_TABLES } from "./pics-live";
import { escHtml, sendEmail, type EmailResult } from "./email.server";

/* P.I.C.S sharing (OPS-22): validate the Share dialog payload, store the share, email the invitees.

   STORAGE
   • With PICS_SHARES_TABLE_ID set → one row per share in that Airtable table (field names in SHARE_FIELDS).
   • Without it → shares are kept in server memory. That is only for local development (lost on restart, not
     shared between serverless instances), so in production a missing table is refused instead of pretending.

   Airtable table "P.I.C.S Shares" (create once, then set PICS_SHARES_TABLE_ID=tbl…):
     Token (single line text, primary) · Kind (single line) · Target Record ID (single line) · Target Name (single line)
     Invitees (long text, JSON) · Access (single line) · Expires At (date) · Include (long text, JSON)
     Message (long text) · Email Results (long text, JSON) */

export const ROLES = ["Viewer", "Commenter", "Editor"] as const;
export type Role = (typeof ROLES)[number];

const EXPIRY_DAYS: Record<string, number | null> = { "7 days": 7, "30 days": 30, "90 days": 90, Never: null };

export interface Invitee {
  who: string;
  email: string | null;
  role: Role;
  external: boolean;
  /** Private key in this person's own link (…/shared/<token>?k=<key>). Never sent to the browser except in their link. */
  key: string;
}
export interface ShareRecord {
  token: string;
  kind: "pics" | "fb";
  targetId: string;
  targetName: string;
  invitees: Invitee[];
  access: "restricted" | "link";
  /** YYYY-MM-DD (last valid day) or null = never. */
  expiresAt: string | null;
  include: Record<string, boolean>;
  message: string;
}

export const SHARE_FIELDS = [
  "Token", "Kind", "Target Record ID", "Target Name", "Invitees", "Access", "Expires At", "Include", "Message", "Email Results",
] as const;

const tableId = () => process.env.PICS_SHARES_TABLE_ID || "";
export const sharesStorage = () => (tableId() ? "airtable" : "memory");

const mem = ((globalThis as { __picsShares?: Map<string, ShareRecord> }).__picsShares ??= new Map());

/* ---------------------------------------------------------------- validation */
export interface ShareInput {
  kind: "pics" | "fb";
  id: string;
  name: string;
  invites: { who: string; role: Role }[];
  access: "restricted" | "link";
  expiresAt: string | null;
  include: Record<string, boolean>;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseShare(raw: unknown): ShareInput {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (b.kind !== "pics" && b.kind !== "fb") throw bad("kind must be pics or fb");
  const id = text(b.id, 100);
  if (!/^[\w.:-]+$/.test(id)) throw bad("Missing or invalid id");

  const invitesRaw = Array.isArray(b.invites) ? b.invites : [];
  if (invitesRaw.length > 25) throw bad("At most 25 people per share");
  const seen = new Set<string>();
  const invites = invitesRaw.map((x) => {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const who = text(o.who, 200);
    if (!who) throw bad("Every invite needs a name or email address");
    if (seen.has(who.toLowerCase())) throw bad(`${who} is listed twice`);
    seen.add(who.toLowerCase());
    const role = ROLES.find((r) => r === o.role);
    if (!role) throw bad(`Role for ${who} must be Viewer, Commenter or Editor`);
    return { who, role };
  });

  const access = b.access === "link" ? "link" : b.access === "restricted" ? "restricted" : null;
  if (!access) throw bad("access must be restricted or link");
  if (!invites.length && access === "restricted") throw bad("Add someone or switch to link access");

  const expiry = typeof b.expiry === "string" && b.expiry in EXPIRY_DAYS ? b.expiry : null;
  if (!expiry) throw bad("Unknown expiry");
  const days = EXPIRY_DAYS[expiry];
  const expiresAt = days == null ? null : new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

  const include: Record<string, boolean> = {};
  if (b.include && typeof b.include === "object") {
    for (const [k, v] of Object.entries(b.include as Record<string, unknown>).slice(0, 20)) include[text(k, 60)] = v === true;
  }

  return { kind: b.kind, id, name: text(b.name, 200) || "a P.I.C.S", invites, access, expiresAt, include, message: text(b.message, 1000) };
}

/* ---------------------------------------------------------------- who is internal / what's their email */
export async function resolveInvitees(invites: ShareInput["invites"]): Promise<Invitee[]> {
  let team = new Map<string, string | null>(); // name → email
  try {
    const rows = await listRecords(PICS_TABLES.team, { fields: ["Name", "Email"] });
    team = new Map(rows.map((r) => [str(r.fields["Name"]).trim(), str(r.fields["Email"]).trim() || null]));
  } catch {
    try {
      const rows = await listRecords(PICS_TABLES.team, { fields: ["Name"] }); // no Email field readable
      team = new Map(rows.map((r) => [str(r.fields["Name"]).trim(), null]));
    } catch {
      /* team unknown: everyone with an email address is treated as external */
    }
  }
  return invites.map(({ who, role }) => {
    const key = randomBytes(12).toString("base64url");
    if (team.has(who)) return { who, email: team.get(who) ?? null, role, external: false, key };
    if (EMAIL_RE.test(who)) return { who, email: who, role: role === "Editor" ? "Commenter" : role, external: true, key }; // guests never edit
    throw bad(`"${who}" isn't a team member or an email address`);
  });
}

/* ---------------------------------------------------------------- storage */
const newToken = () => randomBytes(18).toString("base64url"); // 24 URL-safe chars, 144 bits

const j = (v: unknown) => JSON.stringify(v);

export async function saveShare(s: ShareRecord): Promise<void> {
  if (!tableId()) {
    if (process.env.NODE_ENV === "production") throw new AirtableError("Sharing storage isn't set up yet (PICS_SHARES_TABLE_ID)", 503);
    mem.set(s.token, s);
    return;
  }
  await createRecord(
    tableId(),
    {
      Token: s.token,
      Kind: s.kind,
      "Target Record ID": s.targetId,
      "Target Name": s.targetName,
      Invitees: j(s.invitees),
      Access: s.access,
      ...(s.expiresAt ? { "Expires At": s.expiresAt } : {}),
      Include: j(s.include),
      Message: s.message,
    },
    SHARE_FIELDS,
    false,
    { dashboard: "PICS Operations", area: "Share" },
  );
}

export type ShareLookup = { ok: true; share: ShareRecord } | { ok: false; reason: "not-found" | "expired" };

const today = () => new Date().toISOString().slice(0, 10);

export async function getShare(token: string): Promise<ShareLookup> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return { ok: false, reason: "not-found" };
  let share: ShareRecord | undefined;
  if (!tableId()) share = mem.get(token);
  else {
    const rows = await listRecords(tableId(), { filterByFormula: `{Token}='${token}'`, maxRecords: 1 });
    const r = rows[0];
    if (r) {
      const f = r.fields;
      const parse = <T,>(v: unknown, d: T): T => {
        try {
          return JSON.parse(str(v)) as T;
        } catch {
          return d;
        }
      };
      share = {
        token,
        kind: str(f["Kind"]) === "fb" ? "fb" : "pics",
        targetId: str(f["Target Record ID"]),
        targetName: str(f["Target Name"]),
        invitees: parse<Invitee[]>(f["Invitees"], []),
        access: str(f["Access"]) === "link" ? "link" : "restricted",
        expiresAt: str(f["Expires At"]).slice(0, 10) || null,
        include: parse<Record<string, boolean>>(f["Include"], {}),
        message: str(f["Message"]),
      };
    }
  }
  if (!share) return { ok: false, reason: "not-found" };
  if (share.expiresAt && share.expiresAt < today()) return { ok: false, reason: "expired" };
  return { ok: true, share };
}

/* ---------------------------------------------------------------- email */
export async function emailInvite(s: ShareRecord, i: Invitee, origin: string, sharedBy: string): Promise<EmailResult> {
  if (!i.email) return { sent: false, reason: "No email address on file" };
  const link = shareLink(origin, s.token, i.key);
  const what = s.targetName || "a P.I.C.S";
  const expiry = s.expiresAt ? `This link works until ${s.expiresAt}.` : "This link doesn't expire.";
  const note = s.message ? `<p style="margin:12px 0;padding:10px 12px;background:#f4f4f8;border-radius:8px">${escHtml(s.message).replace(/\n/g, "<br>")}</p>` : "";
  return sendEmail({
    to: i.email,
    toName: i.who === i.email ? undefined : i.who,
    subject: `${sharedBy} shared "${what}" with you`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#1c1c28">
      <p>${escHtml(sharedBy)} shared <b>${escHtml(what)}</b> with you as <b>${i.role}</b>.</p>${note}
      <p><a href="${escHtml(link)}" style="display:inline-block;padding:9px 16px;background:#4b2bd6;color:#fff;border-radius:8px;text-decoration:none">Open</a></p>
      <p style="color:#6b6b7b;font-size:12px">${expiry}</p></div>`,
    text: `${sharedBy} shared "${what}" with you as ${i.role}.\n${s.message ? s.message + "\n" : ""}${link}\n${expiry}`,
  });
}

/* ---------------------------------------------------------------- links + access rules */
/** Link to the shared page. With a key it is that person's own link; without one it is the "anyone with the link" link. */
export const shareLink = (origin: string, token: string, key?: string) =>
  `${origin}/shared/${token}${key ? `?k=${encodeURIComponent(key)}` : ""}`;

const sameKey = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export interface Access {
  role: Role;
  /** Who the key belongs to; null for anonymous link access. */
  who: string | null;
}

/** The one place that decides who may open a share:
    • a valid personal key → that person, with the role they were given;
    • no/unknown key → only if the share is "anyone with the link", and then read-only (Viewer);
    • otherwise nobody. */
export function accessFor(s: ShareRecord, key: string | null | undefined): Access | null {
  if (key) {
    const hit = s.invitees.find((i) => sameKey(i.key, key));
    if (hit) return { role: hit.role, who: hit.who };
  }
  if (s.access === "link") return { role: "Viewer", who: null };
  return null;
}

export { newToken };
