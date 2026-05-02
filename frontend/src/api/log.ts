import client from "./client";
import type { Recipe } from "./recipes";

export interface MealEntry {
  id: string;
  recipe_id: string;
  recipe_title: string;
  recipe_image: string | null;
  servings: number;
  logged_at: string;
  nutrition: {
    calories_kcal: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  } | null;
}

export interface DailyTotals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface TodayLog {
  date: string;
  totals: DailyTotals;
  entries: MealEntry[];
}

export const fetchToday = () =>
  client.get<TodayLog>("/api/log/today").then((r) => r.data);

export const logMeal = (recipe_id: string, servings: number) =>
  client.post<{ entry: MealEntry }>("/api/log/meals", { recipe_id, servings }).then((r) => r.data);

export const deleteMeal = (entry_id: string) =>
  client.delete(`/api/log/meals/${entry_id}`);

export const fetchRecommended = () =>
  client.get<{ recipes: Recipe[] }>("/api/log/recommended").then((r) => r.data);
