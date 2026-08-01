import { phaseTwoHeaders } from "../../../../lib/community/contracts";
import { listCommunityTopics } from "../../../../lib/community/social";
import { privateJson, safeServerError } from "../../../../lib/request-security";

export async function GET() {
  try {
    return privateJson({ enabled: true, phase: 2, topics: await listCommunityTopics() }, { headers: phaseTwoHeaders() });
  } catch { return safeServerError("社区话题暂时无法读取，请稍后再试"); }
}

export async function POST() {
  return privateJson({ error: "社区话题由内容管理员统一维护" }, { status: 405, headers: { ...phaseTwoHeaders(), allow: "GET" } });
}
