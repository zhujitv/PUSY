import { communityPostDto, createCommunityPost, listCommunityPosts } from "../../../../lib/community/posts";
import { normalizeCommunityPostInput, parseOptionalCommunityMedia } from "../../../../lib/community/media";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { allowRequest, allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const publicId = url.searchParams.get("member")?.trim().toUpperCase() || undefined;
    const topicSlug = url.searchParams.get("topic")?.trim().toLowerCase() || undefined;
    const requestedFeed = url.searchParams.get("feed");
    const feed = requestedFeed === "following" || requestedFeed === "bookmarks" ? requestedFeed : "all" as const;
    const requestedSort = url.searchParams.get("sort");
    const sort = requestedSort === "latest" || requestedSort === "popular" ? requestedSort : "featured" as const;
    const query = url.searchParams.get("q")?.trim().slice(0, 80) || undefined;
    const productSlug = url.searchParams.get("product")?.trim().toLowerCase() || undefined;
    if (publicId && !/^MBR-[A-Z0-9]{12}$/.test(publicId)) return privateJson({ error: "会员主页标识无效" }, { status: 400 });
    if (topicSlug && !/^[a-z0-9-]{2,40}$/.test(topicSlug)) return privateJson({ error: "社区话题标识无效" }, { status: 400 });
    if (productSlug && !/^[a-z0-9][a-z0-9-]{1,119}$/.test(productSlug)) return privateJson({ error: "关联商品标识无效" }, { status: 400 });
    const viewer = await getPreviewMemberIdentity();
    if (feed !== "all" && !viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
    const posts = await listCommunityPosts({
      publicId,
      viewerMemberId: viewer?.memberId,
      topicSlug,
      productSlug,
      query,
      feed,
      sort,
      limit: Number(url.searchParams.get("limit") ?? 24),
    });
    return privateJson({ posts: posts.map((post) => communityPostDto(post, post.status !== "approved")), viewer: viewer ? { signedIn: true } : null });
  } catch (error) {
    console.error("[community/posts] read failed", { message: error instanceof Error ? error.message : String(error) });
    return safeServerError("社区内容暂时无法读取，请稍后再试");
  }
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
    if (!await allowRequest(request, "community-post", 30, 60 * 60)) return rateLimitResponse();
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户后发布" }, { status: 401 });
    if (!await allowRequestForIdentity("community-post-member", String(viewer.memberId), 30, 60 * 60)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const clientRequestId = String(payload.clientRequestId ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientRequestId)) return privateJson({ error: "发布请求标识无效，请刷新页面后重试" }, { status: 400 });
    const intent = payload.intent === "draft" ? "draft" : "submit";
    const input = intent === "draft" ? (() => {
      const displayName = String(payload.displayName ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
      const title = String(payload.title ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
      const body = String(payload.body ?? "").trim().slice(0, 1_500);
      if (displayName.length < 2 || /@|\b1[3-9]\d{9}\b/.test(displayName)) throw new Error("请填写 2 至 30 个字的社区昵称，且不要包含联系方式");
      if (!title && !body && !Array.isArray(payload.images)) throw new Error("草稿至少需要标题、正文或图片中的一项");
      return { displayName, title, body, media: parseOptionalCommunityMedia(payload.images) };
    })() : normalizeCommunityPostInput(payload);
    const topicSlugs = Array.isArray(payload.topicSlugs)
      ? payload.topicSlugs.map(String).map((slug) => slug.trim().toLowerCase()).filter((slug) => /^[a-z0-9-]{2,40}$/.test(slug)).slice(0, 3)
      : [];
    const productSlugs = Array.isArray(payload.productSlugs)
      ? Array.from(new Set(payload.productSlugs.map(String).map((slug) => slug.trim().toLowerCase()).filter((slug) => /^[a-z0-9][a-z0-9-]{1,119}$/.test(slug)))).slice(0, 3)
      : [];
    if (intent === "submit" && !topicSlugs.length) return privateJson({ error: "请至少选择 1 个社区话题" }, { status: 400 });
    const campaignSlug = String(payload.campaignSlug ?? "").trim().toLowerCase();
    if (campaignSlug && !/^[a-z0-9-]{2,80}$/.test(campaignSlug)) return privateJson({ error: "主题活动标识无效" }, { status: 400 });
    const created = await createCommunityPost({ memberId: viewer.memberId, clientRequestId, topicSlugs, productSlugs, campaignSlug: campaignSlug || undefined, intent, ...input });
    return privateJson({
      ok: true,
      id: created.id,
      duplicate: created.duplicate,
      status: intent === "draft" ? "draft" : "pending",
      memberUrl: intent === "draft" ? "/community/creator" : `/community/members/${created.publicId}`,
      message: intent === "draft" ? "草稿已安全保存，可在创作中心继续编辑" : "内容已提交审核，通过后会出现在社区首页",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof SyntaxError) return privateJson({ error: "请求内容不是有效的 JSON" }, { status: 400 });
    if (/^(请上传|仅支持|单张图片|图片内容|图片总大小|正文至少|请填写|请选择|关联商品|草稿至少|这篇内容|所选主题)/.test(message)) return privateJson({ error: message }, { status: 400 });
    if (/会员账户不可发布|创作者账号/.test(message)) return privateJson({ error: message }, { status: 403 });
    console.error("[community/posts] create failed", { message });
    return safeServerError("发布失败，请稍后再试");
  }
}
