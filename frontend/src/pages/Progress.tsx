import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardActionArea, CardContent,
  Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, Skeleton, TextField, Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchToday, logMeal, deleteMeal, fetchRecommended } from "../api/log";
import type { TodayLog, MealEntry } from "../api/log";
import type { Recipe } from "../api/recipes";
import { fetchRecipes } from "../api/recipes";
import MacroRings from "../components/MacroRings";
import MacroBar from "../components/MacroBar";

const EMPTY_TOTALS = { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

export default function Progress() {
  const { macroTarget } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [log, setLog] = useState<TodayLog | null>(null);
  const [recommended, setRecommended] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  useEffect(() => { document.title = "Progress · RecRec"; }, []);

  const reload = useCallback(async () => {
    try {
      const [todayData, recData] = await Promise.all([fetchToday(), fetchRecommended()]);
      setLog(todayData);
      setRecommended(recData.recipes);
    } catch {
      showToast("Couldn't load today's data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function handleDelete(entry: MealEntry) {
    try {
      await deleteMeal(entry.id);
      await reload();
    } catch {
      showToast("Couldn't remove that entry.");
    }
  }

  const totals = log?.totals ?? EMPTY_TOTALS;
  const target = macroTarget ?? { calories_kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65, fiber_g: 30 };

  const remaining = {
    calories_kcal: Math.max((target.calories_kcal) - totals.calories_kcal, 0),
    protein_g:     Math.max((target.protein_g)     - totals.protein_g,     0),
    carbs_g:       Math.max((target.carbs_g)       - totals.carbs_g,       0),
    fat_g:         Math.max((target.fat_g)         - totals.fat_g,         0),
  };

  const allDone = Object.values(remaining).every((v) => v === 0);

  return (
    <Box sx={{ maxWidth: 680, mx: "auto", p: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Progress</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </Typography>

      {/* Rings */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>
      ) : (
        <MacroRings consumed={totals} target={target} />
      )}

      {/* Remaining summary */}
      {!loading && (
        <Card variant="outlined" sx={{ mt: 3, mb: 3 }}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            {allDone ? (
              <Typography sx={{ textAlign: "center", fontWeight: 600, color: "primary.main" }}>
                All goals hit for today!
              </Typography>
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Still to go</Typography>
                <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {[
                    { label: "Calories", value: `${Math.round(remaining.calories_kcal)} kcal` },
                    { label: "Protein",  value: `${Math.round(remaining.protein_g)}g`         },
                    { label: "Carbs",    value: `${Math.round(remaining.carbs_g)}g`            },
                    { label: "Fat",      value: `${Math.round(remaining.fat_g)}g`              },
                  ].map((m) => (
                    <Box key={m.label}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>{m.label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Meals logged */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Meals today</Typography>
        <Button
          size="small" variant="contained" startIcon={<AddRoundedIcon />}
          onClick={() => setLogDialogOpen(true)}
        >
          Log meal
        </Button>
      </Box>

      {!loading && log?.entries.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Nothing logged yet — hit "Log meal" to add a recipe you ate.
        </Typography>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
        {log?.entries.map((entry) => (
          <Card key={entry.id} variant="outlined">
            <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 }, display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }} noWrap>
                  {entry.recipe_title}
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mt: 0.25 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {entry.servings} serving{entry.servings !== 1 ? "s" : ""}
                  </Typography>
                  {entry.nutrition && (
                    <>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {Math.round(entry.nutrition.calories_kcal ?? 0)} kcal
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {Math.round(entry.nutrition.protein_g ?? 0)}g P
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
              <IconButton size="small" onClick={() => handleDelete(entry)} sx={{ color: "text.secondary" }}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Recommended */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {allDone ? "Well done — here are some light options" : "Recommended to hit your goals"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
        Ranked by how well they fill your remaining macros.
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={72} sx={{ borderRadius: 1 }} />)}
        </Box>
      ) : recommended.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>No recipes yet — add some from the Home tab.</Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {recommended.map((r) => (
            <Card key={r.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/recipes/${r.id}`)}>
                <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>{r.title}</Typography>
                    {r.match_score !== null && (
                      <Chip
                        label={`${Math.round(r.match_score ?? 0)}% match`}
                        size="small"
                        color={r.match_score >= 80 ? "success" : r.match_score >= 55 ? "warning" : "default"}
                        sx={{ fontSize: "0.68rem", height: 18, flexShrink: 0 }}
                      />
                    )}
                  </Box>
                  {r.nutrition && (
                    <Box sx={{ display: "flex", gap: 2, mt: 0.25 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {Math.round(r.nutrition.calories_kcal ?? 0)} kcal
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {Math.round(r.nutrition.protein_g ?? 0)}g P
                      </Typography>
                    </Box>
                  )}
                  {r.nutrition && macroTarget && (
                    <MacroBar nutrition={r.nutrition} target={remaining} />
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      <LogMealDialog
        open={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
        onLogged={reload}
      />
    </Box>
  );
}

function LogMealDialog({ open, onClose, onLogged }: { open: boolean; onClose: () => void; onLogged: () => void }) {
  const { showToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [servings, setServings] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRecipes({ limit: 100 }).then(({ recipes }) => setRecipes(recipes)).catch(() => {});
    } else {
      setSearch(""); setSelected(null); setServings("1");
    }
  }, [open]);

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.cuisine ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleLog() {
    if (!selected) return;
    setSaving(true);
    try {
      await logMeal(selected.id, parseFloat(servings) || 1);
      onLogged();
      onClose();
    } catch {
      showToast("Couldn't log that meal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: "var(--font-serif)" }}>Log a meal</DialogTitle>
      <DialogContent>
        <TextField
          label="Search recipes" fullWidth size="small" sx={{ mb: 1.5 }}
          value={search} onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <Box sx={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.75 }}>
          {filtered.map((r) => (
            <Card
              key={r.id} variant="outlined"
              onClick={() => setSelected(r)}
              sx={{
                cursor: "pointer",
                borderColor: selected?.id === r.id ? "primary.main" : "divider",
                borderWidth: selected?.id === r.id ? 2 : 1,
                bgcolor: selected?.id === r.id ? "rgba(141,157,79,0.1)" : "background.paper",
              }}
            >
              <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>{r.title}</Typography>
                {r.nutrition && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {Math.round(r.nutrition.calories_kcal ?? 0)} kcal · {Math.round(r.nutrition.protein_g ?? 0)}g P per serving
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
        {selected && (
          <TextField
            label="Servings" type="number" size="small"
            value={servings} onChange={(e) => setServings(e.target.value)}
            sx={{ mt: 2 }} fullWidth
            slotProps={{ htmlInput: { min: 0.25, step: 0.25 } }}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" onClick={handleLog}
          disabled={!selected || saving || !(parseFloat(servings) > 0)}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "Log it"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
