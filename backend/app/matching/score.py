"""
Recipe–macro match scoring.

score_recipe(nutrition, target) → float 0–100
  100 = every macro hits the target exactly
    0 = every macro is wildly off (>= 2× target)

Weights reflect nutritional priority: calories first, then protein, then carbs/fat.
Each macro contributes a squared relative error capped at 1.0 (so 2× target = max penalty).
"""

_WEIGHTS = {
    "calories_kcal": 0.40,
    "protein_g":     0.30,
    "carbs_g":       0.20,
    "fat_g":         0.10,
}


def score_recipe(nutrition: dict | None, target: dict) -> float:
    """
    Return a 0–100 match score.
    Recipes with no nutrition data score 0.
    """
    if not nutrition:
        return 0.0

    total_error = 0.0
    for macro, weight in _WEIGHTS.items():
        t = target.get(macro) or 0
        a = nutrition.get(macro) or 0
        if t <= 0:
            continue
        relative_error = min(abs(a - t) / t, 1.0)  # cap at 100% error
        total_error += weight * (relative_error ** 2)

    return round((1.0 - total_error) * 100, 1)


def score_recipes(recipes: list[dict], target: dict) -> list[dict]:
    """Attach a match_score to each recipe dict and sort best-first."""
    for r in recipes:
        r["match_score"] = score_recipe(r.get("nutrition"), target)
    return sorted(recipes, key=lambda r: r["match_score"], reverse=True)
