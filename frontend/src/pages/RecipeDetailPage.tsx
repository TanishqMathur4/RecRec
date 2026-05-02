import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Typography,
} from "@mui/material";
import { fetchRecipe } from "../api/recipes";
import type { Recipe } from "../api/recipes";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchRecipe(id)
      .then(({ recipe }) => setRecipe(recipe))
      .catch(() => setError("Recipe not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box className="flex items-center justify-center p-8">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !recipe) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error || "Recipe not found."}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/home")}>Back</Button>
      </Box>
    );
  }

  const n = recipe.nutrition;

  return (
    <Box sx={{ maxWidth: 680, mx: "auto", p: 4 }}>
      <Button size="small" onClick={() => navigate("/home")} sx={{ mb: 2 }}>
        ← Back
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{recipe.title}</Typography>

      <Box className="flex gap-2 flex-wrap mb-3">
        {recipe.cuisine && <Chip label={recipe.cuisine} size="small" />}
        {recipe.prep_minutes && <Chip label={`Prep ${recipe.prep_minutes}m`} size="small" variant="outlined" />}
        {recipe.cook_minutes && <Chip label={`Cook ${recipe.cook_minutes}m`} size="small" variant="outlined" />}
        <Chip label={`${recipe.servings} serving${recipe.servings !== 1 ? "s" : ""}`} size="small" variant="outlined" />
        {recipe.source_type === "scraped" && <Chip label="Scraped" size="small" color="info" />}
      </Box>

      {recipe.description && (
        <Typography sx={{ color: "text.secondary", mb: 3 }}>{recipe.description}</Typography>
      )}

      {/* Nutrition */}
      {n && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Nutrition per serving
            {n.nutrition_confidence === "low" && (
              <Chip label="Low confidence" size="small" color="warning" sx={{ ml: 1 }} />
            )}
          </Typography>
          <Box className="flex gap-4 flex-wrap">
            {[
              { label: "Calories", value: n.calories_kcal, unit: "kcal" },
              { label: "Protein", value: n.protein_g, unit: "g" },
              { label: "Carbs", value: n.carbs_g, unit: "g" },
              { label: "Fat", value: n.fat_g, unit: "g" },
              { label: "Fibre", value: n.fiber_g, unit: "g" },
            ].map((m) => (
              <Box key={m.label} sx={{ minWidth: 80 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>{m.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {m.value != null ? `${m.value}${m.unit}` : "—"}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Ingredients */}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Ingredients</Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            {recipe.ingredients.map((ri) => (
              <Box component="li" key={ri.id} sx={{ mb: 0.5 }}>
                <Typography>
                  {ri.original_text || ri.ingredient_name} — {ri.quantity_grams}g
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Instructions */}
      {recipe.instructions_md && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Instructions</Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{recipe.instructions_md}</Typography>
        </Box>
      )}

      {recipe.source_url && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2">
            Source:{" "}
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
              {recipe.source_url}
            </a>
          </Typography>
        </Box>
      )}
    </Box>
  );
}
