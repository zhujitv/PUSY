import { getAdminIdentity } from "../../../../../lib/admin-auth";
import { roleCan } from "../../../../../lib/admin-permissions";
import { getCommunityMedia } from "../../../../../lib/community/posts";
import { getPreviewMemberIdentity } from "../../../../../lib/preview-member-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^MED-[A-Z0-9]{12}$/.test(id)) return new Response("Not found", { status: 404 });
  try {
    const media = await getCommunityMedia(id);
    if (!media) return new Response("Not found", { status: 404 });
    let canView = media.status === "approved";
    if (!canView) {
      const [viewer, admin] = await Promise.all([
        getPreviewMemberIdentity().catch(() => null),
        getAdminIdentity().catch(() => null),
      ]);
      canView = viewer?.memberId === Number(media.member_id) || Boolean(admin && roleCan(admin.role, "community.read"));
    }
    if (!canView) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(media.bytes), {
      headers: {
        "content-type": media.mime_type,
        "content-length": String(media.byte_size),
        "cache-control": media.status === "approved" ? "public, max-age=300, stale-while-revalidate=3600" : "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Media unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  }
}
