import store from "../../../lib/store";
export async function GET() { return Response.json({ warehouse: store.warehouse, schedule: store.schedule, pos: store.pos, held: store.held }); }
export async function POST(req: Request) {
  const body = await req.json();
  if (body.warehouse) store.warehouse = body.warehouse;
  if (body.schedule) store.schedule = body.schedule;
  if (body.pos) store.pos = body.pos;
  if (body.held) store.held = body.held;
  return Response.json({ ok: true });
}
