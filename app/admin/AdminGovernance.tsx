"use client";

import { adminRoleLabels, adminRoles, type AdminRole } from "../../lib/admin-permissions";

export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  status: "active" | "disabled";
  last_login_at?: string;
  created_at: string;
  updated_at: string;
};

export type AdminAuditLog = {
  id: number;
  admin_id: string;
  actor_email: string;
  actor_role: AdminRole;
  action: string;
  entity_id: string;
  summary: string;
  request_ip: string;
  outcome: "attempted" | "succeeded" | "failed";
  error_text: string;
  created_at: string;
};

const roleDescriptions: Record<AdminRole, string> = {
  owner: "拥有全部权限，可管理账号、支付和系统设置。",
  operations: "管理订单、商品、营销、内容和日常客服。",
  customer_service: "查看订单与客户，处理邮件工单及售后。",
  finance: "查看经营数据，管理支付、退款和发票。",
  warehouse: "管理库存及订单的配货、发货和完成状态。",
};

const actionLabels: Record<string, string> = {
  "admin-login": "登录后台",
  "create-admin-user": "创建管理员",
  "update-admin-user": "更新管理员",
  "reset-admin-password": "重置管理员密码",
  "update-order-status": "更新订单状态",
  "bulk-update-order-status": "批量更新订单",
  "create-refund": "发起退款",
  "update-invoice": "更新发票",
  "reply-support-thread": "回复客户邮件",
  "update-return-status": "更新售后状态",
  "create-product": "创建商品",
  "update-product": "更新商品",
  "update-product-inventory": "更新商品库存",
  "archive-product": "下架商品",
};

export function AdminUsersAdmin({ users, currentAdminId, onAct }: { users: AdminUser[]; currentAdminId: string; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const managedUsers = users.filter((user) => user.id !== "legacy-owner");
  return <div className="admin-governance-stack">
    <section className="admin-role-grid">{adminRoles.map((role) => <article key={role}><b>{adminRoleLabels[role]}</b><p>{roleDescriptions[role]}</p></article>)}</section>
    <section className="admin-panel"><div className="admin-panel-title"><div><h2>后台账号</h2><p>主管理员使用服务器密码；员工账号按角色授权。</p></div><span>{users.length} 个账号</span></div>
      <div className="admin-table-wrap"><table><thead><tr><th>管理员</th><th>角色</th><th>状态</th><th>最后登录</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><b>{user.display_name}</b><small>{user.email}<br />{user.id === "legacy-owner" ? "服务器主账号" : user.id}</small></td><td>{user.id === "legacy-owner" ? adminRoleLabels.owner : <select value={user.role} disabled={user.id === currentAdminId} onChange={(event) => void onAct({ action: "update-admin-user", id: user.id, role: event.target.value, status: user.status })}>{adminRoles.map((role) => <option value={role} key={role}>{adminRoleLabels[role]}</option>)}</select>}</td><td>{user.id === "legacy-owner" ? "正常" : <select value={user.status} disabled={user.id === currentAdminId} onChange={(event) => void onAct({ action: "update-admin-user", id: user.id, role: user.role, status: event.target.value })}><option value="active">正常</option><option value="disabled">已停用</option></select>}</td><td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString("zh-CN") : "尚未登录"}</td></tr>)}</tbody></table></div>
    </section>
    <div className="admin-governance-forms">
      <form className="admin-panel admin-account-form" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries()); if (await onAct({ action: "create-admin-user", ...values })) form.reset(); }}><div className="admin-panel-title"><div><h2>新建员工账号</h2><p>初始密码至少 12 位，请通过安全渠道交给员工。</p></div></div><label>姓名<input name="displayName" maxLength={80} required /></label><label>邮箱<input name="email" type="email" maxLength={160} autoComplete="off" required /></label><label>角色<select name="role" defaultValue="operations">{adminRoles.map((role) => <option value={role} key={role}>{adminRoleLabels[role]}</option>)}</select></label><label>初始密码<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label><button className="admin-save">创建账号</button></form>
      <form className="admin-panel admin-account-form" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries()); if (await onAct({ action: "reset-admin-password", ...values })) form.reset(); }}><div className="admin-panel-title"><div><h2>重置员工密码</h2><p>重置后旧密码与所有已登录会话立即失效，已停用账号仍不能登录。</p></div></div><label>员工账号<select name="id" required defaultValue=""><option value="" disabled>请选择</option>{managedUsers.map((user) => <option value={user.id} key={user.id}>{user.display_name} · {user.email}</option>)}</select></label><label>新密码<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label><button className="admin-save" disabled={!managedUsers.length}>重置密码</button></form>
    </div>
  </div>;
}

export function AuditLogAdmin({ logs }: { logs: AdminAuditLog[] }) {
  return <section className="admin-panel"><div className="admin-panel-title"><div><h2>操作审计日志</h2><p>保留操作人、业务对象、执行结果、时间和来源，用于追溯关键变更。</p></div><span>最近 {logs.length} 条</span></div><div className="admin-table-wrap"><table><thead><tr><th>时间</th><th>操作人</th><th>操作</th><th>结果</th><th>业务对象</th><th>摘要</th><th>来源 IP</th></tr></thead><tbody>{logs.length ? logs.map((log) => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString("zh-CN")}</td><td><b>{log.actor_email}</b><small>{adminRoleLabels[log.actor_role] ?? log.actor_role}</small></td><td>{actionLabels[log.action] ?? log.action}</td><td>{log.outcome === "succeeded" ? "成功" : log.outcome === "failed" ? "失败" : "处理中"}{log.error_text && <small>{log.error_text}</small>}</td><td>{log.entity_id || "—"}</td><td>{log.summary || "—"}</td><td>{log.request_ip || "—"}</td></tr>) : <tr><td className="admin-empty" colSpan={7}>尚无后台操作记录</td></tr>}</tbody></table></div></section>;
}
