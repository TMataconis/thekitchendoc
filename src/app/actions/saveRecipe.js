"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ── Zod schema ────────────────────────────────────────────────────────────────

const IngredientSchema = z.object({
  amount: z.string().default(""),
  unit: z.string().default(""),
  name: z.string().min(1),
  note: z.string().default(""),
});

const IngredientGroupSchema = z.object({
  name: z.string().default(""),
  ingredients: z.array(IngredientSchema),
});

const SubStepSchema = z.object({
  label: z.string().default(""),
  text: z.string().min(1),
});

const InstructionSchema = z.object({
  text: z.string().min(1),
  subSteps: z.array(SubStepSchema).default([]),
});

const InstructionGroupSchema = z.object({
  name: z.string().default(""),
  instructions: z.array(InstructionSchema),
});

const SaveRecipeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  servings: z.string().default(""),
  notes: z.string().default(""),
  categoryId: z.coerce.number().int().positive("Category is required"),
  tags: z.array(z.string()).default([]),
  ingredientGroups: z.array(IngredientGroupSchema).default([]),
  instructionGroups: z.array(InstructionGroupSchema).default([]),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, "").trim();
}

function sanitize(str) {
  return stripHtml(String(str ?? "")).trim();
}

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base, tx) {
  let slug = base;
  let n = 1;
  while (await tx.recipe.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

// ── Server action ─────────────────────────────────────────────────────────────

export async function saveRecipe(formData) {
  const session = await auth();

  if (!session?.user) return { error: "Not authenticated." };
  const { role, id: userId } = session.user;
  if (role !== "ADMIN" && role !== "CONTRIBUTOR") {
    return { error: "Insufficient permissions." };
  }

  // Sanitize all string fields before validation
  const sanitized = {
    ...formData,
    title: sanitize(formData.title ?? ""),
    servings: sanitize(formData.servings ?? ""),
    notes: sanitize(formData.notes ?? ""),
    tags: (formData.tags ?? []).map((t) => sanitize(t)).filter(Boolean),
    ingredientGroups: (formData.ingredientGroups ?? []).map((g) => ({
      name: sanitize(g.name ?? ""),
      ingredients: (g.ingredients ?? []).map((ing) => ({
        amount: sanitize(ing.amount ?? ""),
        unit: sanitize(ing.unit ?? ""),
        name: sanitize(ing.name ?? ""),
        note: sanitize(ing.note ?? ""),
      })),
    })),
    instructionGroups: (formData.instructionGroups ?? []).map((g) => ({
      name: sanitize(g.name ?? ""),
      instructions: (g.instructions ?? []).map((inst) => ({
        text: sanitize(inst.text ?? ""),
        subSteps: (inst.subSteps ?? []).map((s) => ({
          label: sanitize(s.label ?? ""),
          text: sanitize(s.text ?? ""),
        })),
      })),
    })),
  };

  const parsed = SaveRecipeSchema.safeParse(sanitized);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { error: first?.message ?? "Validation error." };
  }

  const { title, servings, notes, categoryId, tags, ingredientGroups, instructionGroups } =
    parsed.data;

  try {
    const recipe = await prisma.$transaction(async (tx) => {
      const slug = await uniqueSlug(toSlug(title), tx);

      // Upsert tags by slug
      const tagRecords = await Promise.all(
        tags.map((name) =>
          tx.tag.upsert({
            where: { slug: toSlug(name) },
            create: { name, slug: toSlug(name) },
            update: {},
          })
        )
      );

      // Create the recipe with nested ingredient groups
      const newRecipe = await tx.recipe.create({
        data: {
          title,
          slug,
          servings,
          notes,
          sortOrder: 0,
          categoryId,
          createdById: userId,
          tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
          ingredientGroups: {
            create: ingredientGroups.map((g, gi) => ({
              name: g.name,
              sortOrder: gi,
              ingredients: {
                create: g.ingredients.map((ing, ii) => ({
                  amount: ing.amount,
                  unit: ing.unit,
                  name: ing.name,
                  note: ing.note,
                  sortOrder: ii,
                })),
              },
            })),
          },
        },
      });

      // Instruction groups need sequential creation so sub-steps can reference parent IDs
      for (const [gi, group] of instructionGroups.entries()) {
        const ig = await tx.instructionGroup.create({
          data: { name: group.name, sortOrder: gi, recipeId: newRecipe.id },
        });

        for (const [ii, inst] of group.instructions.entries()) {
          const instruction = await tx.instruction.create({
            data: {
              stepNumber: ii + 1,
              stepLabel: "",
              text: inst.text,
              sortOrder: ii,
              groupId: ig.id,
            },
          });

          for (const [si, sub] of (inst.subSteps ?? []).entries()) {
            await tx.instruction.create({
              data: {
                stepNumber: si + 1,
                stepLabel: sub.label,
                text: sub.text,
                sortOrder: si,
                groupId: ig.id,
                parentInstructionId: instruction.id,
              },
            });
          }
        }
      }

      return newRecipe;
    });

    return { id: recipe.id };
  } catch (err) {
    console.error("saveRecipe error:", err);
    return { error: "Failed to save recipe. Please try again." };
  }
}
