import { communityMemberDto, communityPostDto, getCommunityMember, listCommunityPosts } from "../../../../../lib/community/posts";
import { getPreviewMemberIdentity } from "../../../../../lib/preview-member-auth";
import { privateJson, safeServerError } from "../../../../../lib/request-security";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const publicId = (await params).id.toUpperCase();
    if (!/^MBR-[A-Z0-9]{12}$/.test(publicId)) return privateJson({ error: "会员主页标识无效" }, { status: 400 });
    const viewer = await getPreviewMemberIdentity();
    const [member, posts] = await Promise.all([
      getCommunityMember(publicId),
      listCommunityPosts({ publicId, viewerMemberId: viewer?.memberId, limit: 48 }),
    ]);
    if (!member) return privateJson({ error: "会员主页不存在" }, { status: 404 });
    const isOwner = viewer?.memberId === member.member_id;
    return privateJson({ member: communityMemberDto(member), posts: posts.map((post) => communityPostDto(post, isOwner)), isOwner });
  } catch {
    return safeServerError("会员主页暂时无法读取，请稍后再试");
  }
}
