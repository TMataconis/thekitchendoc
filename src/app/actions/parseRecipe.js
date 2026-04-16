"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MODEL = "claude-sonnet-4-5";

function buildSystemPrompt(categories) {
  const categoryList = categories
    .map((c) => `${c.name} (id:${c.id})`)
    .join(", ");

  return `You are a recipe parser. The user will paste raw recipe text. Return ONLY a single valid JSON object — no markdown, no code fences, no explanation, nothing else.

Available categories: ${categoryList}

The JSON must match this schema exactly:
{
  "title": string (required, the recipe name),
  "categoryId": number | null (pick the most appropriate category id from the list above, or null if uncertain),
  "servings": string (e.g. "4 servings", "serves 6", or "" if unknown),
  "notes": string (general recipe notes or tips, or ""),
  "ingredientGroups": [
    {
      "name": string (section label like "For the sauce" or "" for ungrouped),
      "ingredients": [
        {
          "amount": string (numeric quantity like "1", "2½", "¼", or ""),
          "unit": string (e.g. "cup", "tbsp", "g", "oz", or "" for unitless),
          "name": string (required, the ingredient name),
          "note": string (preparation note like "finely diced", "room temperature", or "")
        }
      ]
    }
  ],
  "instructionGroups": [
    {
      "name": string (section label or ""),
      "instructions": [
        {
          "text": string (required, the step text — do not include a step number prefix),
          "subSteps": [
            {
              "label": string (e.g. "a", "b", "i", or ""),
              "text": string (required)
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Always produce at least one ingredientGroup and one instructionGroup, even if name is "".
- Never invent ingredients or steps not present in the source text.
- Strip any step-number prefixes ("1.", "Step 1:", etc.) from instruction text — stepNumber is managed by the app.
- For categoryId: only use an id from the provided list. If none fits well, use null.
- Return valid JSON only. Any deviation will break the application.`;
}

// ── Zod schemas ──────────────────────────────────────────────────────────────

const IngredientSchema = z.object({
  amount: z.string().default(""),
  unit: z.string().default(""),
  name: z.string().min(1, "Ingredient name is required"),
  note: z.string().default(""),
});

const IngredientGroupSchema = z.object({
  name: z.string().default(""),
  ingredients: z.array(IngredientSchema).min(1),
});

const SubStepSchema = z.object({
  label: z.string().default(""),
  text: z.string().min(1, "Sub-step text is required"),
});

const InstructionSchema = z.object({
  text: z.string().min(1, "Instruction text is required"),
  subSteps: z.array(SubStepSchema).default([]),
});

const InstructionGroupSchema = z.object({
  name: z.string().default(""),
  instructions: z.array(InstructionSchema).min(1),
});

const ParsedRecipeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  categoryId: z.number().int().positive().nullable().default(null),
  servings: z.string().default(""),
  notes: z.string().default(""),
  ingredientGroups: z.array(IngredientGroupSchema).min(1),
  instructionGroups: z.array(InstructionGroupSchema).min(1),
});

// ── Sanitization ─────────────────────────────────────────────────────────────

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, "").trim();
}

function sanitizeStr(str) {
  return stripHtml(String(str ?? "")).trim();
}

function sanitizeParsed(data) {
  return {
    title: sanitizeStr(data.title),
    categoryId: typeof data.categoryId === "number" ? data.categoryId : null,
    servings: sanitizeStr(data.servings),
    notes: sanitizeStr(data.notes),
    ingredientGroups: data.ingredientGroups.map((g) => ({
      name: sanitizeStr(g.name),
      ingredients: g.ingredients.map((ing) => ({
        amount: sanitizeStr(ing.amount),
        unit: sanitizeStr(ing.unit),
        name: sanitizeStr(ing.name),
        note: sanitizeStr(ing.note),
      })),
    })),
    instructionGroups: data.instructionGroups.map((g) => ({
      name: sanitizeStr(g.name),
      instructions: g.instructions.map((inst) => ({
        text: sanitizeStr(inst.text),
        subSteps: (inst.subSteps ?? []).map((s) => ({
          label: sanitizeStr(s.label),
          text: sanitizeStr(s.text),
        })),
      })),
    })),
  };
}

// ── Server action ─────────────────────────────────────────────────────────────

export async function parseRecipe(rawText) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can use AI parsing." };
  }

  const trimmed = rawText?.trim();
  if (!trimmed) {
    return { error: "No recipe text provided." };
  }

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let responseText;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: buildSystemPrompt(categories),
      messages: [{ role: "user", content: trimmed }],
    });
    responseText = message.content[0]?.text ?? "";
  } catch (err) {
    console.error("Anthropic API error:", err);
    return { error: "Failed to reach the AI service. Check your API key." };
  }

  // Strip any accidental markdown code fences
  const jsonText = responseText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let raw;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    console.error("JSON parse failed. Raw response:", responseText);
    return { error: "AI returned invalid JSON. Please try again." };
  }

  const sanitized = sanitizeParsed(raw);

  const result = ParsedRecipeSchema.safeParse(sanitized);
  if (!result.success) {
    console.error("Zod validation failed:", result.error.flatten());
    return { error: "AI response didn't match expected recipe structure. Please try again." };
  }

  return { recipe: result.data };
}
