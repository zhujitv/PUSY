import { phaseTwoDisabled, phaseTwoHeaders } from "../../../../lib/community/contracts";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";

export async function GET() {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) return Response.json({ error: "请先登录会员账户" }, { status: 401, headers: phaseTwoHeaders() });
  return Response.json({ enabled: false, phase: 2, memberId: viewer.memberId, following: [], followers: [], counts: { following: 0, followers: 0 } }, { headers: phaseTwoHeaders() });
}

export async function POST() { return phaseTwoDisabled("follows"); }
export async function DELETE() { return phaseTwoDisabled("follows"); }
