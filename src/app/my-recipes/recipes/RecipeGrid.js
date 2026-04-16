"use client";

import { useState } from "react";
import RecipeCard from "./RecipeCard";

export default function RecipeGrid({ recipes: initial }) {
  const [recipes, setRecipes] = useState(initial);

  function handleDeleted(id) {
    setRecipes((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}
