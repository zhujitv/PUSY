import { getStoreDb } from "./store";

export async function ensureMemberProfile(memberId: number) {
  const db = await getStoreDb();
  await db.prepare("INSERT INTO member_profiles (member_id) VALUES (?) ON CONFLICT(member_id) DO NOTHING").bind(memberId).run();
}
