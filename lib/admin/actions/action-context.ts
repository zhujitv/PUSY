import type { getStoreDb } from "../../../db/store";
import type { getAdminIdentity } from "../../admin-auth";

export type AdminActionContext = {
  action: string;
  payload: Record<string, unknown>;
  db: Awaited<ReturnType<typeof getStoreDb>>;
  actor: NonNullable<Awaited<ReturnType<typeof getAdminIdentity>>>;
  request: Request;
};

export type AdminActionResult = false | true | Response;
