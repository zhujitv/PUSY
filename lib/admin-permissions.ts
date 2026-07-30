export const adminRoles = ["owner", "operations", "customer_service", "finance", "warehouse"] as const;
export type AdminRole = typeof adminRoles[number];

export const adminPermissions = [
  "dashboard.read",
  "analytics.read",
  "orders.read",
  "orders.manage",
  "orders.fulfill",
  "products.read",
  "products.manage",
  "products.inventory.manage",
  "customers.read",
  "customers.manage",
  "support.read",
  "support.manage",
  "finance.read",
  "finance.manage",
  "marketing.read",
  "marketing.manage",
  "content.manage",
  "system.manage",
  "admins.manage",
  "audit.read",
] as const;
export type AdminPermission = typeof adminPermissions[number];

export const adminRoleLabels: Record<AdminRole, string> = {
  owner: "主管理员",
  operations: "商城运营",
  customer_service: "客服专员",
  finance: "财务人员",
  warehouse: "仓库人员",
};

const rolePermissions: Record<AdminRole, readonly AdminPermission[]> = {
  owner: adminPermissions,
  operations: ["dashboard.read", "analytics.read", "orders.read", "orders.manage", "orders.fulfill", "products.read", "products.manage", "products.inventory.manage", "customers.read", "support.read", "support.manage", "marketing.read", "marketing.manage", "content.manage"],
  customer_service: ["orders.read", "customers.read", "support.read", "support.manage"],
  finance: ["dashboard.read", "analytics.read", "orders.read", "customers.read", "finance.read", "finance.manage"],
  warehouse: ["orders.read", "orders.fulfill", "products.read", "products.inventory.manage"],
};

export function validAdminRole(value: string): value is AdminRole {
  return adminRoles.includes(value as AdminRole);
}

export function permissionsForRole(role: AdminRole) {
  return [...rolePermissions[role]];
}

export function roleCan(role: AdminRole, permission: AdminPermission) {
  return rolePermissions[role].includes(permission);
}

export const adminActionPermissions: Record<string, AdminPermission> = {
  "bulk-import-products": "products.manage",
  "create-product": "products.manage",
  "update-product": "products.manage",
  "update-product-inventory": "products.inventory.manage",
  "archive-product": "products.manage",
  "update-order-status": "orders.fulfill",
  "bulk-update-order-status": "orders.fulfill",
  "update-member-status": "customers.manage",
  "update-subscriber-status": "marketing.manage",
  "update-return-status": "support.manage",
  "update-support-thread": "support.manage",
  "add-support-note": "support.manage",
  "create-canned-reply": "support.manage",
  "delete-canned-reply": "support.manage",
  "manage-support-threads": "support.manage",
  "reply-support-thread": "support.manage",
  "open-linked-support-thread": "support.manage",
  "update-invoice": "finance.manage",
  "update-retail-partnership-status": "marketing.manage",
  "create-coupon": "marketing.manage",
  "adjust-member-points": "marketing.manage",
  "create-customer-tag": "marketing.manage",
  "assign-member-tag": "marketing.manage",
  "create-customer-segment": "marketing.manage",
  "issue-targeted-coupon": "marketing.manage",
  "run-growth-automations": "marketing.manage",
  "update-coupon-status": "marketing.manage",
  "update-gift-card-status": "marketing.manage",
  "update-payment-provider": "finance.manage",
  "retry-payment": "finance.manage",
  "sync-payment": "finance.manage",
  "create-refund": "finance.manage",
  "retry-refund": "finance.manage",
  "sync-refund": "finance.manage",
  "update-notification-setting": "system.manage",
  "update-notification-template": "system.manage",
  "retry-notification": "system.manage",
  "process-notifications": "system.manage",
  "update-review-status": "marketing.manage",
  "update-site-content": "content.manage",
  "create-admin-user": "admins.manage",
  "update-admin-user": "admins.manage",
  "reset-admin-password": "admins.manage",
};
