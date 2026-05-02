"""
Compute per-serving nutrition for a recipe from its ingredients.
Called synchronously at ingest time.
"""

from ..models import Ingredient, RecipeIngredient, NutritionFact
from ..extensions import db
from .usda import search_food


def _get_or_create_ingredient(name: str) -> tuple[Ingredient, bool]:
    """
    Look up ingredient by name. If not found, search USDA and create it.
    Returns (ingredient, usda_matched).
    """
    name_lower = name.lower().strip()
    ingredient = Ingredient.query.filter(
        db.func.lower(Ingredient.name) == name_lower
    ).first()

    if ingredient:
        return ingredient, ingredient.usda_fdc_id is not None

    # Not in DB yet — search USDA
    results = search_food(name)
    ingredient = Ingredient(name=name_lower)

    if results:
        best = results[0]
        ingredient.usda_fdc_id = best["fdc_id"]
        ingredient.kcal_per_100g = best.get("kcal_per_100g")
        ingredient.protein_g_per_100g = best.get("protein_g_per_100g")
        ingredient.carbs_g_per_100g = best.get("carbs_g_per_100g")
        ingredient.fat_g_per_100g = best.get("fat_g_per_100g")
        ingredient.fiber_g_per_100g = best.get("fiber_g_per_100g")
        matched = True
    else:
        matched = False

    db.session.add(ingredient)
    db.session.flush()  # populate ingredient.id before using it in RecipeIngredient
    return ingredient, matched


def compute_recipe_nutrition(recipe_id: str, ingredient_data: list[dict], servings: int) -> NutritionFact:
    """
    For each ingredient dict {name, quantity_grams, original_text}:
      1. Get or create the Ingredient row (with USDA lookup)
      2. Create RecipeIngredient join row
      3. Sum totals, divide by servings

    Returns a NutritionFact (not yet committed — caller should commit).
    """
    totals = {k: 0.0 for k in ("kcal", "protein", "carbs", "fat", "fiber")}
    matched_count = 0
    total_count = len(ingredient_data)

    for item in ingredient_data:
        name = item.get("name", "").strip()
        grams = float(item.get("quantity_grams", 0))
        original_text = item.get("original_text", name)

        if not name or grams <= 0:
            continue

        ingredient, matched = _get_or_create_ingredient(name)

        ri = RecipeIngredient(
            recipe_id=recipe_id,
            ingredient_id=ingredient.id,
            quantity_grams=grams,
            original_text=original_text,
        )
        db.session.add(ri)

        if matched:
            matched_count += 1
            factor = grams / 100.0
            totals["kcal"]    += (ingredient.kcal_per_100g or 0) * factor
            totals["protein"] += (ingredient.protein_g_per_100g or 0) * factor
            totals["carbs"]   += (ingredient.carbs_g_per_100g or 0) * factor
            totals["fat"]     += (ingredient.fat_g_per_100g or 0) * factor
            totals["fiber"]   += (ingredient.fiber_g_per_100g or 0) * factor

    safe_servings = max(servings, 1)
    confidence = "high" if total_count == 0 or matched_count / total_count >= 0.7 else "low"

    fact = NutritionFact(
        recipe_id=recipe_id,
        calories_kcal=totals["kcal"] / safe_servings,
        protein_g=totals["protein"] / safe_servings,
        carbs_g=totals["carbs"] / safe_servings,
        fat_g=totals["fat"] / safe_servings,
        fiber_g=totals["fiber"] / safe_servings,
        source="computed_from_ingredients",
        nutrition_confidence=confidence,
    )
    db.session.add(fact)
    return fact
