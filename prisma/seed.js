import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Categories
  const breakfast = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Breakfast", sortOrder: 1 },
  });

  const soups = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: { name: "Soups & Stews", sortOrder: 2 },
  });

  const dessert = await prisma.category.upsert({
    where: { id: 3 },
    update: {},
    create: { name: "Dessert", sortOrder: 3 },
  });

  // Tags
  const makeAhead = await prisma.tag.upsert({
    where: { slug: "make-ahead" },
    update: {},
    create: { name: "Make Ahead", slug: "make-ahead" },
  });

  const airFryer = await prisma.tag.upsert({
    where: { slug: "air-fryer" },
    update: {},
    create: { name: "Air Fryer", slug: "air-fryer" },
  });

  // Recipe: Bagels
  const bagels = await prisma.recipe.upsert({
    where: { slug: "bagels" },
    update: {},
    create: {
      title: "Bagels",
      slug: "bagels",
      servings: "8 Servings",
      notes: "Can use all-purpose flour but bagels will be much chewier.",
      sortOrder: 1,
      categoryId: breakfast.id,
      tags: { connect: [{ slug: "make-ahead" }] },
    },
  });

  // Bagels - main ingredient group
  const bagelsMainGroup = await prisma.ingredientGroup.upsert({
    where: { id: 1 },
    update: {},
    create: {
      recipeId: bagels.id,
      name: "",
      sortOrder: 1,
    },
  });

  await prisma.ingredient.createMany({
    skipDuplicates: true,
    data: [
      { groupId: bagelsMainGroup.id, amount: "1 ⅓ - 1 ½", unit: "cups", name: "warm water", note: "between 100-110°F", sortOrder: 1 },
      { groupId: bagelsMainGroup.id, amount: "2 ¾", unit: "teaspoons", name: "instant or active dry yeast", sortOrder: 2 },
      { groupId: bagelsMainGroup.id, amount: "4", unit: "cups (490g)", name: "bread flour", note: "can use all-purpose but bagels will be much chewier", sortOrder: 3 },
      { groupId: bagelsMainGroup.id, amount: "1", unit: "tablespoon", name: "granulated or packed brown sugar", sortOrder: 4 },
      { groupId: bagelsMainGroup.id, amount: "2", unit: "teaspoons", name: "salt", sortOrder: 5 },
      { groupId: bagelsMainGroup.id, amount: "1", unit: "tablespoon", name: "olive oil", note: "to coat bowl", sortOrder: 6 },
    ],
  });

  // Bagels - egg wash group
  const bagelsEggWash = await prisma.ingredientGroup.upsert({
    where: { id: 2 },
    update: {},
    create: {
      recipeId: bagels.id,
      name: "Egg Wash",
      sortOrder: 2,
    },
  });

  await prisma.ingredient.createMany({
    skipDuplicates: true,
    data: [
      { groupId: bagelsEggWash.id, amount: "1", unit: "", name: "egg white, beaten", sortOrder: 1 },
      { groupId: bagelsEggWash.id, amount: "1", unit: "tablespoon", name: "water", sortOrder: 2 },
    ],
  });

  // Bagels - boiling group
  const bagelsBoiling = await prisma.ingredientGroup.upsert({
    where: { id: 3 },
    update: {},
    create: {
      recipeId: bagels.id,
      name: "For Boiling",
      sortOrder: 3,
    },
  });

  await prisma.ingredient.createMany({
    skipDuplicates: true,
    data: [
      { groupId: bagelsBoiling.id, amount: "2", unit: "quarts", name: "water", sortOrder: 1 },
      { groupId: bagelsBoiling.id, amount: "¼", unit: "cup (60g)", name: "honey", sortOrder: 2 },
    ],
  });

  // Bagels - instruction group
  const bagelsInstructions = await prisma.instructionGroup.upsert({
    where: { id: 1 },
    update: {},
    create: {
      recipeId: bagels.id,
      name: "",
      sortOrder: 1,
    },
  });

  const step1 = await prisma.instruction.create({
    data: {
      groupId: bagelsInstructions.id,
      stepNumber: 1,
      stepLabel: "",
      text: "Whisk the warm water and yeast together in the bowl of your stand mixer fitted with a dough hook. Cover and allow to sit for 5 minutes.",
      sortOrder: 1,
    },
  });

  await prisma.instruction.create({
    data: {
      groupId: bagelsInstructions.id,
      stepNumber: 2,
      stepLabel: "",
      text: "Add the flour, brown sugar, and salt and beat on low speed for 2 minutes. Knead the dough for 4-5 minutes.",
      sortOrder: 2,
    },
  });

  const step3 = await prisma.instruction.create({
    data: {
      groupId: bagelsInstructions.id,
      stepNumber: 3,
      stepLabel: "",
      text: "Lightly grease a large bowl with oil. Place the dough in the bowl, turning it to coat all sides. Cover and allow the dough to rise:",
      sortOrder: 3,
    },
  });

  await prisma.instruction.createMany({
    data: [
      { groupId: bagelsInstructions.id, stepNumber: 0, stepLabel: "a", text: "At room temperature for 60-90 minutes or until it doubles in size.", sortOrder: 4, parentInstructionId: step3.id },
      { groupId: bagelsInstructions.id, stepNumber: 0, stepLabel: "b", text: "Or overnight in the refrigerator. In the morning, remove the dough and let it rise for 45 minutes at room temperature.", sortOrder: 5, parentInstructionId: step3.id },
    ],
  });

  await prisma.instruction.create({
    data: {
      groupId: bagelsInstructions.id,
      stepNumber: 4,
      stepLabel: "",
      text: "Preheat oven to 425°F convection. Line two large baking sheets with parchment paper.",
      sortOrder: 6,
    },
  });

  await prisma.instruction.create({
    data: {
      groupId: bagelsInstructions.id,
      stepNumber: 5,
      stepLabel: "",
      text: "Divide dough into 8 equal pieces. Shape each into a ball, then press your index finger through the center to make a hole about 1.5-2 inches in diameter.",
      sortOrder: 7,
    },
  });

  await prisma.instruction.create({
    data: {
      groupId: bagelsInstructions.id,
      stepNumber: 6,
      stepLabel: "",
      text: "Boil bagels 2-4 at a time for 1 minute per side. Remove and drain, then place on lined baking sheet. Brush with egg wash and add toppings if desired.",
      sortOrder: 8,
    },
  });

  await prisma.instruction.create({
    data: {
      groupId: bagelsInstructions.id,
      stepNumber: 7,
      stepLabel: "",
      text: "Bake for 20-25 minutes, rotating pan halfway through, until deep golden brown. Cool on baking sheets for 20 minutes before serving.",
      sortOrder: 9,
    },
  });

  // Recipe: Shakshuka (simpler recipe as second example)
  const shakshuka = await prisma.recipe.upsert({
    where: { slug: "shakshuka" },
    update: {},
    create: {
      title: "Shakshuka",
      slug: "shakshuka",
      servings: "4 Servings",
      notes: "Great for breakfast or brunch. Serve with crusty bread.",
      sortOrder: 2,
      categoryId: breakfast.id,
    },
  });

  const shakshukaGroup = await prisma.ingredientGroup.upsert({
    where: { id: 4 },
    update: {},
    create: { recipeId: shakshuka.id, name: "", sortOrder: 1 },
  });

  await prisma.ingredient.createMany({
    skipDuplicates: true,
    data: [
      { groupId: shakshukaGroup.id, amount: "2", unit: "tablespoons", name: "olive oil", sortOrder: 1 },
      { groupId: shakshukaGroup.id, amount: "1", unit: "", name: "onion, diced", sortOrder: 2 },
      { groupId: shakshukaGroup.id, amount: "1", unit: "", name: "red bell pepper, diced", sortOrder: 3 },
      { groupId: shakshukaGroup.id, amount: "4", unit: "cloves", name: "garlic, minced", sortOrder: 4 },
      { groupId: shakshukaGroup.id, amount: "1", unit: "28oz can", name: "crushed tomatoes", sortOrder: 5 },
      { groupId: shakshukaGroup.id, amount: "1", unit: "teaspoon", name: "cumin", sortOrder: 6 },
      { groupId: shakshukaGroup.id, amount: "1", unit: "teaspoon", name: "paprika", sortOrder: 7 },
      { groupId: shakshukaGroup.id, amount: "6", unit: "", name: "eggs", sortOrder: 8 },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });