from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Recipe, Ingredient
from ..nutrition.compute import compute_recipe_nutrition
from ..nutrition.usda import search_food

recipes_bp = Blueprint("recipes", __name__, url_prefix="/api")


def _validate_recipe_input(data: dict) -> tuple[dict | None, dict | None]:
    errors = {}
    title = (data.get("title") or "").strip()
    servings = data.get("servings", 1)
    ingredients = data.get("ingredients", [])

    if not title:
        errors["title"] = "Title is required."
    if not isinstance(servings, int) or servings < 1:
        errors["servings"] = "Servings must be a positive integer."
    if not isinstance(ingredients, list) or len(ingredients) == 0:
        errors["ingredients"] = "At least one ingredient is required."

    if errors:
        return None, errors

    return {
        "title": title,
        "description": (data.get("description") or "").strip() or None,
        "instructions_md": (data.get("instructions_md") or "").strip() or None,
        "prep_minutes": data.get("prep_minutes"),
        "cook_minutes": data.get("cook_minutes"),
        "servings": int(servings),
        "difficulty": data.get("difficulty"),
        "equipment": data.get("equipment") or [],
        "cuisine": (data.get("cuisine") or "").strip() or None,
        "tags": data.get("tags") or [],
        "image_url": (data.get("image_url") or "").strip() or None,
        "ingredients": ingredients,
    }, None


@recipes_bp.post("/recipes")
@jwt_required()
def create_recipe():
    user_id = get_jwt_identity()
    data, errors = _validate_recipe_input(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 422

    recipe = Recipe(
        title=data["title"],
        description=data["description"],
        instructions_md=data["instructions_md"],
        prep_minutes=data["prep_minutes"],
        cook_minutes=data["cook_minutes"],
        servings=data["servings"],
        difficulty=data["difficulty"],
        equipment=data["equipment"],
        cuisine=data["cuisine"],
        tags=data["tags"],
        image_url=data["image_url"],
        source_type="manual",
        created_by_user_id=user_id,
    )
    db.session.add(recipe)
    db.session.flush()  # get recipe.id before computing nutrition

    compute_recipe_nutrition(recipe.id, data["ingredients"], data["servings"])
    db.session.commit()

    return jsonify({"recipe": recipe.to_dict(include_ingredients=True)}), 201


@recipes_bp.get("/recipes/<recipe_id>")
@jwt_required()
def get_recipe(recipe_id: str):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({"error": "Recipe not found."}), 404
    return jsonify({"recipe": recipe.to_dict(include_ingredients=True)}), 200


@recipes_bp.get("/recipes")
@jwt_required()
def list_recipes():
    limit = min(int(request.args.get("limit", 20)), 100)
    offset = int(request.args.get("offset", 0))
    recipes = (Recipe.query
               .order_by(Recipe.created_at.desc())
               .offset(offset)
               .limit(limit)
               .all())
    return jsonify({
        "recipes": [r.to_dict() for r in recipes],
        "limit": limit,
        "offset": offset,
    }), 200


@recipes_bp.get("/ingredients/search")
@jwt_required()
def search_ingredients():
    """Autocomplete: search local DB first, fall back to USDA."""
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify({"results": []}), 200

    # Local DB first
    local = (Ingredient.query
             .filter(Ingredient.name.ilike(f"%{q}%"))
             .limit(5)
             .all())

    if local:
        return jsonify({"results": [{"name": i.name, "fdc_id": i.usda_fdc_id} for i in local]}), 200

    # Fall back to USDA
    usda_results = search_food(q)
    return jsonify({
        "results": [{"name": r["description"], "fdc_id": r["fdc_id"]} for r in usda_results]
    }), 200
