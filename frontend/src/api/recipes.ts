import client from "./client";

export interface NutritionFact {
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  source: string;
  nutrition_confidence: "high" | "low";
  computed_at: string;
}

export interface RecipeIngredient {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  quantity_grams: number;
  original_text: string | null;
}

export interface Recipe {
  id: string;
  title: string;
  source_url: string | null;
  source_type: "manual" | "scraped";
  description: string | null;
  instructions_md: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number;
  difficulty: number | null;
  cuisine: string | null;
  tags: string[];
  image_url: string | null;
  created_by_user_id: string;
  created_at: string;
  nutrition: NutritionFact | null;
  ingredients?: RecipeIngredient[];
}

export interface IngredientRow {
  name: string;
  quantity_grams: string;
  original_text: string;
}

export const fetchRecipes = (params?: { limit?: number; offset?: number }) =>
  client.get<{ recipes: Recipe[]; limit: number; offset: number }>("/api/recipes", { params })
    .then((r) => r.data);

export const fetchRecipe = (id: string) =>
  client.get<{ recipe: Recipe }>(`/api/recipes/${id}`).then((r) => r.data);

export const createRecipe = (data: {
  title: string;
  description?: string;
  instructions_md?: string;
  prep_minutes?: number;
  cook_minutes?: number;
  servings: number;
  difficulty?: number;
  cuisine?: string;
  tags?: string[];
  ingredients: { name: string; quantity_grams: number; original_text?: string }[];
}) => client.post<{ recipe: Recipe }>("/api/recipes", data).then((r) => r.data);

export const searchIngredients = (q: string) =>
  client.get<{ results: { name: string; fdc_id: number }[] }>("/api/ingredients/search", { params: { q } })
    .then((r) => r.data);
