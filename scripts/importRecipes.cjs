/**
 * importRecipes.cjs
 *
 * Reads scripts/output.json and bulk-inserts into the database via Prisma.
 *
 * Usage:
 *   node scripts/importRecipes.cjs
 *
 * Features:
 *   - Looks up first ADMIN user automatically for createdById
 *   - Skips recipes that already exist by slug (logs which were skipped)
 *   - Imports parent recipes first, then variations (resolves self-referential FK)
 *   - Wraps everything in a single transaction per category
 *   - Dry-run mode: set DRY_RUN=true to preview without writing
 *
 * Usage (dry run):
 *   DRY_RUN=true node scripts/importRecipes.cjs
 */

const path = require("path");
const fs = require("fs");

// Prisma client setup — mirrors src/lib/prisma.js pattern for scripts
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const INPUT_FILE = path.join(__dirname, "output.json");
const DRY_RUN = process.env.DRY_RUN === "true";

// ─── Prisma setup ─────────────────────────────────────────────────────────────

function createPrismaClient() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DIRECT_URL or DATABASE_URL environment variable not set.");
    console.error("Run: source .env.local  or set the variable before running.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function log(msg) {
  console.log(msg);
}

function warn(msg) {
  console.warn(`  ⚠️  ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) {
    log("🔍 DRY RUN MODE — no data will be written\n");
  }

  // Load output.json
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: ${INPUT_FILE} not found. Run parseRecipes.cjs first.`);
    process.exit(1);
  }
  const { categories } = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  log(`Loaded ${categories.length} categories from output.json\n`);

  const prisma = createPrismaClient();

  try {
    // ── Find admin user ──────────────────────────────────────────────────────
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    });

    if (!adminUser) {
      console.error("ERROR: No ADMIN user found in database. Sign in first to create your account.");
      process.exit(1);
    }
    log(`👤 Using admin user: ${adminUser.email}\n`);

    // ── Stats ────────────────────────────────────────────────────────────────
    const stats = {
      categoriesCreated: 0,
      categoriesExisted: 0,
      recipesCreated: 0,
      recipesSkipped: 0,
      skippedTitles: [],
    };

    // ── Process each category ────────────────────────────────────────────────
    for (let catIndex = 0; catIndex < categories.length; catIndex++) {
      const cat = categories[catIndex];
      log(`\n📂 [${catIndex + 1}/${categories.length}] ${cat.name} (${cat.recipes.length} recipes)`);

      // Upsert category
      let categoryRecord;
      if (!DRY_RUN) {
        categoryRecord = await prisma.category.findFirst({
          where: { name: cat.name },
        });

        if (categoryRecord) {
          stats.categoriesExisted++;
        } else {
          categoryRecord = await prisma.category.create({
            data: { name: cat.name, sortOrder: catIndex },
          });
          stats.categoriesCreated++;
        }
      } else {
        categoryRecord = { id: `dry-run-cat-${catIndex}`, name: cat.name };
      }

      // Split recipes into parents and variations
      const parents = cat.recipes.filter((r) => !r.isVariation);
      const variations = cat.recipes.filter((r) => r.isVariation);

      // Build a slug→id map as we create parents (needed for variation FK)
      const slugToId = {};

      // ── Import parent recipes ──────────────────────────────────────────────
      for (let i = 0; i < parents.length; i++) {
        const recipe = parents[i];
        const slug = recipe.slug || slugify(recipe.title);

        // Check for existing
        const existing = await prisma.recipe.findUnique({ where: { slug } });
        if (existing) {
          warn(`Skipping (exists): "${recipe.title}" [${slug}]`);
          stats.recipesSkipped++;
          stats.skippedTitles.push(recipe.title);
          slugToId[slug] = existing.id;
          continue;
        }

        if (DRY_RUN) {
          log(`  ✓ Would create: "${recipe.title}"`);
          slugToId[slug] = `dry-${slug}`;
          stats.recipesCreated++;
          continue;
        }

        const created = await createRecipe(prisma, recipe, {
          categoryId: categoryRecord.id,
          createdById: adminUser.id,
          sortOrder: i,
          parentRecipeId: null,
        });

        slugToId[slug] = created.id;
        stats.recipesCreated++;
        log(`  ✓ Created: "${recipe.title}"`);
      }

      // ── Import variations ──────────────────────────────────────────────────
      for (let i = 0; i < variations.length; i++) {
        const recipe = variations[i];
        const slug = recipe.slug || slugify(recipe.title);

        const existing = await prisma.recipe.findUnique({ where: { slug } });
        if (existing) {
          warn(`Skipping (exists): "${recipe.title}" [${slug}]`);
          stats.recipesSkipped++;
          stats.skippedTitles.push(recipe.title);
          continue;
        }

        // Resolve parent ID
        const parentId = recipe.parentRecipeSlug
          ? slugToId[recipe.parentRecipeSlug] || null
          : null;

        if (recipe.parentRecipeSlug && !parentId) {
          warn(`Parent not found for variation "${recipe.title}" (parent slug: ${recipe.parentRecipeSlug}) — importing without parent link`);
        }

        if (DRY_RUN) {
          log(`  ✓ Would create variation: "${recipe.title}" → parent: ${recipe.parentRecipeSlug || "none"}`);
          stats.recipesCreated++;
          continue;
        }

        await createRecipe(prisma, recipe, {
          categoryId: categoryRecord.id,
          createdById: adminUser.id,
          sortOrder: i,
          parentRecipeId: parentId,
        });

        stats.recipesCreated++;
        log(`  ✓ Created variation: "${recipe.title}"`);
      }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    log("\n─────────────────────────────────────────");
    log(`${DRY_RUN ? "🔍 DRY RUN" : "✅"} Import complete`);
    log(`   Categories created : ${stats.categoriesCreated}`);
    log(`   Categories existed : ${stats.categoriesExisted}`);
    log(`   Recipes created    : ${stats.recipesCreated}`);
    log(`   Recipes skipped    : ${stats.recipesSkipped}`);

    if (stats.skippedTitles.length > 0) {
      log(`\nSkipped recipes:`);
      stats.skippedTitles.forEach((t) => log(`   - ${t}`));
    }
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Create a single recipe with all nested data ──────────────────────────────

async function createRecipe(prisma, recipe, { categoryId, createdById, sortOrder, parentRecipeId }) {
  return await prisma.$transaction(async (tx) => {
    const created = await tx.recipe.create({
      data: {
        title: recipe.title,
        slug: recipe.slug,
        servings: recipe.servings || "",
        notes: recipe.notes.length > 0 ? recipe.notes.join("\n\n") : "",
        isVariation: recipe.isVariation,
        sortOrder,
        category: { connect: { id: categoryId } },
        createdBy: createdById ? { connect: { id: createdById } } : undefined,
        parentRecipe: parentRecipeId ? { connect: { id: parentRecipeId } } : undefined,
      },
    });

    for (let gi = 0; gi < recipe.ingredientGroups.length; gi++) {
      const group = recipe.ingredientGroups[gi];
      const ingGroup = await tx.ingredientGroup.create({
        data: {
          name: group.name || "",
          sortOrder: gi,
          recipeId: created.id,
        },
      });

      for (let ii = 0; ii < group.ingredients.length; ii++) {
        const ing = group.ingredients[ii];
        const parsed = parseIngredient(ing.raw);
        await tx.ingredient.create({
          data: {
            amount: parsed.amount || "",
            unit: parsed.unit || "",
            name: parsed.name || ing.raw,
            note: ing.note || "",
            sortOrder: ii,
            groupId: ingGroup.id,
          },
        });
      }
    }

    for (let gi = 0; gi < recipe.instructionGroups.length; gi++) {
      const group = recipe.instructionGroups[gi];
      const instGroup = await tx.instructionGroup.create({
        data: {
          name: group.name || "",
          sortOrder: gi,
          recipeId: created.id,
        },
      });

      for (let ii = 0; ii < group.instructions.length; ii++) {
        const inst = group.instructions[ii];
        await tx.instruction.create({
          data: {
            stepNumber: inst.stepNumber,
            stepLabel: "",
            text: inst.text,
            sortOrder: ii,
            groupId: instGroup.id,
          },
        });
      }
    }

    return created;
  });
}

// ─── Ingredient parser ────────────────────────────────────────────────────────
//
// Best-effort parse of strings like:
//   "2 cups all-purpose flour"        → amount: "2", unit: "cups", name: "all-purpose flour"
//   "1 ½ teaspoons salt"              → amount: "1 ½", unit: "teaspoons", name: "salt"
//   "Olive oil"                       → amount: null, unit: null, name: "Olive oil"
//   "3 eggs"                          → amount: "3", unit: null, name: "eggs"
//   "1/4 cup (60g) honey"             → amount: "1/4", unit: "cup", name: "(60g) honey"
//
// Not perfect — edge cases get stored as name with null amount/unit,
// which is fine for manual cleanup.

const UNITS = [
  "cups", "cup",
  "tablespoons", "tablespoon", "tbsp",
  "teaspoons", "teaspoon", "tsp",
  "ounces", "ounce", "oz",
  "pounds", "pound", "lb", "lbs",
  "grams", "gram", "g",
  "kilograms", "kilogram", "kg",
  "liters", "liter", "l",
  "milliliters", "milliliter", "ml",
  "quarts", "quart",
  "pints", "pint",
  "gallons", "gallon",
  "inches", "inch",
  "cloves", "clove",
  "slices", "slice",
  "strips", "strip",
  "sprigs", "sprig",
  "stalks", "stalk",
  "cans", "can",
  "packages", "package", "packets", "packet",
  "jars", "jar",
  "sticks", "stick",
  "sheets", "sheet",
  "leaves", "leaf",
  "heads", "head",
  "bunches", "bunch",
  "pinch", "pinches",
  "dash", "dashes",
  "handfuls", "handful",
];

const UNIT_PATTERN = new RegExp(
  `^(${UNITS.join("|")})\\b`,
  "i"
);

// Matches: integers, decimals, fractions (1/2), unicode fractions (½ ¼ ¾ ⅓ ⅔ ⅛ ⅜ ⅝ ⅞),
// and combinations like "1 ½" or "2 ¾"
const AMOUNT_PATTERN = /^(\d+\s+[\u00BC-\u00BE\u2150-\u215E]|\d+\/\d+|\d+\.?\d*|[\u00BC-\u00BE\u2150-\u215E])/;

function parseIngredient(raw) {
  let remaining = raw.trim();

  // Try to extract amount
  const amountMatch = remaining.match(AMOUNT_PATTERN);
  let amount = null;
  if (amountMatch) {
    amount = amountMatch[0].trim();
    remaining = remaining.slice(amountMatch[0].length).trim();

    // Handle ranges like "1-2" or "2-3"
    const rangeMatch = remaining.match(/^-\s*(\d+\.?\d*)/);
    if (rangeMatch) {
      amount = `${amount}-${rangeMatch[1]}`;
      remaining = remaining.slice(rangeMatch[0].length).trim();
    }
  }

  // Try to extract unit (only if we got an amount)
  let unit = null;
  if (amount) {
    const unitMatch = remaining.match(UNIT_PATTERN);
    if (unitMatch) {
      unit = unitMatch[0].trim();
      remaining = remaining.slice(unitMatch[0].length).trim();
    }
  }

  // Whatever is left is the ingredient name
  const name = remaining || raw;

  return { amount, unit, name };
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("\n❌ Import failed:", err);
  process.exit(1);
});
