import { getRecentAiCalls } from "@/lib/ai/ai-call-log";
import { auth } from "@/app/(auth)/auth";
import { isProductionEnvironment } from "@/lib/constants";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return Response.json(
      { error: "Not available" },
      { status: 404 }
    );
  }

  const calls = getRecentAiCalls(100);

  return Response.json({
    total: calls.length,
    calls: calls.slice().reverse(),
  });
}
