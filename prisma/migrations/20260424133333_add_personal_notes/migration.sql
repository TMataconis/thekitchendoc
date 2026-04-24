-- CreateTable
CREATE TABLE "personal_notes" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,

    CONSTRAINT "personal_notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "personal_notes" ADD CONSTRAINT "personal_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_notes" ADD CONSTRAINT "personal_notes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
