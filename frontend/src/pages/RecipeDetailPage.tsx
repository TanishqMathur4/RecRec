import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  Alert, Box, Button, Chip,
  Divider, Skeleton, Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { fetchRecipe } from "../api/recipes";
import type { Recipe } from "../api/recipes";
import { score_recipe } from "../utils/score";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { macroTarget } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchRecipe(id)
      .then(({ recipe }) => {
        setRecipe(recipe);
        document.title = `${recipe.title} · RecRec`;
      })
      .catch(() => setError("Recipe not found."))
      .finally(() => setLoading(false));
    return () => { document.title = "RecRec"; };
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 680, mx: "auto", p: 4 }}>
        <Skeleton width={60} height={32} sx={{ mb: 2 }} />
        <Skeleton width="70%" height={40} />
        <Skeleton width="40%" height={24} sx={{ mt: 1, mb: 3 }} />
        <Skeleton width="100%" height={100} />
      </Box>
    );
  }

  if (error || !recipe) {
    return (
      <Box sx={{ maxWidth: 680, mx: "auto", p: 4 }}>
        <Alert severity="error">{error || "Recipe not found."}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/home")}>← Back to home</Button>
      </Box>
    );
  }

  const n = recipe.nutrition;
  const matchScore = n && macroTarget ? score_recipe(n, macroTarget) : null;
  const totalMin = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

  return (
    <Box sx={{ maxWidth: 680, mx: "auto", p: 4 }}>
      <Button size="small" onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← Back
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>{recipe.title}</Typography>

      <Box className="flex gap-2 flex-wrap mb-3">
        {recipe.cuisine && <Chip label={recipe.cuisine} size="small" />}
        {recipe.prep_minutes != null && (
          <Chip label={`Prep ${recipe.prep_minutes}m`} size="small" variant="outlined" />
        )}
        {recipe.cook_minutes != null && (
          <Chip label={`Cook ${recipe.cook_minutes}m`} size="small" variant="outlined" />
        )}
        {totalMin > 0 && (
          <Chip label={`Total ${totalMin}m`} size="small" variant="outlined" />
        )}
        <Chip
          label={`${recipe.servings} serving${recipe.servings !== 1 ? "s" : ""}`}
          size="small"
          variant="outlined"
        />
        {matchScore !== null && (
          <Chip
            label={`${Math.round(matchScore)}% match`}
            size="small"
            color={matchScore >= 80 ? "success" : matchScore >= 55 ? "warning" : "error"}
          />
        )}
        {recipe.source_type === "scraped" && (
          <Chip label="Imported" size="small" color="info" />
        )}
      </Box>

      {recipe.description && (
        <Typography sx={{ color: "text.secondary", mb: 3 }}>{recipe.description}</Typography>
      )}

      {/* Nutrition */}
      {n ? (
        <Box sx={{ mb: 3 }}>
          <Box className="flex items-center gap-2 mb-1">
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Nutrition per serving
            </Typography>
            {n.nutrition_confidence === "low" && (
              <Chip label="Estimated" size="small" color="warning" />
            )}
          </Box>
          <Box className="flex gap-4 flex-wrap">
            {[
              { label: "Calories", value: n.calories_kcal, unit: "kcal" },
              { label: "Protein",  value: n.protein_g,    unit: "g" },
              { label: "Carbs",    value: n.carbs_g,      unit: "g" },
              { label: "Fat",      value: n.fat_g,        unit: "g" },
              { label: "Fibre",    value: n.fiber_g,      unit: "g" },
            ].map((m) => (
              <Box key={m.label} sx={{ minWidth: 72 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>{m.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {m.value != null ? `${Math.round(m.value)}${m.unit}` : "—"}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No nutrition data available for this recipe.
          </Typography>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Ingredients */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Ingredients</Typography>
        {recipe.ingredients && recipe.ingredients.length > 0 ? (
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            {recipe.ingredients.map((ri) => (
              <Box component="li" key={ri.id} sx={{ mb: 0.5 }}>
                <Typography>
                  {ri.original_text || ri.ingredient_name}
                  {!ri.original_text && ` — ${ri.quantity_grams}g`}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No ingredients listed.
          </Typography>
        )}
      </Box>

      {/* Instructions */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Instructions</Typography>
        {recipe.instructions_md ? (
          <Box sx={{ "& p": { mb: 1 }, "& ol, & ul": { pl: 2, mb: 1 }, "& li": { mb: 0.5 } }}>
            <ReactMarkdown>{recipe.instructions_md}</ReactMarkdown>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No instructions listed.
          </Typography>
        )}
      </Box>

      {recipe.source_url && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Source:{" "}
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit" }}
            >
              {new URL(recipe.source_url).hostname.replace(/^www\./, "")}
            </a>
          </Typography>
        </>
      )}
    </Box>
  );
}
