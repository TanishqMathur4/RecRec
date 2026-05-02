import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { createRecipe, scrapeRecipe } from "../api/recipes";

interface IngredientRow {
  name: string;
  quantity_grams: string;
}

const emptyIngredient = (): IngredientRow => ({ name: "", quantity_grams: "" });

export default function AddRecipe() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  // ── URL tab state ────────────────────────────────────────────────────────
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [supportedSites, setSupportedSites] = useState<string[]>([]);

  // ── Manual tab state ─────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepMinutes, setPrepMinutes] = useState("");
  const [cookMinutes, setCookMinutes] = useState("");
  const [servings, setServings] = useState("1");
  const [cuisine, setCuisine] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([emptyIngredient()]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── URL scrape submit ────────────────────────────────────────────────────
  async function handleScrape() {
    setScrapeError("");
    setSupportedSites([]);
    setScraping(true);
    try {
      const { recipe } = await scrapeRecipe(url.trim());
      navigate(`/recipes/${recipe.id}`);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: string; supported_sites?: string[] } } })?.response?.data;
      setScrapeError(resp?.error ?? "Failed to scrape this URL. Please try another.");
      setSupportedSites(resp?.supported_sites ?? []);
    } finally {
      setScraping(false);
    }
  }

  // ── Manual submit ────────────────────────────────────────────────────────
  async function handleManualSubmit() {
    setErrors({});
    setSaving(true);
    try {
      const validIngredients = ingredients.filter(
        (r) => r.name.trim() && parseFloat(r.quantity_grams) > 0
      );
      const { recipe } = await createRecipe({
        title: title.trim(),
        description: description.trim() || undefined,
        instructions_md: instructions.trim() || undefined,
        prep_minutes: prepMinutes ? parseInt(prepMinutes) : undefined,
        cook_minutes: cookMinutes ? parseInt(cookMinutes) : undefined,
        servings: parseInt(servings) || 1,
        cuisine: cuisine.trim() || undefined,
        ingredients: validIngredients.map((r) => ({
          name: r.name.trim(),
          quantity_grams: parseFloat(r.quantity_grams),
          original_text: r.name.trim(),
        })),
      });
      navigate(`/recipes/${recipe.id}`);
    } catch (err: unknown) {
      const apiErrors =
        (err as { response?: { data?: { errors?: Record<string, string> } } })
          ?.response?.data?.errors ?? {};
      setErrors(
        Object.keys(apiErrors).length
          ? apiErrors
          : { general: "Failed to save recipe. Please try again." }
      );
    } finally {
      setSaving(false);
    }
  }

  function updateIngredient(i: number, field: keyof IngredientRow, value: string) {
    setIngredients((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  }

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", p: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Add a recipe
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="From URL" />
        <Tab label="Enter manually" />
      </Tabs>

      {/* ── URL tab ─────────────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box className="flex flex-col gap-3">
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Paste a link from any supported recipe site and we'll import it automatically.
          </Typography>

          <TextField
            label="Recipe URL"
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.allrecipes.com/recipe/..."
            onKeyDown={(e) => e.key === "Enter" && url.trim() && handleScrape()}
          />

          {scrapeError && (
            <Alert severity="error">
              {scrapeError}
              {supportedSites.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Supported sites include:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {supportedSites.map((s) => (
                      <li key={s}>
                        <Typography variant="body2">{s}</Typography>
                      </li>
                    ))}
                  </Box>
                </Box>
              )}
            </Alert>
          )}

          <Box className="flex gap-3">
            <Button variant="outlined" onClick={() => navigate("/home")} sx={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleScrape}
              disabled={scraping || !url.trim()}
              sx={{ flex: 1 }}
            >
              {scraping ? <CircularProgress size={22} color="inherit" /> : "Import recipe"}
            </Button>
          </Box>
        </Box>
      )}

      {/* ── Manual tab ──────────────────────────────────────────────────── */}
      {tab === 1 && (
        <Box className="flex flex-col gap-3">
          {errors.general && <Alert severity="error">{errors.general}</Alert>}

          <TextField
            label="Title *"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Box className="flex gap-3">
            <TextField
              label="Prep (min)"
              type="number"
              value={prepMinutes}
              onChange={(e) => setPrepMinutes(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Cook (min)"
              type="number"
              value={cookMinutes}
              onChange={(e) => setCookMinutes(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Servings *"
              type="number"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Box>

          <TextField
            label="Cuisine"
            fullWidth
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="e.g. Italian, Mexican, Japanese"
          />

          <Divider />

          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Ingredients
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: -1 }}>
            Enter quantities in grams — we use these to compute nutrition.
          </Typography>

          {ingredients.map((row, i) => (
            <Box key={i} className="flex gap-2 items-center">
              <TextField
                label="Ingredient name"
                value={row.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                sx={{ flex: 3 }}
                placeholder="e.g. chicken breast"
              />
              <TextField
                label="Grams"
                type="number"
                value={row.quantity_grams}
                onChange={(e) => updateIngredient(i, "quantity_grams", e.target.value)}
                sx={{ flex: 1 }}
              />
              <IconButton
                onClick={() =>
                  setIngredients((rows) => rows.filter((_, idx) => idx !== i))
                }
                disabled={ingredients.length === 1}
                size="small"
              >
                ✕
              </IconButton>
            </Box>
          ))}

          {errors.ingredients && (
            <Typography variant="body2" color="error">{errors.ingredients}</Typography>
          )}

          <Button
            variant="outlined"
            size="small"
            onClick={() => setIngredients((rows) => [...rows, emptyIngredient()])}
            sx={{ alignSelf: "flex-start" }}
          >
            + Add ingredient
          </Button>

          <Divider />

          <TextField
            label="Instructions (markdown supported)"
            fullWidth
            multiline
            rows={6}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={"1. Preheat oven to 200°C\n2. Season the chicken..."}
          />

          <Box className="flex gap-3">
            <Button variant="outlined" onClick={() => navigate("/home")} sx={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleManualSubmit}
              disabled={saving || !title.trim()}
              sx={{ flex: 1 }}
            >
              {saving ? <CircularProgress size={22} color="inherit" /> : "Save recipe"}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
