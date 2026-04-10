import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface RequestBody {
  image?: string | null;
  brand?: string;
  category?: string;
  condition?: string;
  size?: string;
  style_notes?: string;
  tone: "casual" | "professional" | "trendy";
  length: "short" | "medium" | "long";
  model?: string;
}

// Note: this is intentionally not exported from the route file
// (Next.js route files can only export HTTP methods).
// The describe page and tests define their own model lists.
const AVAILABLE_MODELS = [
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini Flash Lite",
    description: "Best balance of quality & cost",
    costPer1k: "$0.25",
    tier: "recommended",
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    description: "Great natural copy",
    costPer1k: "$0.19",
    tier: "recommended",
  },
  {
    id: "qwen/qwen3.5-flash-02-23",
    name: "Qwen3.5 Flash",
    description: "Strong structured extraction",
    costPer1k: "$0.16",
    tier: "budget",
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct",
    name: "Mistral Small 3.1",
    description: "Cheapest — good enough for most",
    costPer1k: "$0.07",
    tier: "budget",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 (Free)",
    description: "Free tier — rate limited",
    costPer1k: "Free",
    tier: "free",
  },
] as const;

const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

const lengthGuide = {
  short: "2-3 sentences, punchy and concise",
  medium: "4-6 sentences, balanced detail",
  long: "7-10 sentences, comprehensive with styling tips",
};

const toneGuide = {
  casual:
    "Friendly, warm, conversational. Use emojis sparingly (1-2). Feel approachable like messaging a friend.",
  professional:
    "Clean, factual, well-structured. No emojis. Focus on item details and condition.",
  trendy:
    "Upbeat, fashion-forward, Gen-Z/millennial energy. Use trendy language and a few emojis. Reference current styles.",
};

function buildSystemPrompt(tone: string, length: string): string {
  return `You are an expert Vinted listing copywriter. Generate a product description optimized for selling on Vinted.

TONE: ${toneGuide[tone as keyof typeof toneGuide]}
LENGTH: ${lengthGuide[length as keyof typeof lengthGuide]}

Rules:
- Write the description as if the seller is posting it directly — first person
- Be copy-paste ready for Vinted (no markdown formatting, just plain text)
- If a photo is provided, describe visible details (color, material, pattern, brand logos, condition)
- Include practical details: fit, styling suggestions, care info if relevant
- End with a friendly closing line encouraging questions
- After the description, on a new line, include 5-8 relevant hashtags starting with #
- Each hashtag should be a single word or camelCase (e.g. #VintageLevis not #vintage levis)

Respond in this exact JSON format:
{
  "description": "The full listing description text including hashtags at the end",
  "hashtags": ["vintage", "brandname", "category", "secondhand", "preloved"],
  "detected_brand": "Brand name if visible/mentioned or null",
  "detected_category": "Item category if identifiable or null"
}

Respond ONLY with the JSON, no other text.`;
}

function getMockResponse(body: RequestBody) {
  const brand = body.brand || "vintage";
  const category = body.category || "top";
  const condition = body.condition || "great";
  const size = body.size || "M";

  const descriptions: Record<string, string> = {
    casual: `Beautiful ${brand} ${category} in ${condition} condition! Love this piece but it's time for it to find a new home. The color is gorgeous and it pairs perfectly with jeans or a skirt. Size ${size}. From a smoke-free, pet-free home. Happy to answer any questions or send more pics! \u{1F495}\n\n#${brand.toLowerCase().replace(/\s+/g, "")} #${category.toLowerCase()} #secondhand #preloved #sustainablefashion #vintageStyle #thrifted`,
    professional: `${brand} ${category} in ${condition} condition. Size ${size}. Well-maintained with no visible flaws or defects. Fabric is soft to the touch with good structure remaining. Measurements available upon request. Comes from a smoke-free environment. Please don't hesitate to reach out with any questions.\n\n#${brand.toLowerCase().replace(/\s+/g, "")} #${category.toLowerCase()} #designerResale #secondhand #preloved #qualityFashion`,
    trendy: `obsessed with this ${brand} ${category} but doing a wardrobe refresh!! \u{2728} literally the perfect ${category} for that effortless cool-girl vibe. in ${condition} condition, size ${size}. styled it so many ways - with baggy jeans, mini skirts, layered over dresses. such a versatile piece! grab it before someone else does \u{1F525}\n\n#${brand.toLowerCase().replace(/\s+/g, "")} #${category.toLowerCase()} #y2k #streetstyle #preloved #sustainableFashion #thriftFlip #coolgirl`,
  };

  return {
    description: descriptions[body.tone] || descriptions.casual,
    hashtags: [
      brand.toLowerCase().replace(/\s+/g, ""),
      category.toLowerCase(),
      "secondhand",
      "preloved",
      "sustainablefashion",
      "vintage",
    ],
    detected_brand: body.brand || null,
    detected_category: body.category || null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      await new Promise((r) => setTimeout(r, 1200));
      return NextResponse.json(getMockResponse(body));
    }

    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });

    const modelId = body.model || DEFAULT_MODEL;

    // Build user message content
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    if (body.image) {
      content.push({
        type: "image_url",
        image_url: { url: body.image },
      });
    }

    const contextParts: string[] = [];
    if (body.brand) contextParts.push(`Brand: ${body.brand}`);
    if (body.category) contextParts.push(`Category: ${body.category}`);
    if (body.condition) contextParts.push(`Condition: ${body.condition}`);
    if (body.size) contextParts.push(`Size: ${body.size}`);
    if (body.style_notes)
      contextParts.push(`Style notes: ${body.style_notes}`);

    const userText = contextParts.length
      ? `Generate a Vinted listing description for this item.\n\nSeller-provided details:\n${contextParts.join("\n")}`
      : "Generate a Vinted listing description for this item based on the photo.";

    content.push({ type: "text", text: userText });

    // Try the requested model, fall back to alternatives on rate limit
    const fallbackModels = [
      modelId,
      "google/gemini-2.5-flash-lite",
      "mistralai/mistral-small-3.1-24b-instruct",
    ].filter((m, i, a) => a.indexOf(m) === i); // dedupe

    let completion;
    let usedModel = modelId;

    for (const tryModel of fallbackModels) {
      try {
        completion = await client.chat.completions.create({
          model: tryModel,
          max_tokens: 1024,
          messages: [
            { role: "system", content: buildSystemPrompt(body.tone, body.length) },
            { role: "user", content },
          ],
        });
        usedModel = tryModel;
        break;
      } catch (e: unknown) {
        const status = (e as { status?: number }).status;
        if (status === 429 && tryModel !== fallbackModels[fallbackModels.length - 1]) {
          continue; // Try next model
        }
        throw e; // Re-throw if not rate-limited or last model
      }
    }

    if (!completion) {
      return NextResponse.json(getMockResponse(body));
    }

    const responseText = completion.choices[0]?.message?.content || "";

    // Try to parse JSON, handle models that wrap in markdown code blocks
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        description: responseText,
        hashtags: [],
        detected_brand: null,
        detected_category: null,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      description: parsed.description,
      hashtags: parsed.hashtags || [],
      detected_brand: parsed.detected_brand || null,
      detected_category: parsed.detected_category || null,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; error?: { message?: string } };
    console.error("Describe API error:", err.message, err.status, JSON.stringify(err.error ?? {}));

    const status = err.status ?? 500;
    const message = err.error?.message || err.message || "Failed to generate description";

    // Provide helpful error messages
    if (status === 413) {
      return NextResponse.json(
        { error: "Image too large — try a smaller photo" },
        { status: 413 },
      );
    }
    if (status === 429) {
      return NextResponse.json(
        { error: "Rate limited — try a different model or wait a moment" },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
