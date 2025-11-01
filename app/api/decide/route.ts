import store from "../../../lib/store";
export async function POST(req: Request) {
  const body = await req.json();
  const decisions: { store: string; product: string; send: boolean; qtySold: number }[] = body?.decisions || [];
  for (const d of decisions) {
    const key = `${d.store}|${d.product}`;
    const current = store.held[key] || 0;
    if (d.send) store.held[key] = 0; else store.held[key] = current + (d.qtySold || 0);
  }
  return Response.json({ ok: true, held: store.held });
}
