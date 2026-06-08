import { getRecentAiCalls } from "@/lib/ai/ai-call-log";
import { isProductionEnvironment } from "@/lib/constants";

export async function GET() {
  if (isProductionEnvironment) {
    return Response.json({ error: "Not available in production" }, { status: 404 });
  }

  const calls = getRecentAiCalls(100);

  return Response.json({
    total: calls.length,
    calls: calls.slice().reverse(),
  });
}
