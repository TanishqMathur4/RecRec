import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress,
  Divider, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchProfile, updateProfile } from "../api/profile";
import type { HealthProfile } from "../api/profile";

type ActivityLevel = HealthProfile["activity_level"];
type Goal = HealthProfile["goal"];

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   "Sedentary",
  light:       "Light",
  moderate:    "Moderate",
  active:      "Active",
  very_active: "Very Active",
};

const GOAL_LABELS: Record<Goal, string> = {
  cut:           "Lose fat",
  maintain:      "Maintain",
  bulk:          "Gain muscle",
  recomp:        "Recomp",
  bodybuilding:  "Bodybuilding",
  gut_health:    "Gut health",
};

export default function Profile() {
  const { user, macroTarget, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // form state
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activity, setActivity] = useState<ActivityLevel | "">("");
  const [goal, setGoal] = useState<Goal | "">("");
  const [mealsPerDay, setMealsPerDay] = useState("3");

  useEffect(() => {
    document.title = "Profile · RecRec";
    fetchProfile()
      .then(({ profile }) => {
        if (!profile) return;
        setProfile(profile);
        populateForm(profile);
      })
      .catch(() => showToast("Couldn't load profile."));
  }, []);

  function populateForm(p: HealthProfile) {
    setAge(String(p.age));
    setSex(p.sex as "male" | "female");
    setHeightCm(String(p.height_cm));
    setWeightKg(String(p.weight_kg));
    setActivity(p.activity_level);
    setGoal(p.goal);
    setMealsPerDay(String(p.meals_per_day));
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const res = await updateProfile({
        age: parseInt(age),
        sex: sex as "male" | "female",
        height_cm: parseFloat(heightCm),
        weight_kg: parseFloat(weightKg),
        activity_level: activity as ActivityLevel,
        goal: goal as Goal,
        meals_per_day: parseInt(mealsPerDay) || 3,
        health_flags: profile?.health_flags ?? {},
      });
      setProfile(res.profile);
      await refreshProfile();
      setEditing(false);
      showToast("Profile updated.", "success");
    } catch {
      setError("Failed to save. Check all fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", p: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{user?.display_name}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>{user?.email}</Typography>
        </Box>
        {!editing && (
          <Button variant="outlined" size="small" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </Box>

      {/* Macro targets */}
      {macroTarget && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Daily targets</Typography>
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              {[
                { label: "Calories", value: `${macroTarget.calories_kcal} kcal` },
                { label: "Protein",  value: `${macroTarget.protein_g}g`         },
                { label: "Carbs",    value: `${macroTarget.carbs_g}g`           },
                { label: "Fat",      value: `${macroTarget.fat_g}g`             },
                { label: "Fibre",    value: `${macroTarget.fiber_g}g`           },
              ].map((m) => (
                <Box key={m.label}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>{m.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.value}</Typography>
                </Box>
              ))}
            </Box>
            {profile && (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                Based on {GOAL_LABELS[profile.goal]} · {ACTIVITY_LABELS[profile.activity_level]} · {profile.meals_per_day} meals/day
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Stats / Edit form */}
      {!editing ? (
        profile ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {[
              { label: "Age",      value: `${profile.age} years` },
              { label: "Sex",      value: profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1) },
              { label: "Height",   value: `${profile.height_cm} cm` },
              { label: "Weight",   value: `${profile.weight_kg} kg` },
              { label: "Activity", value: ACTIVITY_LABELS[profile.activity_level] },
              { label: "Goal",     value: GOAL_LABELS[profile.goal] },
              { label: "Meals/day",value: String(profile.meals_per_day) },
            ].map((row) => (
              <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>{row.label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.value}</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>No profile data yet.</Typography>
        )
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Age" type="number" value={age} onChange={(e) => setAge(e.target.value)} sx={{ flex: 1 }} />
            <ToggleButtonGroup value={sex} exclusive onChange={(_, v) => v && setSex(v)} sx={{ flex: 1 }}>
              <ToggleButton value="male" sx={{ flex: 1 }}>Male</ToggleButton>
              <ToggleButton value="female" sx={{ flex: 1 }}>Female</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Height (cm)" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Weight (kg)" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} sx={{ flex: 1 }} />
          </Box>

          <Typography variant="body2" sx={{ color: "text.secondary" }}>Activity level</Typography>
          <ToggleButtonGroup value={activity} exclusive onChange={(_, v) => v && setActivity(v)} sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([v, l]) => (
              <ToggleButton key={v} value={v} size="small">{l}</ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Typography variant="body2" sx={{ color: "text.secondary" }}>Goal</Typography>
          <ToggleButtonGroup value={goal} exclusive onChange={(_, v) => v && setGoal(v)} sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {(Object.entries(GOAL_LABELS) as [Goal, string][]).map(([v, l]) => (
              <ToggleButton key={v} value={v} size="small">{l}</ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField
            label="Meals per day" type="number" value={mealsPerDay}
            onChange={(e) => setMealsPerDay(e.target.value)}
            slotProps={{ htmlInput: { min: 1, max: 8 } }}
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" sx={{ flex: 1 }} onClick={() => { setEditing(false); profile && populateForm(profile); }}>
              Cancel
            </Button>
            <Button variant="contained" sx={{ flex: 1 }} onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : "Save"}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
