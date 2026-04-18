/**
 * uploadImages.cjs
 *
 * Reads scripts/output.json, uploads each recipe image to Supabase Storage,
 * and updates the imageUrl field in the database.
 *
 * Usage:
 *   node -r dotenv/config scripts/uploadImages.cjs
 *
 * Dry run (no uploads, no DB writes):
 *   DRY_RUN=true node -r dotenv/config scripts/uploadImages.cjs
 *
 * Prerequisites:
 *   - Run parseRecipes.cjs first to generate output.json with imageFile fields
 *   - Run importRecipes.cjs first so recipes exist in the DB
 *   - Images folder must be at: /Users/thomasmataconis/Downloads/Meals/images/
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");


// ─── Config ───────────────────────────────────────────────────────────────────

const INPUT_FILE = path.join(__dirname, "output.json");
const IMAGES_DIR = "/Users/thomasmataconis/Downloads/Meals/images";
const SUPABASE_BUCKET = "recipe-images";
const DRY_RUN = process.env.DRY_RUN === "true";

// Resize images to max 1200px wide before upload (mirrors your client-side logic)
// Set to false to skip resizing and upload originals as-is
const RESIZE = false;

// ─── Clients ──────────────────────────────────────────────────────────────────

function createPrismaClient() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DIRECT_URL or DATABASE_URL not set.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.");
    process.exit(1);
  }
  return createClient(url, key);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return map[ext] || "image/jpeg";
}

// Sleep to avoid hammering Supabase
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log("🔍 DRY RUN MODE — no uploads or DB writes\n");

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: ${INPUT_FILE} not found. Run parseRecipes.cjs first.`);
    process.exit(1);
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`ERROR: Images directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }

  const { categories } = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

  // Collect all recipes that have an imageFile
  const recipesWithImages = [];
  for (const cat of categories) {
    for (const recipe of cat.recipes) {
      if (recipe.imageFile) {
        recipesWithImages.push(recipe);
      }
    }
  }

  console.log(`Found ${recipesWithImages.length} recipes with images\n`);

  const prisma = createPrismaClient();
  const supabase = createSupabaseClient();

  const stats = {
    uploaded: 0,
    skipped: 0,
    notFound: 0,   // image file missing locally
    noRecipe: 0,   // recipe not found in DB
    failed: 0,
  };

  for (let i = 0; i < recipesWithImages.length; i++) {
    const recipe = recipesWithImages[i];

    // imageFile is like "images/image111.jpg" — get just the filename
    const imageFilename = path.basename(recipe.imageFile);
    const localPath = path.join(IMAGES_DIR, imageFilename);

    process.stdout.write(
      `[${i + 1}/${recipesWithImages.length}] "${recipe.title}" (${imageFilename}) → `
    );

    // Check local file exists
    if (!fs.existsSync(localPath)) {
      console.log(`⚠️  local file not found`);
      stats.notFound++;
      continue;
    }

    // Check recipe exists in DB
    if (!DRY_RUN) {
      const dbRecipe = await prisma.recipe.findUnique({
        where: { slug: recipe.slug },
        select: { id: true, imageUrl: true },
      });

      if (!dbRecipe) {
        console.log(`⚠️  not in DB (skipped)`);
        stats.noRecipe++;
        continue;
      }

      // Skip if already has an image URL
      if (dbRecipe.imageUrl && dbRecipe.imageUrl !== "") {
        console.log(`✓ already has image`);
        stats.skipped++;
        continue;
      }
    }

    if (DRY_RUN) {
      console.log(`would upload ${imageFilename}`);
      stats.uploaded++;
      continue;
    }

    // Upload to Supabase Storage
    try {
      let fileBuffer = fs.readFileSync(localPath);
      const fileSizeMB = fileBuffer.length / (1024 * 1024);
      if (fileSizeMB > 4) {
        fileBuffer = await sharp(fileBuffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
      }
      const mimeType = fileSizeMB > 4 ? "image/jpeg" : getMimeType(imageFilename);

      // Storage path: recipe-slug/original-filename
      const storagePath = `${recipe.slug}/${imageFilename}`;

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true, // overwrite if re-running
        });

      if (uploadError) {
        console.log(`❌ upload failed: ${uploadError.message}`);
        stats.failed++;
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // Update DB
      await prisma.recipe.update({
        where: { slug: recipe.slug },
        data: { imageUrl: publicUrl },
      });

      console.log(`✅ uploaded`);
      stats.uploaded++;

      // Small delay to be nice to Supabase
      await sleep(100);
    } catch (err) {
      console.log(`❌ error: ${err.message}`);
      stats.failed++;
    }
  }

  await prisma.$disconnect();

  console.log("\n─────────────────────────────────────────");
  console.log(`${DRY_RUN ? "🔍 DRY RUN" : "✅"} Upload complete`);
  console.log(`   Uploaded       : ${stats.uploaded}`);
  console.log(`   Already had URL: ${stats.skipped}`);
  console.log(`   Local not found: ${stats.notFound}`);
  console.log(`   Not in DB      : ${stats.noRecipe}`);
  console.log(`   Failed         : ${stats.failed}`);
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err);
  process.exit(1);
});
