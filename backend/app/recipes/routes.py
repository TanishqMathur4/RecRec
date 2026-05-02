from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from recipe_scrapers import WebsiteNotImplementedError
from ..extensions import db
from ..models import Recipe, Ingredient, NutritionFact, MacroTarget
from ..nutrition.compute import compute_recipe_nutrition
from ..nutrition.usda import search_food
from .scrape import scrape_url
from ..matching.score import score_recipes

recipes_bp = Blueprint("recipes", __name__, url_prefix="/api")

# A curated sample shown to users when a site isn't supported.
FEATURED_SITES = [
    "allrecipes.com", "bbcgoodfood.com", "budgetbytes.com",
    "delish.com", "epicurious.com", "food52.com",
    "foodnetwork.com", "halfbakedharvest.com", "minimalistbaker.com",
    "seriouseats.com", "skinnytaste.com", "tasty.co",
]


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
    db.session.flush()

    compute_recipe_nutrition(recipe.id, data["ingredients"], data["servings"])
    db.session.commit()

    return jsonify({"recipe": recipe.to_dict(include_ingredients=True)}), 201


@recipes_bp.post("/recipes/scrape")
@jwt_required()
def scrape_recipe():
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()

    if not url:
        return jsonify({"errors": {"url": "URL is required."}}), 422

    try:
        scraped = scrape_url(url)
    except WebsiteNotImplementedError:
        return jsonify({
            "error": "This site isn't supported yet. Try one of the sites listed below.",
            "supported_sites": FEATURED_SITES,
        }), 422
    except ValueError as e:
        return jsonify({"error": str(e)}), 422

    recipe = Recipe(
        title=scraped["title"],
        source_url=scraped["source_url"],
        source_type="scraped",
        instructions_md=scraped["instructions_md"],
        cook_minutes=scraped["cook_minutes"],
        servings=scraped["servings"],
        image_url=scraped["image_url"],
        created_by_user_id=user_id,
    )
    db.session.add(recipe)
    db.session.flush()

    scraped_nutrition = scraped.get("scraped_nutrition")

    if scraped_nutrition:
        # Site provided structured nutrition — store it directly
        fact = NutritionFact(
            recipe_id=recipe.id,
            calories_kcal=scraped_nutrition.get("calories_kcal"),
            protein_g=scraped_nutrition.get("protein_g"),
            carbs_g=scraped_nutrition.get("carbs_g"),
            fat_g=scraped_nutrition.get("fat_g"),
            fiber_g=scraped_nutrition.get("fiber_g"),
            sodium_mg=scraped_nutrition.get("sodium_mg"),
            source="scraped",
            nutrition_confidence="high",
        )
        db.session.add(fact)
        # Still create RecipeIngredient rows (for display), but skip USDA lookup
        from ..models import RecipeIngredient, Ingredient as IngredientModel
        for item in scraped["ingredients"]:
            name = (item.get("name") or "").lower().strip()
            if not name:
                continue
            ingredient = IngredientModel.query.filter(
                db.func.lower(IngredientModel.name) == name
            ).first()
            if not ingredient:
                ingredient = IngredientModel(name=name)
                db.session.add(ingredient)
                db.session.flush()
            ri = RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_id=ingredient.id,
                quantity_grams=item.get("quantity_grams", 100.0),
                original_text=item.get("original_text", name),
            )
            db.session.add(ri)
    else:
        # No structured nutrition — compute from ingredients via USDA
        compute_recipe_nutrition(recipe.id, scraped["ingredients"], scraped["servings"])

    db.session.commit()
    return jsonify({"recipe": recipe.to_dict(include_ingredients=True)}), 201


@recipes_bp.get("/recipes/supported-sites")
@jwt_required()
def supported_sites():
    return jsonify({"sites": FEATURED_SITES}), 200


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
    user_id = get_jwt_identity()
    limit = min(int(request.args.get("limit", 50)), 100)
    offset = int(request.args.get("offset", 0))

    recipes = (Recipe.query
               .order_by(Recipe.created_at.desc())
               .offset(offset)
               .limit(limit)
               .all())

    recipe_dicts = [r.to_dict() for r in recipes]

    macro_target = db.session.get(MacroTarget, user_id)
    if macro_target:
        recipe_dicts = score_recipes(recipe_dicts, macro_target.to_dict())
    else:
        for r in recipe_dicts:
            r["match_score"] = None

    return jsonify({
        "recipes": recipe_dicts,
        "limit": limit,
        "offset": offset,
    }), 200


@recipes_bp.get("/ingredients/search")
@jwt_required()
def search_ingredients():
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify({"results": []}), 200

    local = (Ingredient.query
             .filter(Ingredient.name.ilike(f"%{q}%"))
             .limit(5)
             .all())

    if local:
        return jsonify({"results": [{"name": i.name, "fdc_id": i.usda_fdc_id} for i in local]}), 200

    usda_results = search_food(q)
    return jsonify({
        "results": [{"name": r["description"], "fdc_id": r["fdc_id"]} for r in usda_results]
    }), 200
