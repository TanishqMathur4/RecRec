from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import HealthProfile, MacroTarget
from .macros import compute_macro_target

profile_bp = Blueprint("profile", __name__, url_prefix="/api")

VALID_ACTIVITY = {"sedentary", "light", "moderate", "active", "very_active"}
VALID_GOALS = {"cut", "maintain", "bulk", "recomp", "bodybuilding", "gut_health"}
VALID_SEX = {"male", "female"}


def _validate_profile_input(data: dict) -> tuple[dict | None, dict | None]:
    """Returns (clean_data, errors). One of them will be None."""
    errors = {}

    age = data.get("age")
    sex = data.get("sex")
    height_cm = data.get("height_cm")
    weight_kg = data.get("weight_kg")
    activity_level = data.get("activity_level")
    goal = data.get("goal")
    health_flags = data.get("health_flags", {})
    meals_per_day = data.get("meals_per_day", 3)

    if not isinstance(age, int) or not (13 <= age <= 100):
        errors["age"] = "Age must be between 13 and 100."
    if sex not in VALID_SEX:
        errors["sex"] = "Sex must be 'male' or 'female'."
    if not isinstance(height_cm, (int, float)) or not (100 <= height_cm <= 250):
        errors["height_cm"] = "Height must be between 100 and 250 cm."
    if not isinstance(weight_kg, (int, float)) or not (30 <= weight_kg <= 300):
        errors["weight_kg"] = "Weight must be between 30 and 300 kg."
    if activity_level not in VALID_ACTIVITY:
        errors["activity_level"] = f"Must be one of: {', '.join(VALID_ACTIVITY)}."
    if goal not in VALID_GOALS:
        errors["goal"] = f"Must be one of: {', '.join(VALID_GOALS)}."
    if not isinstance(meals_per_day, int) or not (1 <= meals_per_day <= 8):
        errors["meals_per_day"] = "Meals per day must be between 1 and 8."

    if errors:
        return None, errors

    return {
        "age": int(age),
        "sex": sex,
        "height_cm": float(height_cm),
        "weight_kg": float(weight_kg),
        "activity_level": activity_level,
        "goal": goal,
        "health_flags": health_flags if isinstance(health_flags, dict) else {},
        "meals_per_day": int(meals_per_day),
    }, None


@profile_bp.get("/profile")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    profile = db.session.get(HealthProfile, user_id)
    target = db.session.get(MacroTarget, user_id)

    return jsonify({
        "profile": profile.to_dict() if profile else None,
        "macro_target": target.to_dict() if target else None,
    }), 200


@profile_bp.put("/profile")
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data, errors = _validate_profile_input(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 422

    # Upsert HealthProfile
    profile = db.session.get(HealthProfile, user_id)
    if profile is None:
        profile = HealthProfile(user_id=user_id)
        db.session.add(profile)

    for field, value in data.items():
        setattr(profile, field, value)
    profile.updated_at = datetime.now(timezone.utc)

    # Recompute MacroTarget in the same transaction
    computed = compute_macro_target(
        sex=data["sex"],
        weight_kg=data["weight_kg"],
        height_cm=data["height_cm"],
        age=data["age"],
        activity_level=data["activity_level"],
        goal=data["goal"],
    )

    target = db.session.get(MacroTarget, user_id)
    if target is None:
        target = MacroTarget(user_id=user_id)
        db.session.add(target)

    for field, value in computed.items():
        setattr(target, field, value)
    target.computed_at = datetime.now(timezone.utc)

    db.session.commit()

    return jsonify({
        "profile": profile.to_dict(),
        "macro_target": target.to_dict(),
    }), 200
