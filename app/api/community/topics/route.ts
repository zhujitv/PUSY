import { communityPhaseTwoFeatures, phaseTwoDisabled, phaseTwoHeaders } from "../../../../lib/community/contracts";

export async function GET() {
  return Response.json({ enabled: false, phase: 2, endpoint: communityPhaseTwoFeatures.topics.endpoint, topics: [] }, { headers: phaseTwoHeaders() });
}

export async function POST() { return phaseTwoDisabled("topics"); }
