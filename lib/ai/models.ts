export const DEFAULT_CHAT_MODEL = "gemini-3.1-flash-lite";

export const titleModel = {
  id: "moonshotai/kimi-k2.5",
  name: "Kimi K2.5",
  provider: "moonshotai",
  description: "Fast model for title generation",
  gatewayOrder: ["fireworks", "bedrock"],
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  gatewayOrder?: string[];
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

export const DEFAULT_GEMINI_MODEL = process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "gemini-3.1-flash-lite";

export const chatModels: ChatModel[] = [
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    provider: "google",
    description: "Fast and cost-effective Gemini model (default)",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "google",
    description: "Previous-generation Gemini model",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    description: "Balanced speed and quality Gemini model",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    description: "Most capable Gemini model with reasoning",
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "deepseek",
    description: "Fast and capable model with tool use (AI Gateway)",
    gatewayOrder: ["bedrock", "deepinfra"],
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "moonshotai",
    description: "Moonshot AI flagship model (AI Gateway)",
    gatewayOrder: ["fireworks", "bedrock"],
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
    provider: "openai",
    description: "Compact reasoning model (AI Gateway)",
    gatewayOrder: ["groq", "bedrock"],
    reasoningEffort: "low",
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    provider: "openai",
    description: "Open-source 120B parameter model (AI Gateway)",
    gatewayOrder: ["fireworks", "bedrock"],
    reasoningEffort: "low",
  },
  {
    id: "xai/grok-4.1-fast-non-reasoning",
    name: "Grok 4.1 Fast",
    provider: "xai",
    description: "Fast non-reasoning model with tool use (AI Gateway)",
    gatewayOrder: ["xai"],
  },
];

// Static capabilities for models not routed through AI Gateway.
// Gateway models use these defaults when the Gateway is not active.
const STATIC_CAPABILITIES: Record<string, ModelCapabilities> = {
  "gemini-3.1-flash-lite": { tools: true, vision: true, reasoning: false },
  "gemini-2.5-flash-lite": { tools: true, vision: true, reasoning: false },
  "gemini-2.5-flash": { tools: true, vision: true, reasoning: false },
  "gemini-2.5-pro": { tools: true, vision: true, reasoning: true },
  // Defaults for gateway-only models when Gateway is not active
  "deepseek/deepseek-v3.2": { tools: true, vision: false, reasoning: false },
  "moonshotai/kimi-k2.5": { tools: true, vision: false, reasoning: false },
  "openai/gpt-oss-20b": { tools: true, vision: false, reasoning: true },
  "openai/gpt-oss-120b": { tools: true, vision: false, reasoning: true },
  "xai/grok-4.1-fast-non-reasoning": { tools: true, vision: false, reasoning: false },
};

let _isUsingGateway: (() => boolean) | null = null;

function isUsingGateway(): boolean {
  if (_isUsingGateway === null) {
    try {
      // Dynamic import to avoid circular dependency at module level
      const { isUsingGateway: check } = require("./providers");
      _isUsingGateway = check;
    } catch {
      _isUsingGateway = () => false;
    }
  }
  return _isUsingGateway!();
}

// Capabilities for a single model. The chat route only needs the selected
// model's capabilities, so this avoids awaiting a Promise.all over all 9 models
// (and any Gateway fetches they'd trigger) on the request hot path.
export async function getModelCapabilities(
  modelId: string
): Promise<ModelCapabilities> {
  if (STATIC_CAPABILITIES[modelId]) {
    return STATIC_CAPABILITIES[modelId];
  }

  if (isUsingGateway()) {
    try {
      const res = await fetch(
        `https://ai-gateway.vercel.sh/v1/models/${modelId}/endpoints`,
        { next: { revalidate: 86_400 } }
      );
      if (res.ok) {
        const json = await res.json();
        const endpoints = json.data?.endpoints ?? [];
        const params = new Set(
          endpoints.flatMap(
            (e: { supported_parameters?: string[] }) =>
              e.supported_parameters ?? []
          )
        );
        const inputModalities = new Set(
          json.data?.architecture?.input_modalities ?? []
        );
        return {
          tools: params.has("tools"),
          vision: inputModalities.has("image"),
          reasoning: params.has("reasoning"),
        };
      }
    } catch {
      // Fall through to default below
    }
  }

  return { tools: false, vision: false, reasoning: false };
}

export async function getCapabilities(): Promise<
  Record<string, ModelCapabilities>
> {
  const useGateway = isUsingGateway();

  const results = await Promise.all(
    chatModels.map(async (model) => {
      // Return known capabilities immediately (for both Gemini and gateway models).
      if (STATIC_CAPABILITIES[model.id]) {
        return [model.id, STATIC_CAPABILITIES[model.id]];
      }

      // Only fetch from AI Gateway when it's actually active.
      if (useGateway) {
        try {
          const res = await fetch(
            `https://ai-gateway.vercel.sh/v1/models/${model.id}/endpoints`,
            { next: { revalidate: 86_400 } }
          );
          if (res.ok) {
            const json = await res.json();
            const endpoints = json.data?.endpoints ?? [];
            const params = new Set(
              endpoints.flatMap(
                (e: { supported_parameters?: string[] }) =>
                  e.supported_parameters ?? []
              )
            );
            const inputModalities = new Set(
              json.data?.architecture?.input_modalities ?? []
            );

            return [
              model.id,
              {
                tools: params.has("tools"),
                vision: inputModalities.has("image"),
                reasoning: params.has("reasoning"),
              },
            ];
          }
        } catch {
          // Fall through to default below
        }
      }

      return [model.id, { tools: false, vision: false, reasoning: false }];
    })
  );

  return Object.fromEntries(results);
}

export const isDemo = process.env.IS_DEMO === "1";

type GatewayModel = {
  id: string;
  name: string;
  type?: string;
  tags?: string[];
};

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

export async function getAllGatewayModels(): Promise<
  GatewayModelWithCapabilities[]
> {
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return (json.data ?? [])
      .filter((m: GatewayModel) => m.type === "language")
      .map((m: GatewayModel) => ({
        id: m.id,
        name: m.name,
        provider: m.id.split("/")[0],
        description: "",
        capabilities: {
          tools: m.tags?.includes("tool-use") ?? false,
          vision: m.tags?.includes("vision") ?? false,
          reasoning: m.tags?.includes("reasoning") ?? false,
        },
      }));
  } catch {
    return [];
  }
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
