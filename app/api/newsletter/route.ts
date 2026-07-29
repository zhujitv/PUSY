import { getStoreDb } from "../../../db/store";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { email?: string; source?: string };
    const email = payload.email?.trim().toLowerCase() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "请输入有效的电子邮箱" }, { status: 400 });
    const db = await getStoreDb();
    await db.prepare("INSERT INTO subscribers (email, source, status) VALUES (?, ?, 'active') ON CONFLICT(email) DO UPDATE SET status = 'active', source = excluded.source").bind(email, payload.source?.slice(0, 40) || "website").run();
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "订阅失败" }, { status: 500 });
  }
}
