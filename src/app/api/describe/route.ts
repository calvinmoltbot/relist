import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface RequestBody {
  image?: string | null;
  brand?: string;
  category?: string;
  condition?: string;
  size?: string;
  style_notes?: string;
  tone: "casual" | "professional" | "trendy";
  length: "short" | "medium" | "long";
}

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

  const desc = descriptions[body.tone] || descriptions.casual;

  return {
    description: desc,
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

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // If no API key, return mock response
    if (!apiKey) {
      // Simulate a small delay for realism
      await new Promise((r) => setTimeout(r, 1200));
      return NextResponse.json(getMockResponse(body));
    }

    const client = new Anthropic({ apiKey });

    // Build user message content
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    // Add image if provided
    if (body.image) {
      // Extract media type and base64 data
      const match = body.image.match(
        /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/
      );
      if (match) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: match[1] as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: match[2],
          },
        });
      }
    }

    // Build context text
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

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: buildSystemPrompt(body.tone, body.length),
      messages: [{ role: "user", content }],
    });

    // Extract text from response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Parse JSON response
    const parsed = JSON.parse(responseText);

    return NextResponse.json({
      description: parsed.description,
      hashtags: parsed.hashtags || [],
      detected_brand: parsed.detected_brand || null,
      detected_category: parsed.detected_category || null,
    });
  } catch (error) {
    console.error("Describe API error:", error);
    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
