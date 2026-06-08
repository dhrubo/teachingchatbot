import { getTutorProviderCandidates } from "@/lib/ai/providers";
import { isProductionEnvironment } from "@/lib/constants";

export async function GET() {
  if (isProductionEnvironment) {
    return Response.json({ error: "Not available in production" }, { status: 404 });
  }

  const candidates = getTutorProviderCandidates();
  const configured: string[] = [];
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) configured.push("gemini");
  if (process.env.GROQ_API_KEY) configured.push("groq");
  if (process.env.OPENROUTER_API_KEY) configured.push("openrouter");

  return Response.json({
    providerOrder: process.env.AI_PROVIDER_ORDER?.split(",").map((s) => s.trim()) ?? ["default"],
    resolvedProviders: candidates.map((c) => ({
      provider: c.name,
      model: c.modelName,
      configured: configured.includes(c.name),
    })),
    env: {
      GOOGLE_GENERATIVE_AI_MODEL: process.env.GOOGLE_GENERATIVE_AI_MODEL || "(not set)",
      USE_VERCEL_AI_GATEWAY: process.env.USE_VERCEL_AI_GATEWAY || "0",
      AI_PROVIDER_ORDER: process.env.AI_PROVIDER_ORDER || "(not set)",
      ENABLE_LLM_TITLE_GENERATION: process.env.ENABLE_LLM_TITLE_GENERATION || "0",
    },
  });
}
