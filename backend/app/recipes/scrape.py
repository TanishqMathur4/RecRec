"""
URL scraping pipeline.

Flow:
  URL → recipe-scrapers → normalise fields
      → if scraper gave nutrition: store directly
      → else: parse ingredients with ingredient-parser-nlp,
              convert units to grams, hand off to compute_recipe_nutrition()
"""

import re
from recipe_scrapers import scrape_me, scrape_html, WebsiteNotImplementedError
import requests as _requests
from ingredient_parser import parse_ingredient

# ---------------------------------------------------------------------------
# Unit → grams conversion table
# Covers ~80 % of recipe ingredients without a USDA density lookup.
# Values are approximate and intentionally conservative.
# ---------------------------------------------------------------------------

_ML_PER_UNIT: dict[str, float] = {
    "tsp": 5, "teaspoon": 5, "teaspoons": 5,
    "tbsp": 15, "tablespoon": 15, "tablespoons": 15,
    "cup": 240, "cups": 240,
    "fl oz": 30, "fluid ounce": 30, "fluid ounces": 30,
    "ml": 1, "milliliter": 1, "milliliters": 1, "millilitre": 1,
    "l": 1000, "liter": 1000, "liters": 1000, "litre": 1000,
    "pint": 473, "pints": 473,
    "quart": 946, "quarts": 946,
}

_G_PER_UNIT: dict[str, float] = {
    "g": 1, "gram": 1, "grams": 1,
    "kg": 1000, "kilogram": 1000, "kilograms": 1000,
    "oz": 28.35, "ounce": 28.35, "ounces": 28.35,
    "lb": 453.6, "pound": 453.6, "pounds": 453.6,
    "mg": 0.001, "milligram": 0.001, "milligrams": 0.001,
    # whole items — rough gram estimates
    "clove": 5, "cloves": 5,
    "slice": 30, "slices": 30,
    "piece": 50, "pieces": 50,
    "stalk": 40, "stalks": 40,
    "sprig": 5, "sprigs": 5,
    "bunch": 100, "bunches": 100,
    "handful": 40, "handfuls": 40,
    "pinch": 0.5, "pinches": 0.5,
    "dash": 0.6, "dashes": 0.6,
    "can": 400, "cans": 400,
    "jar": 350, "jars": 350,
    "packet": 100, "packets": 100,
    "head": 500, "heads": 500,
    "fillet": 150, "fillets": 150,
    "breast": 200, "breasts": 200,
    "thigh": 120, "thighs": 120,
    "egg": 55, "eggs": 55,
    "large egg": 60, "large eggs": 60,
    "medium egg": 50, "medium eggs": 50,
}

# Density for volume→mass conversion (g/ml). Defaults to 1 (water).
_DENSITY: dict[str, float] = {
    "flour": 0.57, "sugar": 0.85, "brown sugar": 0.82,
    "powdered sugar": 0.56, "icing sugar": 0.56,
    "salt": 1.22, "baking soda": 0.96, "baking powder": 0.9,
    "cocoa": 0.47, "cocoa powder": 0.47,
    "butter": 0.91, "oil": 0.92, "olive oil": 0.92,
    "milk": 1.03, "cream": 1.01, "yogurt": 1.05,
    "honey": 1.42, "maple syrup": 1.32, "molasses": 1.4,
    "rice": 0.75, "oats": 0.39, "rolled oats": 0.39,
    "nuts": 0.6, "almond": 0.6, "almonds": 0.6,
    "water": 1.0, "broth": 1.0, "stock": 1.0,
}
_DEFAULT_DENSITY = 1.0


def _volume_to_grams(amount: float, unit: str, ingredient_name: str) -> float:
    ml = _ML_PER_UNIT.get(unit.lower(), 0)
    if not ml:
        return 0
    name_lower = ingredient_name.lower()
    density = next(
        (_DENSITY[k] for k in _DENSITY if k in name_lower),
        _DEFAULT_DENSITY,
    )
    return ml * amount * density


def ingredient_to_grams(amount: float | None, unit: str | None, name: str) -> tuple[float, bool]:
    """
    Convert (amount, unit, name) → (grams, resolved).
    resolved=False means we fell back to the default (100g).
    """
    if amount is None or amount <= 0:
        return 100.0, False

    unit_clean = (unit or "").strip().lower()

    # Direct weight unit
    if unit_clean in _G_PER_UNIT:
        return amount * _G_PER_UNIT[unit_clean], True

    # Volume unit — use density
    if unit_clean in _ML_PER_UNIT:
        g = _volume_to_grams(amount, unit_clean, name)
        return (g, True) if g > 0 else (100.0, False)

    # Whole item with no unit (e.g. "2 chicken breasts")
    if not unit_clean:
        name_lower = name.lower()
        for key, grams in _G_PER_UNIT.items():
            if key in name_lower:
                return amount * grams, True
        return amount * 100.0, False   # "2 onions" → 200g

    return 100.0, False


def _parse_ingredient_line(line: str) -> dict:
    """
    Use ingredient-parser-nlp to break a raw ingredient string into
    {name, quantity_grams, original_text, resolved}.
    """
    try:
        parsed = parse_ingredient(line)
        # ingredient-parser returns a ParsedIngredient object
        name = parsed.name[0].text if parsed.name else line
        amount_obj = parsed.amount[0] if parsed.amount else None
        amount = float(amount_obj.quantity) if amount_obj and amount_obj.quantity else None
        unit = str(amount_obj.unit) if amount_obj else None
    except Exception:
        return {"name": line, "quantity_grams": 100.0, "original_text": line, "resolved": False}

    grams, resolved = ingredient_to_grams(amount, unit, name or line)
    return {
        "name": name or line,
        "quantity_grams": round(grams, 1),
        "original_text": line,
        "resolved": resolved,
    }


def _parse_servings(yields_str: str | None) -> int:
    """Extract an integer from recipe-scrapers' yields string ('4 servings' → 4)."""
    if not yields_str:
        return 1
    nums = re.findall(r"\d+", str(yields_str))
    return int(nums[0]) if nums else 1


def _build_nutrition_from_scraper(scraper) -> dict | None:
    """
    If the scraper page includes structured nutrition, return a dict ready
    to store in NutritionFact. Returns None if no nutrition available.
    """
    try:
        n = scraper.nutrients()
        if not n:
            return None

        def _extract(key: str) -> float | None:
            val = n.get(key)
            if val is None:
                return None
            nums = re.findall(r"[\d.]+", str(val))
            return float(nums[0]) if nums else None

        kcal = _extract("calories") or _extract("calorieContent")
        protein = _extract("proteinContent")
        carbs = _extract("carbohydrateContent")
        fat = _extract("fatContent")
        fiber = _extract("fiberContent")
        sodium = _extract("sodiumContent")

        if kcal is None and protein is None:
            return None

        return {
            "calories_kcal": kcal,
            "protein_g": protein,
            "carbs_g": carbs,
            "fat_g": fat,
            "fiber_g": fiber,
            "sodium_mg": sodium,
            "source": "scraped",
            "nutrition_confidence": "high",
        }
    except Exception:
        return None


def scrape_url(url: str) -> dict:
    """
    Scrape a recipe URL and return a normalised payload dict.

    Raises WebsiteNotImplementedError if the site is unsupported.
    Raises ValueError for other scraping failures.
    """
    try:
        scraper = scrape_me(url)
    except Exception:
        # scrape_me uses urllib which gets blocked by many sites (403) or fails for
        # unsupported sites — fall back to requests with a browser User-Agent and
        # generic schema.org extraction
        try:
            html = _requests.get(
                url, timeout=15,
                headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
            ).text
            scraper = scrape_html(html, org_url=url, supported_only=False)
        except Exception as e:
            raise ValueError(f"Could not scrape this URL: {e}") from e

    try:
        title = scraper.title() or "Untitled Recipe"
    except Exception:
        title = "Untitled Recipe"

    try:
        raw_ingredients = scraper.ingredients() or []
    except Exception:
        raw_ingredients = []

    try:
        instructions_raw = scraper.instructions() or ""
    except Exception:
        instructions_raw = ""

    try:
        yields_str = scraper.yields()
    except Exception:
        yields_str = None

    try:
        image = scraper.image()
    except Exception:
        image = None

    try:
        total_time = scraper.total_time()
        cook_minutes = int(total_time) if total_time else None
    except Exception:
        cook_minutes = None

    try:
        host = scraper.host()
    except Exception:
        host = None

    servings = _parse_servings(yields_str)
    scraped_nutrition = _build_nutrition_from_scraper(scraper)

    parsed_ingredients = [_parse_ingredient_line(line) for line in raw_ingredients if line.strip()]
    all_resolved = all(i["resolved"] for i in parsed_ingredients)
    nutrition_confidence = "high" if all_resolved else "low"

    return {
        "title": title,
        "source_url": url,
        "source_type": "scraped",
        "source_host": host,
        "instructions_md": instructions_raw,
        "cook_minutes": cook_minutes,
        "servings": servings,
        "image_url": image,
        "ingredients": parsed_ingredients,
        "scraped_nutrition": scraped_nutrition,
        "nutrition_confidence": nutrition_confidence,
    }
