import Papa from "papaparse";
import store, { PosRow } from "@/lib/store";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  let text = "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData(); const file = form.get("file") as File | null;
    if (!file) return new Response("No file", { status: 400 }); text = await file.text();
  } else { text = await req.text(); }
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows: PosRow[] = (parsed.data as any[]).map(r => ({
    store: String(r["Store"] ?? r["Outlet"] ?? "").trim(),
    product: String(r["Description"] ?? "").trim(),
    qty: Number(r["Qty Sold"] ?? r["QtySold"] ?? r["Qty"] ?? 0),
    start: String(r["Period Start"] ?? r["Start"] ?? r["From"] ?? "").trim(),
    end: String(r["Period End"] ?? r["End"] ?? r["To"] ?? "").trim(),
  })).filter(r => r.store && r.product && r.end);
  store.pos = rows;
  return Response.json({ ok: true, count: rows.length });
}
