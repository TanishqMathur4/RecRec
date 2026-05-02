from datetime import date, timezone, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_
from ..extensions import db
from ..models import DailyLog, MealEntry, MacroTarget, Recipe
from ..matching.score import score_recipes

log_bp = Blueprint("log", __name__, url_prefix="/api/log")


def _get_or_create_today(user_id: str) -> DailyLog:
    today = date.today()
    log = DailyLog.query.filter(
        and_(DailyLog.user_id == user_id, DailyLog.date == today)
    ).first()
    if not log:
        log = DailyLog(user_id=user_id, date=today)
        db.session.add(log)
        db.session.flush()
    return log


def _sum_entries(entries: list[MealEntry]) -> dict:
    totals = {"calories_kcal": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
    for e in entries:
        n = e.recipe.nutrition_fact
        if not n:
            continue
        f = e.servings
        totals["calories_kcal"] += (n.calories_kcal or 0) * f
        totals["protein_g"]     += (n.protein_g or 0) * f
        totals["carbs_g"]       += (n.carbs_g or 0) * f
        totals["fat_g"]         += (n.fat_g or 0) * f
    return {k: round(v, 1) for k, v in totals.items()}


@log_bp.get("/today")
@jwt_required()
def get_today():
    user_id = get_jwt_identity()
    log = _get_or_create_today(user_id)
    db.session.commit()

    totals = _sum_entries(log.entries)
    return jsonify({
        "date": log.date.isoformat(),
        "totals": totals,
        "entries": [e.to_dict() for e in sorted(log.entries, key=lambda e: e.logged_at)],
    }), 200


@log_bp.post("/meals")
@jwt_required()
def log_meal():
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}
    recipe_id = body.get("recipe_id", "").strip()
    servings = float(body.get("servings", 1.0))

    if not recipe_id:
        return jsonify({"error": "recipe_id is required."}), 422
    if servings <= 0:
        return jsonify({"error": "servings must be positive."}), 422
    if not db.session.get(Recipe, recipe_id):
        return jsonify({"error": "Recipe not found."}), 404

    log = _get_or_create_today(user_id)
    entry = MealEntry(daily_log_id=log.id, recipe_id=recipe_id, servings=servings)
    db.session.add(entry)
    db.session.commit()

    return jsonify({"entry": entry.to_dict()}), 201


@log_bp.delete("/meals/<entry_id>")
@jwt_required()
def delete_meal(entry_id: str):
    user_id = get_jwt_identity()
    entry = db.session.get(MealEntry, entry_id)
    if not entry or entry.daily_log.user_id != user_id:
        return jsonify({"error": "Not found."}), 404
    db.session.delete(entry)
    db.session.commit()
    return "", 204


@log_bp.get("/recommended")
@jwt_required()
def recommended():
    user_id = get_jwt_identity()
    target = db.session.get(MacroTarget, user_id)
    if not target:
        return jsonify({"recipes": []}), 200

    log = DailyLog.query.filter(
        and_(DailyLog.user_id == user_id, DailyLog.date == date.today())
    ).first()
    consumed = _sum_entries(log.entries) if log else {}

    # Score against remaining macros for the day
    remaining = {
        "calories_kcal": max((target.calories_kcal or 0) - consumed.get("calories_kcal", 0), 50),
        "protein_g":     max((target.protein_g or 0)     - consumed.get("protein_g", 0),     5),
        "carbs_g":       max((target.carbs_g or 0)       - consumed.get("carbs_g", 0),       5),
        "fat_g":         max((target.fat_g or 0)         - consumed.get("fat_g", 0),         5),
    }

    recipes = Recipe.query.limit(100).all()
    recipe_dicts = [r.to_dict() for r in recipes]
    ranked = score_recipes(recipe_dicts, remaining)

    return jsonify({"recipes": ranked[:5]}), 200
