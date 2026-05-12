import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type AiProvider = "openai" | "gemini" | "azure" | "local" | "disabled" | "human_fallback";

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  provider?: AiProvider;
  providerLabel?: string;
  fallbackReason?: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

type ProviderRuntime = {
  provider: Exclude<AiProvider, "disabled" | "human_fallback">;
  label: string;
  transport: "openai-compatible" | "gemini-native";
  apiUrl: string;
  apiKey: string;
  model: string;
  headers?: Record<string, string>;
};

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") return part;
  if (part.type === "image_url") return part;
  if (part.type === "file_url") return part;

  throw new Error("Unsupported message content part");
};

const contentToText = (content: MessageContent | MessageContent[]) =>
  ensureArray(content)
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      if (part.type === "image_url") return `[imagem: ${part.image_url.url}]`;
      if (part.type === "file_url") return `[arquivo: ${part.file_url.url}]`;
      return "";
    })
    .filter(Boolean)
    .join("\n");

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error("tool_choice 'required' was provided but no tools were configured");
    }

    if (tools.length > 1) {
      throw new Error("tool_choice 'required' needs a single tool or specify the tool name explicitly");
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error("responseFormat json_schema requires a defined schema object");
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const normalizeProvider = (value: string): AiProvider | "auto" => {
  const provider = value.trim().toLowerCase();
  if (["openai", "gemini", "azure", "local", "disabled"].includes(provider)) {
    return provider as AiProvider;
  }
  return "auto";
};

const resolveForgeApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

const openAiRuntime = (): ProviderRuntime | null => {
  if (!ENV.openaiApiKey) return null;
  return {
    provider: "openai",
    label: "OpenAI Cloud",
    transport: "openai-compatible",
    apiUrl: ENV.openaiApiUrl || "https://api.openai.com/v1/chat/completions",
    apiKey: ENV.openaiApiKey,
    model: ENV.openaiModel || "gpt-4o-mini",
  };
};

const geminiNativeRuntime = (): ProviderRuntime | null => {
  if (!ENV.geminiApiKey) return null;
  const model = ENV.geminiModel || "gemini-2.0-flash";
  return {
    provider: "gemini",
    label: "Gemini Cloud",
    transport: "gemini-native",
    apiUrl: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`,
    apiKey: ENV.geminiApiKey,
    model,
  };
};

const forgeGeminiRuntime = (): ProviderRuntime | null => {
  if (!ENV.forgeApiKey) return null;
  return {
    provider: "gemini",
    label: "Gemini Cloud",
    transport: "openai-compatible",
    apiUrl: resolveForgeApiUrl(),
    apiKey: ENV.forgeApiKey,
    model: ENV.geminiModel || "gemini-2.5-flash",
  };
};

const azureRuntime = (): ProviderRuntime | null => {
  if (!ENV.azureOpenaiApiKey || !ENV.azureOpenaiEndpoint || !ENV.azureOpenaiDeployment) return null;
  const endpoint = ENV.azureOpenaiEndpoint.replace(/\/$/, "");
  const apiVersion = ENV.azureOpenaiApiVersion || "2024-08-01-preview";
  return {
    provider: "azure",
    label: "Azure OpenAI",
    transport: "openai-compatible",
    apiUrl: `${endpoint}/openai/deployments/${encodeURIComponent(ENV.azureOpenaiDeployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
    apiKey: ENV.azureOpenaiApiKey,
    model: ENV.azureOpenaiDeployment,
    headers: { "api-key": ENV.azureOpenaiApiKey },
  };
};

const localRuntime = (): ProviderRuntime | null => {
  if (!ENV.localAiUrl) return null;
  const base = ENV.localAiUrl.replace(/\/$/, "");
  return {
    provider: "local",
    label: "IA local opcional",
    transport: "openai-compatible",
    apiUrl: base.endsWith("/v1/chat/completions") ? base : `${base}/v1/chat/completions`,
    apiKey: process.env.LOCAL_AI_API_KEY || "local",
    model: ENV.localAiModel || "synapse-local",
  };
};

const compactRuntime = (runtime: ProviderRuntime | null) => runtime ? [runtime] : [];

const providerChain = (): ProviderRuntime[] => {
  const preferred = normalizeProvider(ENV.aiProvider);
  const openai = openAiRuntime();
  const gemini = geminiNativeRuntime() || forgeGeminiRuntime();
  const azure = azureRuntime();
  const local = localRuntime();

  if (preferred === "disabled") return [];
  if (preferred === "openai") return [...compactRuntime(openai), ...compactRuntime(gemini)];
  if (preferred === "gemini") return compactRuntime(gemini);
  if (preferred === "azure") return compactRuntime(azure);
  if (preferred === "local") return compactRuntime(local);

  return [
    ...compactRuntime(openai),
    ...compactRuntime(gemini),
    ...compactRuntime(azure),
    ...compactRuntime(local),
  ];
};

export function getAiRuntimeSummary() {
  const preferred = normalizeProvider(ENV.aiProvider);
  const candidates = providerChain();
  return {
    configuredProvider: preferred,
    activeProvider: candidates[0]?.provider ?? "human_fallback",
    activeProviderLabel: candidates[0]?.label ?? "Fallback humano",
    cloudConfigured: candidates.some((item) => ["openai", "gemini", "azure"].includes(item.provider)),
    localConfigured: Boolean(localRuntime()),
    availableProviders: candidates.map((item) => ({ provider: item.provider, label: item.label, model: item.model })),
    fallback: candidates.length === 0 ? "human_fallback" : "automatic",
  };
}

const buildOpenAiPayload = (params: InvokeParams) => {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = params.maxTokens || params.max_tokens || 32768;
  payload.thinking = {
    budget_tokens: 128,
  };

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  return payload;
};

const invokeOpenAiCompatible = async (runtime: ProviderRuntime, params: InvokeParams): Promise<InvokeResult> => {
  const payload = {
    model: runtime.model,
    ...buildOpenAiPayload(params),
  };
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${runtime.apiKey}`,
    ...(runtime.headers || {}),
  };
  if (runtime.provider === "azure") {
    delete headers.authorization;
  }

  const response = await fetch(runtime.apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM invoke failed (${runtime.label}): ${response.status} ${response.statusText} - ${errorText}`);
  }

  return {
    ...((await response.json()) as InvokeResult),
    provider: runtime.provider,
    providerLabel: runtime.label,
  };
};

const invokeGeminiNative = async (runtime: ProviderRuntime, params: InvokeParams): Promise<InvokeResult> => {
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat: params.responseFormat,
    response_format: params.response_format,
    outputSchema: params.outputSchema,
    output_schema: params.output_schema,
  });
  const systemText = params.messages
    .filter((message) => message.role === "system")
    .map((message) => contentToText(message.content))
    .filter(Boolean)
    .join("\n\n");
  const contents = params.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: contentToText(message.content) }],
    }));

  const response = await fetch(runtime.apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
      contents,
      generationConfig: {
        maxOutputTokens: params.maxTokens || params.max_tokens || 4096,
        ...(normalizedResponseFormat && normalizedResponseFormat.type !== "text" ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM invoke failed (${runtime.label}): ${response.status} ${response.statusText} - ${errorText}`);
  }

  const json: any = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || "").join("\n").trim() || "";
  return {
    id: json?.responseId || `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: runtime.model,
    provider: runtime.provider,
    providerLabel: runtime.label,
    choices: [{
      index: 0,
      message: { role: "assistant", content: text },
      finish_reason: json?.candidates?.[0]?.finishReason || "stop",
    }],
    usage: json?.usageMetadata ? {
      prompt_tokens: Number(json.usageMetadata.promptTokenCount || 0),
      completion_tokens: Number(json.usageMetadata.candidatesTokenCount || 0),
      total_tokens: Number(json.usageMetadata.totalTokenCount || 0),
    } : undefined,
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const candidates = providerChain();
  if (candidates.length === 0) {
    throw new Error("AI_FALLBACK_HUMAN_REQUIRED: nenhum provider cloud/local configurado.");
  }

  let lastError: unknown = null;
  for (const runtime of candidates) {
    try {
      return runtime.transport === "gemini-native"
        ? await invokeGeminiNative(runtime, params)
        : await invokeOpenAiCompatible(runtime, params);
    } catch (error) {
      lastError = error;
      console.warn(`[synapse-ai] Provider ${runtime.label} indisponível, tentando fallback.`, error);
    }
  }

  throw new Error(`AI_FALLBACK_HUMAN_REQUIRED: ${(lastError as Error)?.message || "providers indisponíveis"}`);
}
