import { listCommunityCampaigns } from "../../../../lib/community/creator";
import { privateJson, safeServerError } from "../../../../lib/request-security";

export async function GET() {
  try {
    return privateJson({ campaigns: await listCommunityCampaigns() });
  } catch (error) {
    console.error("[community/campaigns] read failed", { message: error instanceof Error ? error.message : String(error) });
    return safeServerError("主题活动暂时无法读取，请稍后再试");
  }
}
