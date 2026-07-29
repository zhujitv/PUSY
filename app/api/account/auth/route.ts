import { getStoreDb } from "../../../../db/store";
import {
  PREVIEW_VERIFICATION_CODE,
  previewMemberCookie,
} from "../../../../lib/preview-member-auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^1[3-9]\d{9}$/;

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "正式环境请使用会员登录服务" }, { status: 404 });
  }

  try {
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const code = String(payload.code ?? "").trim();
    if (code !== PREVIEW_VERIFICATION_CODE) {
      return Response.json({ error: "验证码不正确，本地预览验证码为 123456" }, { status: 400 });
    }

    const db = await getStoreDb();
    if (action === "register") {
      const name = String(payload.name ?? "").trim();
      const email = String(payload.email ?? "").trim().toLowerCase();
      const phone = String(payload.phone ?? "").replace(/\s|-/g, "");
      const consent = payload.consent === "on";
      if (name.length < 2) return Response.json({ error: "请填写真实姓名" }, { status: 400 });
      if (!emailPattern.test(email)) return Response.json({ error: "请填写有效邮箱" }, { status: 400 });
      if (!phonePattern.test(phone)) return Response.json({ error: "请填写有效的中国大陆手机号" }, { status: 400 });
      if (!consent) return Response.json({ error: "请先同意用户服务协议和隐私政策" }, { status: 400 });

      const existing = await db
        .prepare("SELECT id FROM members WHERE lower(email) = ? OR phone = ? LIMIT 1")
        .bind(email, phone)
        .first<{ id: number }>();
      if (existing) return Response.json({ error: "该邮箱或手机号已经注册，请直接登录" }, { status: 409 });

      await db
        .prepare("INSERT INTO members (name, email, phone) VALUES (?, ?, ?)")
        .bind(name, email, phone)
        .run();
      return Response.json(
        { ok: true, message: "注册成功，正在进入会员中心" },
        { headers: { "set-cookie": previewMemberCookie(email) } },
      );
    }

    if (action === "login") {
      const identifier = String(payload.identifier ?? "").trim().toLowerCase();
      if (!identifier) return Response.json({ error: "请输入手机号或邮箱" }, { status: 400 });
      const phone = identifier.replace(/\s|-/g, "");
      const member = await db
        .prepare("SELECT name, email, status FROM members WHERE lower(email) = ? OR phone = ? LIMIT 1")
        .bind(identifier, phone)
        .first<{ name: string; email: string; status: string }>();
      if (!member) return Response.json({ error: "该账户尚未注册，请先注册会员" }, { status: 404 });
      if (member.status === "blocked") return Response.json({ error: "该会员账户已停用" }, { status: 403 });
      return Response.json(
        { ok: true, message: `欢迎回来，${member.name}` },
        { headers: { "set-cookie": previewMemberCookie(member.email) } },
      );
    }

    return Response.json({ error: "未知会员操作" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "会员操作失败" }, { status: 500 });
  }
}
