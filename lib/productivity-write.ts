import "server-only";
import { type Allow, AirtableError, type Fields, getSchema, updateRecord } from "@/lib/airtable.server";

/* Shared write path for the /api/productivity/* route handlers. Each route builds the
   Airtable fields from a small semantic body (never raw field names from the client), then
   checkedUpdate() verifies every field exists on the table and every single-select value is
   an existing choice before PATCHing with typecast off — so a dashboard edit can never
   create a new select option or touch a field outside the route's allow-list. */

export class BadRequest extends AirtableError {
  constructor(message: string) {
    super(message, 400);
  }
}

export async function checkedUpdate(tableId: string, recordId: string, fields: Fields, allowed: Allow) {
  if (!Object.keys(fields).length) throw new BadRequest("Nothing to update");
  const table = (await getSchema()).find((t) => t.id === tableId);
  if (!table) throw new AirtableError(`Table ${tableId} not found in schema`, 500);
  for (const [name, value] of Object.entries(fields)) {
    const def = table.fields.find((x) => x.name === name);
    if (!def) throw new AirtableError(`Field "${name}" no longer exists on ${table.name}`, 500);
    if (def.type === "singleSelect" && value != null && !def.options?.choices?.some((c) => c.name === value))
      throw new BadRequest(`"${String(value)}" is not a ${name} option on ${table.name}`);
  }
  return updateRecord(tableId, recordId, fields, allowed, false);
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new BadRequest("Expected a JSON object body");
  return body as Record<string, unknown>;
}

export const optString = (v: unknown, name: string, max = 10_000): string | undefined => {
  if (v === undefined) return undefined;
  if (typeof v !== "string" || v.length > max) throw new BadRequest(`${name} must be a string`);
  return v;
};

export function fail(e: unknown) {
  const status = e instanceof AirtableError ? e.status : 500;
  const message = e instanceof Error ? e.message : String(e);
  if (status >= 500) console.error("[productivity write]", e);
  return Response.json({ error: message }, { status });
}
