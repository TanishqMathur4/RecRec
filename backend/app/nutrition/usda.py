"""
USDA FoodData Central API client.
Docs: https://fdc.nal.usda.gov/api-guide.html
Free API key at: https://fdc.nal.usda.gov/api-key-signup.html
"""

import os
import requests

USDA_BASE = "https://api.nal.usda.gov/fdc/v1"

# Nutrient IDs in FoodData Central
_NUTRIENT_IDS = {
    "kcal":    1008,
    "protein": 1003,
    "carbs":   1005,
    "fat":     1004,
    "fiber":   1079,
    "sodium":  1093,
}

# In-process cache: query string → result dict
_search_cache: dict[str, dict | None] = {}


def _api_key() -> str:
    return os.environ.get("USDA_API_KEY", "DEMO_KEY")


def _extract_nutrients(food_nutrients: list) -> dict:
    """Pull the six nutrient values we care about from an FDC food record."""
    by_id = {n.get("nutrientId") or n.get("nutrient", {}).get("id"): n
             for n in food_nutrients}
    def get_val(nid: int) -> float | None:
        entry = by_id.get(nid)
        if not entry:
            return None
        return entry.get("value") or entry.get("amount")

    return {
        "kcal_per_100g":    get_val(_NUTRIENT_IDS["kcal"]),
        "protein_g_per_100g": get_val(_NUTRIENT_IDS["protein"]),
        "carbs_g_per_100g": get_val(_NUTRIENT_IDS["carbs"]),
        "fat_g_per_100g":   get_val(_NUTRIENT_IDS["fat"]),
        "fiber_g_per_100g": get_val(_NUTRIENT_IDS["fiber"]),
        "sodium_mg_per_100g": get_val(_NUTRIENT_IDS["sodium"]),
    }


def search_food(query: str) -> list[dict]:
    """
    Search FDC by ingredient name. Returns up to 5 matches with per-100g macros.
    Results are cached in-process for the server's lifetime.
    """
    cache_key = query.lower().strip()
    if cache_key in _search_cache:
        return _search_cache[cache_key] or []

    try:
        resp = requests.get(
            f"{USDA_BASE}/foods/search",
            params={
                "api_key": _api_key(),
                "query": query,
                "dataType": "Foundation,SR Legacy",
                "pageSize": 5,
            },
            timeout=5,
        )
        resp.raise_for_status()
        foods = resp.json().get("foods", [])
        results = []
        for f in foods:
            nutrients = _extract_nutrients(f.get("foodNutrients", []))
            results.append({
                "fdc_id": f["fdcId"],
                "description": f["description"],
                **nutrients,
            })
        _search_cache[cache_key] = results
        return results
    except Exception:
        _search_cache[cache_key] = None
        return []


def get_food(fdc_id: int) -> dict | None:
    """Fetch a single food by FDC ID and return per-100g macros."""
    try:
        resp = requests.get(
            f"{USDA_BASE}/food/{fdc_id}",
            params={"api_key": _api_key()},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        nutrients = _extract_nutrients(data.get("foodNutrients", []))
        return {"fdc_id": fdc_id, "description": data.get("description", ""), **nutrients}
    except Exception:
        return None
