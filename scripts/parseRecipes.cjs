/**
 * parseRecipes.cjs
 *
 * Parses Meals.html (Google Doc export) into structured JSON.
 * Output: scripts/output.json — review this before running importRecipes.cjs
 *
 * Usage:
 *   node scripts/parseRecipes.cjs
 *
 * Structure decoded from the HTML:
 *   h1.c1          → Category (BREAKFAST, SOUPS/STEWS, etc.)
 *   h2.c1          → Parent recipe title
 *   h3.c1          → Variation/sub-recipe title
 *   ul > li.c3     → Ingredient line
 *   p.c8.c15       → Ingredient group header (For Boiling:, Filling:, etc.)
 *   ol > li.c6     → Instruction step
 *   li.c8.c12      → Sub-note on ingredient or step
 *   p.c11          → Recipe-level note/tip
 *   img            → Recipe image (first one per recipe captured)
 */

const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// ─── Config ───────────────────────────────────────────────────────────────────

const INPUT_FILE = "/Users/thomasmataconis/Downloads/Meals/Meals.html";
const OUTPUT_FILE = path.join(__dirname, "output.json");

const SKIP_CATEGORIES = new Set(["GENERAL INFORMATION", "RECIPES TO TRY"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTitle(rawTitle) {
  const title = rawTitle.replace(/\s+\d+\s*$/, "").trim();
  const match = title.match(/^(.+?)\s+-\s+(.+)$/);
  if (match) {
    const possibleServings = match[2];
    if (
      /\d/.test(possibleServings) ||
      /serving|roll|piece|cup|loaf|bite|ball|slice|wrap|waffle/i.test(possibleServings)
    ) {
      return { cleanTitle: match[1].trim(), servings: possibleServings.trim() };
    }
  }
  return { cleanTitle: title, servings: null };
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clean(text) {
  return text.replace(/\s+/g, " ").trim();
}

function newRecipe(title, isVariation = false, parentSlug = null) {
  const { cleanTitle, servings } = parseTitle(title);
  return {
    cleanTitle,
    title: cleanTitle,
    slug: slugify(cleanTitle),
    servings,
    isVariation,
    parentRecipeSlug: parentSlug,
    imageFile: null,
    notes: [],
    ingredientGroups: [{ name: null, ingredients: [] }],
    instructionGroups: [{ name: null, instructions: [] }],
  };
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parse(html) {
  const $ = cheerio.load(html);
  const body = $("body");

  const recipeImageMap = {};

  // ── Pre-pass: map first image to each recipe slug ──────────────────────────
  let _h2Slug = null;
  let _h3Slug = null;
  let _inSkipped = false;

  body.find("h1, h2, h3, img").each((_, el) => {
    const tag = el.tagName;
    const classes = $(el).attr("class") || "";
    const text = clean($(el).text());

    if (tag === "h1") {
      _inSkipped = SKIP_CATEGORIES.has(text);
      _h2Slug = null;
      _h3Slug = null;
      return;
    }

    if (_inSkipped) return;

    if (tag === "h2" && classes.includes("c1") && text) {
      const { cleanTitle } = parseTitle(text);
      _h2Slug = slugify(cleanTitle);
      _h3Slug = null;
      return;
    }

    if (tag === "h3" && classes.includes("c1") && text) {
      const { cleanTitle } = parseTitle(text);
      _h3Slug = slugify(cleanTitle);
      return;
    }

    if (tag === "img") {
      const src = $(el).attr("src");
      const activeSlug = _h3Slug || _h2Slug;
      if (src && activeSlug && !recipeImageMap[activeSlug]) {
        recipeImageMap[activeSlug] = src;
      }
    }
  });

  // ── Main pass: build recipe structure ─────────────────────────────────────
  const categories = [];
  let currentCategory = null;
  let currentParentRecipe = null;
  let currentRecipe = null;

  function pushRecipe(recipe) {
    if (currentCategory) currentCategory.recipes.push(recipe);
  }

  body.children().each((_, el) => {
    const tag = el.tagName;
    const classes = $(el).attr("class") || "";
    const text = clean($(el).text());

    // h1 = Category
    if (tag === "h1" && classes.includes("c1") && text) {
      if (SKIP_CATEGORIES.has(text)) {
        currentCategory = null;
        currentParentRecipe = null;
        currentRecipe = null;
        return;
      }
      currentCategory = { name: text, recipes: [] };
      categories.push(currentCategory);
      currentParentRecipe = null;
      currentRecipe = null;
      return;
    }

    if (!currentCategory) return;

    // h2 = Parent recipe
    if (tag === "h2" && classes.includes("c1") && text) {
      currentParentRecipe = newRecipe(text, false, null);
      currentRecipe = currentParentRecipe;
      pushRecipe(currentParentRecipe);
      return;
    }

    // h3 = Variation
    if (tag === "h3" && classes.includes("c1") && text) {
      const parentSlug = currentParentRecipe ? currentParentRecipe.slug : null;
      const variation = newRecipe(text, true, parentSlug);
      currentRecipe = variation;
      pushRecipe(variation);
      return;
    }

    if (!currentRecipe) return;

    // p.c11 = recipe note
    if (tag === "p" && classes.includes("c11") && text) {
      currentRecipe.notes.push(text.replace(/^\*+\s*/, "").trim());
      return;
    }

    // p.c8 + c15/c25/c32/c42 = ingredient group header
    const isGroupHeader =
      tag === "p" &&
      classes.includes("c8") &&
      (classes.includes("c15") ||
        classes.includes("c25") ||
        classes.includes("c32") ||
        classes.includes("c42"));

    if (isGroupHeader && text) {
      if (text.startsWith("*")) {
        currentRecipe.notes.push(text.replace(/^\*+\s*/, "").trim());
      } else {
        const groupName = text.replace(/:$/, "").trim();
        currentRecipe.ingredientGroups.push({ name: groupName, ingredients: [] });
        currentRecipe.instructionGroups.push({ name: groupName, instructions: [] });
      }
      return;
    }

    // ul / ol = ingredients and instructions
    if (tag === "ul" || tag === "ol") {
      $(el)
        .children("li")
        .each((_, li) => {
          const liClasses = $(li).attr("class") || "";
          const liText = clean($(li).text());
          if (!liText) return;

          // "Ingredients:" / "Ingredients for X:" divider
          if (
            /^Ingredients(\s+for\b.*)?:/i.test(liText) &&
            liClasses.includes("c6")
          ) {
            const match = liText.match(/^Ingredients\s+for\s+(.+?):/i);
            if (match) {
              currentRecipe.ingredientGroups.push({
                name: match[1].trim(),
                ingredients: [],
              });
            }
            return;
          }

          // Sub-note li.c8.c12
          if (liClasses.includes("c8") && liClasses.includes("c12")) {
            const noteText = liText.replace(/^\*+\s*/, "").trim();
            const curGrp =
              currentRecipe.ingredientGroups[
                currentRecipe.ingredientGroups.length - 1
              ];
            const lastIng = curGrp.ingredients[curGrp.ingredients.length - 1];
            if (lastIng) {
              lastIng.note = lastIng.note
                ? lastIng.note + " " + noteText
                : noteText;
            } else {
              currentRecipe.notes.push(noteText);
            }
            return;
          }

          // Ingredient: ul > li.c3
          if (liClasses.includes("c3") && tag === "ul") {
            currentRecipe.ingredientGroups[
              currentRecipe.ingredientGroups.length - 1
            ].ingredients.push({ raw: liText, note: null });
            return;
          }

          // Instruction: li.c6
          if (liClasses.includes("c6")) {
            currentRecipe.instructionGroups[
              currentRecipe.instructionGroups.length - 1
            ].instructions.push(liText);
            return;
          }
        });
      return;
    }
  });

  // Attach image references from pre-pass
  for (const cat of categories) {
    for (const recipe of cat.recipes) {
      recipe.imageFile = recipeImageMap[recipe.slug] || null;
      // cleanTitle was only needed internally, remove from output
      delete recipe.cleanTitle;
    }
  }

  return categories;
}

// ─── Post-processing ──────────────────────────────────────────────────────────

function postProcess({ categories }) {
  let totalRecipes = 0;
  let totalIngredients = 0;
  let totalInstructions = 0;
  let totalImages = 0;

  for (const cat of categories) {
    for (const recipe of cat.recipes) {
      totalRecipes++;

      recipe.ingredientGroups = recipe.ingredientGroups.filter(
        (g) => g.ingredients.length > 0
      );
      recipe.instructionGroups = recipe.instructionGroups.filter(
        (g) => g.instructions.length > 0
      );

      let stepNum = 1;
      for (const group of recipe.instructionGroups) {
        group.instructions = group.instructions.map((text) => ({
          stepNumber: stepNum++,
          text,
        }));
      }

      totalIngredients += recipe.ingredientGroups.reduce(
        (sum, g) => sum + g.ingredients.length,
        0
      );
      totalInstructions += recipe.instructionGroups.reduce(
        (sum, g) => sum + g.instructions.length,
        0
      );
      if (recipe.imageFile) totalImages++;
    }
  }

  return { categories, stats: { totalRecipes, totalIngredients, totalInstructions, totalImages } };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Reading ${INPUT_FILE}...`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: File not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const html = fs.readFileSync(INPUT_FILE, "utf8");
  console.log(`Parsing...`);

  const categories = parse(html);
  const { stats } = postProcess({ categories });

  const output = { categories };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");

  console.log(`\n✅ Done!`);
  console.log(`   Categories  : ${categories.length}`);
  console.log(`   Recipes     : ${stats.totalRecipes}`);
  console.log(`   Ingredients : ${stats.totalIngredients}`);
  console.log(`   Instructions: ${stats.totalInstructions}`);
  console.log(`   Images      : ${stats.totalImages}`);
  console.log(`\nOutput written to: ${OUTPUT_FILE}`);
}

main();
