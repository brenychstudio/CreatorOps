type Tone = "minimal" | "neutral" | "emotional" | "sales";
type Length = "short" | "medium" | "long";
type Source = "openai" | "fallback";

type CaptionItem = {
  id: string;
  day?: string;
  slot?: string;
  captionSeed?: string;
  visualNotes?: string[];
  assetTags?: string[];
};

type GenerateCaptionsRequest = {
  mode: "single" | "pack";
  tone: Tone;
  length: Length;
  post?: CaptionItem;
  pack?: CaptionItem[];
  brandContext?: {
    audience?: string;
    offer?: string;
    niche?: string;
    voice?: string;
    ctaGoal?: string;
  };
};

type CaptionResult = {
  id: string;
  caption: string;
  hashtags: string[];
  cta: string;
  alt: string;
};

type GenerateCaptionsResponse = {
  ok: boolean;
  source: Source;
  results: CaptionResult[];
  error?: string;
};

type Env = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

type FunctionContext = {
  request: Request;
  env: Env;
};

const TONES = new Set<Tone>(["minimal", "neutral", "emotional", "sales"]);
const LENGTHS = new Set<Length>(["short", "medium", "long"]);
const DAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

function json(body: GenerateCaptionsResponse, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

function trimString(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

function cleanList(value: unknown, maxItems = 6, maxLength = 48) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => trimString(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
}

function cleanItem(value: unknown, fallbackId: string): CaptionItem {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const day = trimString(raw.day, 12);
  return {
    id: trimString(raw.id, 80) || fallbackId,
    day: day && DAYS.has(day) ? day : undefined,
    slot: trimString(raw.slot, 40),
    captionSeed: trimString(raw.captionSeed, 500),
    visualNotes: cleanList(raw.visualNotes, 6, 80),
    assetTags: cleanList(raw.assetTags, 8, 40),
  };
}

function normalizeRequest(raw: unknown): { ok: true; data: GenerateCaptionsRequest; items: CaptionItem[] } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid JSON body." };
  const body = raw as Record<string, unknown>;
  const mode = body.mode === "pack" ? "pack" : body.mode === "single" ? "single" : undefined;
  const tone = trimString(body.tone, 24)?.toLowerCase() as Tone | undefined;
  const length = trimString(body.length, 24)?.toLowerCase() as Length | undefined;

  if (!mode) return { ok: false, error: "Invalid mode." };
  if (!tone || !TONES.has(tone)) return { ok: false, error: "Invalid tone." };
  if (!length || !LENGTHS.has(length)) return { ok: false, error: "Invalid length." };

  const pack = Array.isArray(body.pack) ? body.pack.slice(0, 9).map((item, index) => cleanItem(item, `post-${index + 1}`)) : undefined;
  const post = cleanItem(body.post, "post-01");
  const items = mode === "pack" ? pack ?? [post] : [post];

  const brandRaw = body.brandContext && typeof body.brandContext === "object" ? (body.brandContext as Record<string, unknown>) : {};
  const brandContext = {
    audience: trimString(brandRaw.audience, 120),
    offer: trimString(brandRaw.offer, 160),
    niche: trimString(brandRaw.niche, 120),
    voice: trimString(brandRaw.voice, 120),
    ctaGoal: trimString(brandRaw.ctaGoal, 120),
  };

  return {
    ok: true,
    data: { mode, tone, length, post, pack, brandContext },
    items,
  };
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const fallbackCaptions: Record<Tone, string[]> = {
  minimal: [
    "A cleaner content rhythm starts with one clear decision.",
    "Quiet structure. Stronger output.",
    "Less noise, more rhythm.",
  ],
  neutral: [
    "A clearer publishing rhythm starts with the next planned post.",
    "A simple content system can make the whole week easier to run.",
    "Plan the rhythm once, then keep moving.",
  ],
  emotional: [
    "A calm content rhythm can change the way the whole week feels.",
    "This is the moment where the plan starts to feel real.",
    "Quiet clarity can carry the whole publishing week.",
  ],
  sales: [
    "Turn one clear content decision into a repeatable publishing rhythm.",
    "Use this structure to make your next content batch easier to ship.",
    "Build the system once, then let the rhythm compound.",
  ],
};

function fallbackFor(item: CaptionItem, tone: Tone, length: Length): CaptionResult {
  const pool = fallbackCaptions[tone];
  const index = hash(`${item.id}|${tone}|${length}`) % pool.length;
  const base = pool[index];
  const caption =
    length === "long"
      ? `${base} Keep the visual direction focused, protect the message, and move the post into the week with intent.`
      : length === "medium"
        ? `${base} Save it as a reference before your next batch.`
        : base;

  return {
    id: item.id,
    caption,
    hashtags: ["#creatorworkflow", "#contentplanning", "#creatorops", "#publishingrhythm", "#workflow", "#contentstrategy"],
    cta: "Save this for your next content batch.",
    alt: "A clear rhythm makes the next content decision easier.",
  };
}

function fallbackResponse(items: CaptionItem[], tone: Tone, length: Length): GenerateCaptionsResponse {
  return {
    ok: true,
    source: "fallback",
    results: items.map((item) => fallbackFor(item, tone, length)),
  };
}

function schemaFor(count: number) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      results: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            caption: { type: "string" },
            hashtags: {
              type: "array",
              minItems: 6,
              maxItems: 10,
              items: { type: "string" },
            },
            cta: { type: "string" },
            alt: { type: "string" },
          },
          required: ["id", "caption", "hashtags", "cta", "alt"],
        },
      },
    },
    required: ["results"],
  };
}

function extractOutputText(data: unknown) {
  const response = data as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof response.output_text === "string") return response.output_text;
  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => (typeof content.text === "string" ? content.text : ""))
      .join("") ?? ""
  );
}

function normalizeResult(result: CaptionResult, fallback: CaptionResult): CaptionResult {
  const hashtags = Array.isArray(result.hashtags)
    ? result.hashtags
        .map((tag) => trimString(tag, 40))
        .filter((tag): tag is string => Boolean(tag))
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replace(/^#+/, "")}`))
        .slice(0, 10)
    : fallback.hashtags;

  return {
    id: trimString(result.id, 80) || fallback.id,
    caption: trimString(result.caption, 700) || fallback.caption,
    hashtags: hashtags.length >= 3 ? hashtags : fallback.hashtags,
    cta: trimString(result.cta, 160) || fallback.cta,
    alt: trimString(result.alt, 700) || fallback.alt,
  };
}

async function callOpenAI(env: Env, requestData: GenerateCaptionsRequest, items: CaptionItem[]) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  const payload = {
    model,
    input: [
      {
        role: "system",
        content:
          "You generate Instagram-ready captions for CreatorOps, a premium creator workflow product. Return JSON only. No markdown, no explanations, no fake claims, no 'as an AI' language.",
      },
      {
        role: "user",
        content: JSON.stringify({
          rules: {
            tone: requestData.tone,
            length: requestData.length,
            hashtags: "6-10 relevant hashtags",
            cta: "one short sentence",
            alt: "one alternative caption",
          },
          context: requestData,
          items,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "creatorops_caption_generation",
        strict: true,
        schema: schemaFor(items.length),
      },
    },
    max_output_tokens: 1600,
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const text = extractOutputText(data);
  if (!text) return null;

  const parsed = JSON.parse(text) as { results?: CaptionResult[] };
  if (!Array.isArray(parsed.results)) return null;

  const fallbacks = items.map((item) => fallbackFor(item, requestData.tone, requestData.length));
  return parsed.results.slice(0, items.length).map((result, index) => normalizeResult(result, fallbacks[index]));
}

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "POST" },
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, source: "fallback", results: [], error: "Invalid JSON body." }, { status: 400 });
  }

  const normalized = normalizeRequest(raw);
  if (normalized.ok === false) {
    return json({ ok: false, source: "fallback", results: [], error: normalized.error }, { status: 400 });
  }

  const fallback = fallbackResponse(normalized.items, normalized.data.tone, normalized.data.length);

  try {
    const openaiResults = await callOpenAI(env, normalized.data, normalized.items);
    if (!openaiResults) return json(fallback);
    return json({ ok: true, source: "openai", results: openaiResults });
  } catch {
    return json(fallback);
  }
};
