import { Box, Tooltip, Typography } from "@mui/material";
import type { NutritionFact } from "../api/recipes";

interface MacroTarget {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface Props {
  nutrition: NutritionFact;
  target: MacroTarget;
}

interface Segment {
  label: string;
  actual: number | null;
  target: number;
  unit: string;
}

function segmentColor(actual: number | null, target: number): string {
  if (actual === null || target <= 0) return "#e0e0e0";
  const ratio = actual / target;
  if (ratio >= 0.85 && ratio <= 1.15) return "#4caf50"; // green — within 15%
  if (ratio >= 0.65 && ratio <= 1.35) return "#ff9800"; // amber — within 35%
  return "#f44336";                                      // red — far off
}

export default function MacroBar({ nutrition, target }: Props) {
  const segments: Segment[] = [
    { label: "Calories", actual: nutrition.calories_kcal, target: target.calories_kcal, unit: "kcal" },
    { label: "Protein",  actual: nutrition.protein_g,    target: target.protein_g,    unit: "g" },
    { label: "Carbs",    actual: nutrition.carbs_g,      target: target.carbs_g,      unit: "g" },
    { label: "Fat",      actual: nutrition.fat_g,        target: target.fat_g,        unit: "g" },
  ];

  return (
    <Box sx={{ display: "flex", gap: 0.5, mt: 1, height: 6, borderRadius: 1, overflow: "hidden" }}>
      {segments.map((s) => (
        <Tooltip
          key={s.label}
          title={
            <Typography variant="caption">
              {s.label}: {s.actual !== null ? `${Math.round(s.actual)}${s.unit}` : "?"} / {Math.round(s.target)}{s.unit}
            </Typography>
          }
          placement="top"
          arrow
        >
          <Box
            sx={{
              flex: s.label === "Calories" ? 2 : 1,
              bgcolor: segmentColor(s.actual, s.target),
              borderRadius: 0.5,
              cursor: "default",
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}
