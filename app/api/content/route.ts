import { getSiteContent } from "../../../db/commerce-features";

export async function GET() {
  try {
    return Response.json({ content: await getSiteContent() }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return Response.json({ content: {} });
  }
}
