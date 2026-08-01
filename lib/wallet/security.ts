import { getStoreDb } from "../../db/store";
import { createMemberSecret, validLoginPassword, validPaymentPassword, verifyMemberSecret } from "../auth/member-secrets";

export async function setMemberLoginPassword(input: { memberId: number; currentPassword?: string; newPassword: string }) {
  if (!validLoginPassword(input.newPassword)) throw new Error("账户密码需为 10 至 72 位，并同时包含字母和数字");
  const db = await getStoreDb();
  const [credential, wallet] = await Promise.all([
    db.prepare("SELECT login_password_hash, login_password_salt FROM member_credentials WHERE member_id = ? LIMIT 1").bind(input.memberId).first<{ login_password_hash: string; login_password_salt: string }>(),
    db.prepare("SELECT payment_password_hash, payment_password_salt FROM member_wallets WHERE member_id = ? LIMIT 1").bind(input.memberId).first<{ payment_password_hash: string | null; payment_password_salt: string | null }>(),
  ]);
  if (credential && !await verifyMemberSecret(input.currentPassword ?? "", credential.login_password_hash, credential.login_password_salt)) throw new Error("当前账户密码不正确");
  if (await verifyMemberSecret(input.newPassword, wallet?.payment_password_hash, wallet?.payment_password_salt)) throw new Error("账户密码不能与支付密码相同");
  const next = await createMemberSecret(input.newPassword);
  await db.prepare(`INSERT INTO member_credentials (member_id, login_password_hash, login_password_salt)
    VALUES (?, ?, ?) ON CONFLICT (member_id) DO UPDATE SET login_password_hash = EXCLUDED.login_password_hash,
      login_password_salt = EXCLUDED.login_password_salt, updated_at = CURRENT_TIMESTAMP::TEXT`)
    .bind(input.memberId, next.hash, next.salt).run();
}

export async function setMemberPaymentPassword(input: { memberId: number; currentPassword?: string; newPassword: string }) {
  if (!validPaymentPassword(input.newPassword)) throw new Error("支付密码需为 6 位非连续、非重复数字");
  const db = await getStoreDb();
  await db.prepare("INSERT INTO member_wallets (member_id) VALUES (?) ON CONFLICT (member_id) DO NOTHING").bind(input.memberId).run();
  const [wallet, credential] = await Promise.all([
    db.prepare("SELECT payment_password_hash, payment_password_salt FROM member_wallets WHERE member_id = ? LIMIT 1").bind(input.memberId).first<{ payment_password_hash: string | null; payment_password_salt: string | null }>(),
    db.prepare("SELECT login_password_hash, login_password_salt FROM member_credentials WHERE member_id = ? LIMIT 1").bind(input.memberId).first<{ login_password_hash: string; login_password_salt: string }>(),
  ]);
  if (wallet?.payment_password_hash && !await verifyMemberSecret(input.currentPassword ?? "", wallet.payment_password_hash, wallet.payment_password_salt)) throw new Error("当前支付密码不正确");
  if (await verifyMemberSecret(input.newPassword, credential?.login_password_hash, credential?.login_password_salt)) throw new Error("支付密码不能与账户密码相同");
  const next = await createMemberSecret(input.newPassword);
  await db.prepare(`UPDATE member_wallets SET payment_password_hash = ?, payment_password_salt = ?, password_failed_attempts = 0,
    password_locked_until = NULL, password_updated_at = CURRENT_TIMESTAMP::TEXT, updated_at = CURRENT_TIMESTAMP::TEXT WHERE member_id = ?`)
    .bind(next.hash, next.salt, input.memberId).run();
}

export async function verifyPaymentPassword(memberId: number, password: string) {
  const db = await getStoreDb();
  const wallet = await db.prepare(`SELECT status, payment_password_hash, payment_password_salt, password_failed_attempts, password_locked_until
    FROM member_wallets WHERE member_id = ? LIMIT 1`).bind(memberId).first<{ status: string; payment_password_hash: string | null; payment_password_salt: string | null; password_failed_attempts: number; password_locked_until: string | null }>();
  if (!wallet?.payment_password_hash) throw new Error("请先在财务中心设置支付密码");
  if (wallet.status !== "active") throw new Error("账户余额当前不可用，请联系客服");
  if (wallet.password_locked_until && new Date(wallet.password_locked_until).getTime() > Date.now()) throw new Error("支付密码已临时锁定，请稍后再试");
  if (!await verifyMemberSecret(password, wallet.payment_password_hash, wallet.payment_password_salt)) {
    await db.prepare(`UPDATE member_wallets SET password_failed_attempts = password_failed_attempts + 1,
      password_locked_until = CASE WHEN password_failed_attempts + 1 >= 5 THEN (CURRENT_TIMESTAMP + INTERVAL '30 minutes')::TEXT ELSE password_locked_until END,
      updated_at = CURRENT_TIMESTAMP::TEXT WHERE member_id = ?`).bind(memberId).run();
    throw new Error(wallet.password_failed_attempts + 1 >= 5 ? "支付密码错误次数过多，已锁定 30 分钟" : "支付密码不正确");
  }
  await db.prepare("UPDATE member_wallets SET password_failed_attempts = 0, password_locked_until = NULL, updated_at = CURRENT_TIMESTAMP::TEXT WHERE member_id = ?").bind(memberId).run();
  return true;
}

export async function verifyMemberLoginPassword(email: string, password: string) {
  const db = await getStoreDb();
  const row = await db.prepare(`SELECT m.id, m.name, m.email, m.status, c.login_password_hash, c.login_password_salt
    FROM members m JOIN member_credentials c ON c.member_id = m.id WHERE lower(m.email) = ? LIMIT 1`)
    .bind(email.trim().toLowerCase()).first<{ id: number; name: string; email: string; status: string; login_password_hash: string; login_password_salt: string }>();
  return row && await verifyMemberSecret(password, row.login_password_hash, row.login_password_salt) ? row : null;
}
