/* Browser-side calls to the /api/pics/* route handlers (which hold the Airtable token server-side).
   Throws an Error with the route's message so callers can revert their optimistic update and toast it. */
export async function picsApi<T>(method: "POST" | "PATCH", path: string, payload: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/pics${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Network error — Airtable wasn't updated");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Airtable save failed (${res.status})`);
  return data;
}

/** Short, user-facing version of a failed save. */
export const saveError = (e: unknown) => `Not saved to Airtable — ${e instanceof Error ? e.message.replace(/^Airtable \d+: /, "") : String(e)}`.slice(0, 220);
