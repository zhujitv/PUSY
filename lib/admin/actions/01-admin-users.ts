import { createAdminPasswordHash, legacyAdminConfigured } from "../../admin-auth";
import { validAdminRole } from "../../admin-permissions";
import type { AdminActionContext, AdminActionResult } from "./action-context";

export async function handleAdminUserAction(context: AdminActionContext): Promise<AdminActionResult> {
  const { action, payload, db, actor } = context;
  if (action === "create-admin-user") {
      const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 160);
      const displayName = String(payload.displayName ?? "").trim().slice(0, 80);
      const role = String(payload.role ?? "");
      const password = String(payload.password ?? "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !displayName || !validAdminRole(role)) return Response.json({ error: "请填写有效的员工账号、姓名和角色" }, { status: 400 });
      if (legacyAdminConfigured() && email === (process.env.ADMIN_EMAIL || "admin@pusy.cn").trim().toLowerCase()) return Response.json({ error: "该邮箱已由服务器主管理员使用" }, { status: 409 });
      const credentials = await createAdminPasswordHash(password);
      const id = `ADM-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      await db.prepare("INSERT INTO admin_users (id, email, display_name, role, password_hash, password_salt) VALUES (?, ?, ?, ?, ?, ?)").bind(id, email, displayName, role, credentials.hash, credentials.salt).run();
      payload.id = id;
    } else if (action === "update-admin-user") {
      const id = String(payload.id ?? "");
      const role = String(payload.role ?? "");
      const status = String(payload.status ?? "");
      if (!/^ADM-[A-Z0-9]{12}$/.test(id) || !validAdminRole(role) || !["active", "disabled"].includes(status)) return Response.json({ error: "管理员账号信息无效" }, { status: 400 });
      if (id === actor.id && (role !== "owner" || status !== "active")) return Response.json({ error: "不能降级或停用当前登录账号" }, { status: 409 });
      const result = await db.prepare("UPDATE admin_users SET role = ?, status = ?, session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(role, status, id).run();
      if (!result.meta.changes) return Response.json({ error: "管理员账号不存在" }, { status: 404 });
    } else if (action === "reset-admin-password") {
      const id = String(payload.id ?? "");
      if (!/^ADM-[A-Z0-9]{12}$/.test(id)) return Response.json({ error: "管理员账号信息无效" }, { status: 400 });
      const credentials = await createAdminPasswordHash(String(payload.password ?? ""));
      const result = await db.prepare("UPDATE admin_users SET password_hash = ?, password_salt = ?, session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(credentials.hash, credentials.salt, id).run();
      if (!result.meta.changes) return Response.json({ error: "管理员账号不存在" }, { status: 404 });
  } else return false;
  return true;
}
