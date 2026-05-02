"""
Pure macro calculation functions — no Flask, no DB imports.
All formulas from ARCHITECTURE.md section 5.
"""

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

# (calorie_delta, protein_g_per_kg, fat_pct_of_calories, fiber_g_per_day)
GOAL_PARAMS = {
    "cut":          (-500, 2.0, 0.25, 30),
    "maintain":     (0,    1.6, 0.30, 30),
    "bulk":         (+350, 1.8, 0.25, 35),
    "recomp":       (-200, 2.2, 0.25, 30),
    "bodybuilding": (+200, 2.2, 0.20, 35),
    "gut_health":   (0,    1.6, 0.30, 40),
}


def bmr(sex: str, weight_kg: float, height_cm: float, age: int) -> float:
    """Mifflin-St Jeor BMR."""
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if sex == "male" else base - 161


def tdee(bmr_value: float, activity_level: str) -> float:
    multiplier = ACTIVITY_MULTIPLIERS[activity_level]
    return bmr_value * multiplier


def compute_macro_target(
    sex: str,
    weight_kg: float,
    height_cm: float,
    age: int,
    activity_level: str,
    goal: str,
) -> dict:
    """
    Returns daily macro targets as a dict with keys:
    calories_kcal, protein_g, carbs_g, fat_g, fiber_g
    """
    bmr_val = bmr(sex, weight_kg, height_cm, age)
    tdee_val = tdee(bmr_val, activity_level)

    cal_delta, protein_per_kg, fat_pct, fiber_g = GOAL_PARAMS[goal]
    calories = tdee_val + cal_delta

    protein_g = protein_per_kg * weight_kg
    fat_g = (calories * fat_pct) / 9
    carbs_g = (calories - protein_g * 4 - fat_g * 9) / 4

    return {
        "calories_kcal": round(calories, 1),
        "protein_g": round(protein_g, 1),
        "carbs_g": round(max(carbs_g, 0), 1),
        "fat_g": round(fat_g, 1),
        "fiber_g": float(fiber_g),
    }
