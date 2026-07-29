import { getStoreDb } from "./store";

export async function ensureMemberProfile(memberId: number) {
  const db = await getStoreDb();
  await db.prepare(`CREATE TABLE IF NOT EXISTS member_profiles (
    member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT '',
    birthday TEXT NOT NULL DEFAULT '',
    wechat TEXT NOT NULL DEFAULT '',
    province TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    occupation TEXT NOT NULL DEFAULT '',
    skin_type TEXT NOT NULL DEFAULT '',
    skin_concerns TEXT NOT NULL DEFAULT '[]',
    preferred_categories TEXT NOT NULL DEFAULT '[]',
    bio TEXT NOT NULL DEFAULT '',
    email_marketing INTEGER NOT NULL DEFAULT 0,
    sms_marketing INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
  )`).run();
  await db.prepare("INSERT INTO member_profiles (member_id) VALUES (?) ON CONFLICT(member_id) DO NOTHING").bind(memberId).run();
}
