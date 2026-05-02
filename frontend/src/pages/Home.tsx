import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { fetchRecipes } from "../api/recipes";
import type { Recipe } from "../api/recipes";
import MacroBar from "../components/MacroBar";

function MatchBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 80 ? "success" : score >= 55 ? "warning" : "error";
  return (
    <Chip
      label={`${Math.round(score)}% match`}
      color={color}
      size="small"
      sx={{ fontWeight: 600, fontSize: "0.7rem", height: 20 }}
    />
  );
}

export default function Home() {
  const { user, macroTarget, logout } = useAuth();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes({ limit: 50 })
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

      {/* Macro target summary */}
      {macroTarget && (
        <Box className="flex gap-4 flex-wrap mb-5 p-3 rounded" sx={{ bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
          {[
            { label: "Calories", value: `${macroTarget.calories_kcal} kcal` },
            { label: "Protein",  value: `${macroTarget.protein_g}g` },
            { label: "Carbs",    value: `${macroTarget.carbs_g}g` },
            { label: "Fat",      value: `${macroTarget.fat_g}g` },
          ].map((m) => (
            <Box key={m.label}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{m.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.value}</Typography>
            </Box>
          ))}
          <Box sx={{ ml: "auto", alignSelf: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>per meal target</Typography>
          </Box>
        </Box>
      )}

      <Box className="flex items-center justify-between mb-3">
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {macroTarget ? "Best matches for you" : "Recipes"}
        </Typography>
        <Button variant="contained" size="small" onClick={() => navigate("/recipes/add")}>
          + Add recipe
        </Button>
      </Box>

      {loading ? (
        <Box className="flex justify-center p-8"><CircularProgress /></Box>
      ) : recipes.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
          <Typography>No recipes yet.</Typography>
          <Typography variant="body2">Add one to get started.</Typography>
        </Box>
      ) : (
        <Box className="flex flex-col gap-2">
          {recipes.map((r) => (
            <Card key={r.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/recipes/${r.id}`)}>
                <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box className="flex items-start justify-between gap-2">
                    <Typography sx={{ fontWeight: 600 }}>{r.title}</Typography>
                    <MatchBadge score={r.match_score} />
                  </Box>

                  {r.cuisine && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {r.cuisine}
                    </Typography>
                  )}

                  <Box className="flex gap-3 mt-0.5">
                    {r.nutrition ? (
                      <>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {Math.round(r.nutrition.calories_kcal ?? 0)} kcal
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {Math.round(r.nutrition.protein_g ?? 0)}g protein
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {Math.round(r.nutrition.carbs_g ?? 0)}g carbs
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {Math.round(r.nutrition.fat_g ?? 0)}g fat
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>No nutrition data</Typography>
                    )}
                  </Box>

                  {r.nutrition && macroTarget && (
                    <MacroBar nutrition={r.nutrition} target={macroTarget} />
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
