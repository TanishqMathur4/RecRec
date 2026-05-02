import pytest
from app.profile.macros import bmr, tdee, compute_macro_target

# Reference human: 25yo male, 70kg, 175cm, moderate activity, maintain
REF = dict(sex="male", weight_kg=70, height_cm=175, age=25,
           activity_level="moderate", goal="maintain")


def test_bmr_male_reference():
    # 10*70 + 6.25*175 - 5*25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75
    assert bmr("male", 70, 175, 25) == pytest.approx(1673.75)


def test_bmr_female_reference():
    # same body, female: 1673.75 - 5 - 161 = 1507.75
    assert bmr("female", 70, 175, 25) == pytest.approx(1507.75)


def test_tdee_moderate():
    bmr_val = bmr("male", 70, 175, 25)
    result = tdee(bmr_val, "moderate")
    # 1673.75 * 1.55 = 2594.3125
    assert result == pytest.approx(2594.31, rel=1e-3)


def test_compute_macro_target_calories_in_range():
    result = compute_macro_target(**REF)
    # TDEE ~2594, maintain adds 0 → expect ~2594 kcal
    assert 2500 < result["calories_kcal"] < 2700


def test_compute_macro_target_protein():
    result = compute_macro_target(**REF)
    # maintain: 1.6g/kg * 70kg = 112g protein
    assert result["protein_g"] == pytest.approx(112.0)


def test_compute_macro_target_macros_balance():
    result = compute_macro_target(**REF)
    # protein*4 + fat*9 + carbs*4 should ≈ total calories
    cal_check = (result["protein_g"] * 4
                 + result["fat_g"] * 9
                 + result["carbs_g"] * 4)
    assert cal_check == pytest.approx(result["calories_kcal"], rel=0.01)


def test_cut_has_deficit():
    maintain = compute_macro_target(**{**REF, "goal": "maintain"})
    cut = compute_macro_target(**{**REF, "goal": "cut"})
    assert cut["calories_kcal"] == pytest.approx(maintain["calories_kcal"] - 500, rel=0.01)


def test_bulk_has_surplus():
    maintain = compute_macro_target(**{**REF, "goal": "maintain"})
    bulk = compute_macro_target(**{**REF, "goal": "bulk"})
    assert bulk["calories_kcal"] == pytest.approx(maintain["calories_kcal"] + 350, rel=0.01)


def test_gut_health_has_high_fiber():
    result = compute_macro_target(**{**REF, "goal": "gut_health"})
    assert result["fiber_g"] == 40.0


def test_carbs_never_negative():
    # Extreme case: very high protein could theoretically go negative
    result = compute_macro_target(
        sex="male", weight_kg=120, height_cm=170, age=30,
        activity_level="sedentary", goal="cut"
    )
    assert result["carbs_g"] >= 0
