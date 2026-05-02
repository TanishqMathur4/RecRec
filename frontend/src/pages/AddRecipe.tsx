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
import { createRecipe } from "../api/recipes";

interface IngredientRow {
  name: string;
  quantity_grams: string;
}

const emptyIngredient = (): IngredientRow => ({ name: "", quantity_grams: "" });

export default function AddRecipe() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  // Form state
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

  function updateIngredient(i: number, field: keyof IngredientRow, value: string) {
    setIngredients((rows) => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function addIngredient() {
    setIngredients((rows) => [...rows, emptyIngredient()]);
  }

  function removeIngredient(i: number) {
    setIngredients((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setErrors({});
    setSaving(true);
    try {
      const validIngredients = ingredients.filter((r) => r.name.trim() && parseFloat(r.quantity_grams) > 0);
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
      if (Object.keys(apiErrors).length) {
        setErrors(apiErrors);
      } else {
        setErrors({ general: "Failed to save recipe. Please try again." });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", p: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Add a recipe
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Enter manually" />
        <Tab label="From URL" disabled />
      </Tabs>

      {errors.general && <Alert severity="error" sx={{ mb: 2 }}>{errors.general}</Alert>}

      <Box className="flex flex-col gap-3">
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
              onClick={() => removeIngredient(i)}
              disabled={ingredients.length === 1}
              size="small"
              aria-label="remove ingredient"
            >
              ✕
            </IconButton>
          </Box>
        ))}

        {errors.ingredients && (
          <Typography variant="body2" color="error">{errors.ingredients}</Typography>
        )}

        <Button variant="outlined" size="small" onClick={addIngredient} sx={{ alignSelf: "flex-start" }}>
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
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            sx={{ flex: 1 }}
          >
            {saving ? <CircularProgress size={22} color="inherit" /> : "Save recipe"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
