import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, CardActionArea, CardContent, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { fetchRecipes } from "../api/recipes";
import type { Recipe } from "../api/recipes";

export default function Home() {
  const { user, macroTarget, logout } = useAuth();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes({ limit: 20 })
      .then(({ recipes }) => setRecipes(recipes))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ maxWidth: 680, mx: "auto", p: 4 }}>
      <Box className="flex items-center justify-between mb-4">
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Hey, {user?.display_name}
        </Typography>
        <Button size="small" variant="outlined" onClick={logout}>Sign out</Button>
      </Box>

      {/* Macro summary strip */}
      {macroTarget && (
        <Box className="flex gap-4 flex-wrap mb-5 p-3 rounded" sx={{ bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
          {[
            { label: "Calories", value: `${macroTarget.calories_kcal} kcal` },
            { label: "Protein", value: `${macroTarget.protein_g}g` },
            { label: "Carbs", value: `${macroTarget.carbs_g}g` },
            { label: "Fat", value: `${macroTarget.fat_g}g` },
          ].map((m) => (
            <Box key={m.label}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{m.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.value}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <Box className="flex items-center justify-between mb-3">
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Recipes</Typography>
        <Button variant="contained" size="small" onClick={() => navigate("/recipes/add")}>
          + Add recipe
        </Button>
      </Box>

      {loading ? (
        <Box className="flex justify-center p-8"><CircularProgress /></Box>
      ) : recipes.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
          <Typography>No recipes yet.</Typography>
          <Typography variant="body2">Ask Kim to add one, or add one yourself.</Typography>
        </Box>
      ) : (
        <Box className="flex flex-col gap-2">
          {recipes.map((r) => (
            <Card key={r.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/recipes/${r.id}`)}>
                <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography sx={{ fontWeight: 600 }}>{r.title}</Typography>
                  <Box className="flex gap-3 mt-0.5">
                    {r.nutrition ? (
                      <>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {r.nutrition.calories_kcal} kcal
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {r.nutrition.protein_g}g protein
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {r.nutrition.carbs_g}g carbs
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>No nutrition data</Typography>
                    )}
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
