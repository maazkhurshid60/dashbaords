import { checkKey, handleWrite, respond, WriteError, type WriteBody } from "@/lib/product-write.server";

/* POST /api/product/write — every save from /product and /communications.
   Body: {table, recordId, fields} | {table, create:true, fields} | {action:'dismissFix'|'assignFix'|'prantSweep', …}
   Tables and fields are allow-listed in lib/product-write.server.ts. */
export async function POST(req: Request) {
  return respond(async () => {
    checkKey(req);
    let b: WriteBody;
    try {
      b = (await req.json()) as WriteBody;
    } catch {
      throw new WriteError("Body must be JSON");
    }
    if (!b || typeof b !== "object") throw new WriteError("Body must be a JSON object");
    return handleWrite(b);
  });
}
