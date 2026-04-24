// =============================================================================
// Open Brain: Embedding & Metadata Extraction Service
// =============================================================================

import OpenAI from "openai";
import type { ExtractedMetadata } from "../types.js";
import {
  EMBEDDING_MODEL,
  METADATA_MODEL,
  METADATA_EXTRACTION_PROMPT,
} from "../constants.js";
import { ExtractedMetadataSchema } from "../schemas/metadata.js";

let openai: OpenAI;

export function initOpenAI(): void {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY environment variable. " +
      "Set this in your .env file or environment."
    );
  }

  openai = new OpenAI({ apiKey });
}

function getOpenAI(): OpenAI {
  if (!openai) {
    throw new Error("OpenAI not initialized. Call initOpenAI() first.");
  }
  return openai;
}

function buildMetadataFallback(rawText: string): ExtractedMetadata {
  return {
    thought_type: "general",
    people: [],
    topics: ["uncategorized"],
    action_items: [],
    summary: rawText.slice(0, 100),
  };
}

// -----------------------------------------------------------------------------
// Generate a vector embedding for text
// -----------------------------------------------------------------------------
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAI();

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

// -----------------------------------------------------------------------------
// Extract metadata from raw thought text using an LLM
// -----------------------------------------------------------------------------
export async function extractMetadata(
  rawText: string
): Promise<ExtractedMetadata> {
  const client = getOpenAI();

  try {
    const response = await client.chat.completions.create({
      model: METADATA_MODEL,
      temperature: 0.1,
      messages: [
        { role: "system", content: METADATA_EXTRACTION_PROMPT },
        { role: "user", content: rawText },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() || "{}";

    // Strip markdown fences if present
    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const validated = ExtractedMetadataSchema.safeParse(parsed);

    if (!validated.success) {
      console.error(
        "Metadata extraction returned invalid JSON shape, using defaults:",
        validated.error.flatten()
      );
      return buildMetadataFallback(rawText);
    }

    if (validated.data.topics.length === 0) {
      return {
        ...validated.data,
        topics: ["uncategorized"],
      };
    }

    return validated.data;
  } catch (err) {
    // Fallback: if LLM extraction fails, use sensible defaults
    console.error("Metadata extraction failed, using defaults:", err);
    return buildMetadataFallback(rawText);
  }
}

// -----------------------------------------------------------------------------
// Process a thought: generate embedding + extract metadata in parallel
// -----------------------------------------------------------------------------
export async function processThought(
  rawText: string
): Promise<{ embedding: number[]; metadata: ExtractedMetadata }> {
  const [embedding, metadata] = await Promise.all([
    generateEmbedding(rawText),
    extractMetadata(rawText),
  ]);

  return { embedding, metadata };
}
