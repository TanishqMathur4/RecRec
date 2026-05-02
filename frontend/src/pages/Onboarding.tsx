import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  MobileStepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import { updateProfile } from "../api/profile";
import type { HealthProfile, MacroTarget } from "../api/profile";

// ─── types ───────────────────────────────────────────────────────────────────

type ActivityLevel = HealthProfile["activity_level"];
type Goal = HealthProfile["goal"];

interface FormState {
  age: string;
  sex: "male" | "female" | "";
  heightCm: string;
  weightKg: string;
  heightFt: string;
  heightIn: string;
  weightLbs: string;
  usImperial: boolean;
  activity: ActivityLevel | "";
  goal: Goal | "";
  diabetic: boolean;
  high_bp: boolean;
  meals_per_day: string;
}

// ─── option data ─────────────────────────────────────────────────────────────

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: "sedentary", label: "Sedentary", description: "Desk job, little to no exercise" },
  { value: "light", label: "Light", description: "Light exercise 1–3 days/week" },
  { value: "moderate", label: "Moderate", description: "Exercise 3–5 days/week" },
  { value: "active", label: "Active", description: "Hard exercise 6–7 days/week" },
  { value: "very_active", label: "Very Active", description: "Physical job or 2x daily training" },
];

const GOAL_OPTIONS: { value: Goal; label: string; description: string }[] = [
  { value: "cut", label: "Lose fat", description: "500 kcal deficit, high protein to preserve muscle" },
  { value: "maintain", label: "Maintain", description: "Eat at your maintenance level" },
  { value: "bulk", label: "Gain muscle", description: "Slow clean bulk — 350 kcal surplus" },
  { value: "recomp", label: "Recomp", description: "Lose fat and gain muscle simultaneously" },
  { value: "bodybuilding", label: "Bodybuilding", description: "Maximize muscle growth, structured surplus" },
  { value: "gut_health", label: "Gut health", description: "Fibre-forward eating for digestive wellness" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function feetInchesToCm(ft: string, inch: string): number {
  return (parseFloat(ft || "0") * 12 + parseFloat(inch || "0")) * 2.54;
}

function lbsToKg(lbs: string): number {
  return parseFloat(lbs || "0") * 0.453592;
}

// ─── component ───────────────────────────────────────────────────────────────

const STEPS = ["Basics", "Activity", "Goal", "Health flags", "Confirm"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<MacroTarget | null>(null);

  const [form, setForm] = useState<FormState>({
    age: "",
    sex: "",
    heightCm: "",
    weightKg: "",
    heightFt: "",
    heightIn: "",
    weightLbs: "",
    usImperial: false,
    activity: "",
    goal: "",
    diabetic: false,
    high_bp: false,
    meals_per_day: "3",
  });

  const set = (key: keyof FormState, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── step validation ──────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (step === 0) {
      const age = parseInt(form.age);
      const ok_age = age >= 13 && age <= 100;
      const ok_sex = form.sex !== "";
      const height = form.usImperial
        ? feetInchesToCm(form.heightFt, form.heightIn)
        : parseFloat(form.heightCm);
      const weight = form.usImperial
        ? lbsToKg(form.weightLbs)
        : parseFloat(form.weightKg);
      return ok_age && ok_sex && height >= 100 && weight >= 30;
    }
    if (step === 1) return form.activity !== "";
    if (step === 2) return form.goal !== "";
    return true;
  }

  // ── submission ────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSaving(true);
    setError("");
    const height = form.usImperial
      ? feetInchesToCm(form.heightFt, form.heightIn)
      : parseFloat(form.heightCm);
    const weight = form.usImperial
      ? lbsToKg(form.weightLbs)
      : parseFloat(form.weightKg);

    const payload = {
      age: parseInt(form.age),
      sex: form.sex as "male" | "female",
      height_cm: Math.round(height * 10) / 10,
      weight_kg: Math.round(weight * 10) / 10,
      activity_level: form.activity as ActivityLevel,
      goal: form.goal as Goal,
      health_flags: { diabetic: form.diabetic, high_bp: form.high_bp },
      meals_per_day: parseInt(form.meals_per_day) || 3,
    };

    try {
      const res = await updateProfile(payload);
      if (step === 3) {
        // First save — show confirmation screen
        setPreview(res.macro_target);
        setStep(4);
      } else {
        navigate("/home");
      }
    } catch {
      setError("Something went wrong saving your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ─── render steps ──────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 0:
        return <StepBasics form={form} set={set} />;
      case 1:
        return <StepActivity form={form} set={set} />;
      case 2:
        return <StepGoal form={form} set={set} />;
      case 3:
        return <StepHealthFlags form={form} set={set} />;
      case 4:
        return (
          <StepConfirm
            target={preview}
            onEdit={() => setStep(0)}
            onDone={async () => {
              await refreshProfile();
              navigate("/home");
            }}
          />
        );
      default:
        return null;
    }
  }

  const isLastDataStep = step === 3;
  const isConfirmStep = step === 4;

  return (
    <Box className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card sx={{ width: "100%", maxWidth: 560 }} elevation={2}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Set up your profile
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            We'll use this to calculate your personal macro targets.
          </Typography>

          <MobileStepper
            variant="dots"
            steps={STEPS.length}
            position="static"
            activeStep={step}
            nextButton={null}
            backButton={null}
            sx={{ background: "transparent", justifyContent: "center", mb: 3 }}
          />

          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Step {step + 1} — {STEPS[step]}
          </Typography>

          <Box sx={{ mt: 1, mb: 3 }}>{renderStep()}</Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {!isConfirmStep && (
            <Box className="flex gap-3">
              {step > 0 && (
                <Button variant="outlined" onClick={() => setStep((s) => s - 1)} sx={{ flex: 1 }}>
                  Back
                </Button>
              )}
              {isLastDataStep ? (
                <Button
                  variant="contained"
                  sx={{ flex: 1 }}
                  disabled={!canAdvance() || saving}
                  onClick={handleSubmit}
                >
                  {saving ? <CircularProgress size={22} color="inherit" /> : "See my targets"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  sx={{ flex: 1 }}
                  disabled={!canAdvance()}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Next
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// ─── Step 1: Basics ───────────────────────────────────────────────────────────

function StepBasics({ form, set }: { form: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  return (
    <Box className="flex flex-col gap-3">
      <Box className="flex gap-3">
        <TextField
          label="Age"
          type="number"
          value={form.age}
          onChange={(e) => set("age", e.target.value)}
          slotProps={{ htmlInput: { min: 13, max: 100 } }}
          sx={{ flex: 1 }}
        />
        <ToggleButtonGroup
          value={form.sex}
          exclusive
          onChange={(_, v) => v && set("sex", v)}
          sx={{ flex: 1 }}
        >
          <ToggleButton value="male" sx={{ flex: 1 }}>Male</ToggleButton>
          <ToggleButton value="female" sx={{ flex: 1 }}>Female</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box className="flex items-center gap-2">
        <Typography variant="body2" sx={{ color: "text.secondary" }}>Units:</Typography>
        <ToggleButtonGroup
          value={form.usImperial ? "imperial" : "metric"}
          exclusive
          onChange={(_, v) => v && set("usImperial", v === "imperial")}
          size="small"
        >
          <ToggleButton value="metric">Metric (cm/kg)</ToggleButton>
          <ToggleButton value="imperial">Imperial (ft/lbs)</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {form.usImperial ? (
        <>
          <Box className="flex gap-3">
            <TextField
              label="Height (ft)"
              type="number"
              value={form.heightFt}
              onChange={(e) => set("heightFt", e.target.value)}
              slotProps={{ htmlInput: { min: 3, max: 8 } }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Height (in)"
              type="number"
              value={form.heightIn}
              onChange={(e) => set("heightIn", e.target.value)}
              slotProps={{ htmlInput: { min: 0, max: 11 } }}
              sx={{ flex: 1 }}
            />
          </Box>
          <TextField
            label="Weight (lbs)"
            type="number"
            value={form.weightLbs}
            onChange={(e) => set("weightLbs", e.target.value)}
            slotProps={{ htmlInput: { min: 66, max: 660 } }}
            fullWidth
          />
        </>
      ) : (
        <>
          <TextField
            label="Height (cm)"
            type="number"
            value={form.heightCm}
            onChange={(e) => set("heightCm", e.target.value)}
            slotProps={{ htmlInput: { min: 100, max: 250 } }}
            fullWidth
          />
          <TextField
            label="Weight (kg)"
            type="number"
            value={form.weightKg}
            onChange={(e) => set("weightKg", e.target.value)}
            slotProps={{ htmlInput: { min: 30, max: 300 } }}
            fullWidth
          />
        </>
      )}

      <TextField
        label="Meals per day"
        type="number"
        value={form.meals_per_day}
        onChange={(e) => set("meals_per_day", e.target.value)}
        slotProps={{ htmlInput: { min: 1, max: 8 } }}
        helperText="We'll divide your daily targets by this for per-meal matching"
        fullWidth
      />
    </Box>
  );
}

// ─── Step 2: Activity ─────────────────────────────────────────────────────────

function StepActivity({ form, set }: { form: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  return (
    <Box className="flex flex-col gap-2">
      {ACTIVITY_OPTIONS.map((opt) => (
        <Card
          key={opt.value}
          variant="outlined"
          onClick={() => set("activity", opt.value)}
          sx={{
            cursor: "pointer",
            borderColor: form.activity === opt.value ? "primary.main" : "divider",
            borderWidth: form.activity === opt.value ? 2 : 1,
            bgcolor: form.activity === opt.value ? "primary.50" : "background.paper",
            transition: "all 0.15s",
            "&:hover": { borderColor: "primary.main" },
          }}
        >
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{opt.label}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{opt.description}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

// ─── Step 3: Goal ─────────────────────────────────────────────────────────────

function StepGoal({ form, set }: { form: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  return (
    <Box className="flex flex-col gap-2">
      {GOAL_OPTIONS.map((opt) => (
        <Card
          key={opt.value}
          variant="outlined"
          onClick={() => set("goal", opt.value)}
          sx={{
            cursor: "pointer",
            borderColor: form.goal === opt.value ? "primary.main" : "divider",
            borderWidth: form.goal === opt.value ? 2 : 1,
            bgcolor: form.goal === opt.value ? "primary.50" : "background.paper",
            transition: "all 0.15s",
            "&:hover": { borderColor: "primary.main" },
          }}
        >
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{opt.label}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{opt.description}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

// ─── Step 4: Health flags ─────────────────────────────────────────────────────

function StepHealthFlags({ form, set }: { form: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  return (
    <Box className="flex flex-col gap-2">
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
        Optional. We use these to surface relevant recipes and flag nutrition warnings.
      </Typography>
      <FormControlLabel
        control={<Checkbox checked={form.diabetic} onChange={(e) => set("diabetic", e.target.checked)} />}
        label="I have diabetes or manage blood sugar"
      />
      <FormControlLabel
        control={<Checkbox checked={form.high_bp} onChange={(e) => set("high_bp", e.target.checked)} />}
        label="I have high blood pressure"
      />
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
        None of the above? Just hit "See my targets."
      </Typography>
    </Box>
  );
}

// ─── Step 5: Confirmation ─────────────────────────────────────────────────────

function StepConfirm({
  target,
  onEdit,
  onDone,
}: {
  target: MacroTarget | null;
  onEdit: () => void;
  onDone: () => void;
}) {
  if (!target) return null;

  const macros = [
    { label: "Calories", value: `${target.calories_kcal} kcal`, color: "#2563eb" },
    { label: "Protein", value: `${target.protein_g}g`, color: "#16a34a" },
    { label: "Carbs", value: `${target.carbs_g}g`, color: "#d97706" },
    { label: "Fat", value: `${target.fat_g}g`, color: "#dc2626" },
    { label: "Fibre", value: `${target.fiber_g}g`, color: "#7c3aed" },
  ];

  return (
    <Box>
      <Typography sx={{ mb: 2 }}>
        Based on your inputs, here are your <strong>daily</strong> macro targets:
      </Typography>

      <Box className="grid grid-cols-2 gap-3 mb-4">
        {macros.map((m) => (
          <Card key={m.label} variant="outlined" sx={{ borderLeft: `4px solid ${m.color}` }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>{m.label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{m.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box className="flex gap-3">
        <Button variant="outlined" onClick={onEdit} sx={{ flex: 1 }}>
          Let me adjust
        </Button>
        <Button variant="contained" onClick={onDone} sx={{ flex: 1 }}>
          Looks good — let's go
        </Button>
      </Box>
    </Box>
  );
}
