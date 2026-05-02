import { Box, Typography, Card, CardContent, Button } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, macroTarget, logout } = useAuth();

  const macros = macroTarget
    ? [
        { label: "Calories", value: `${macroTarget.calories_kcal} kcal`, color: "#2563eb" },
        { label: "Protein", value: `${macroTarget.protein_g}g`, color: "#16a34a" },
        { label: "Carbs", value: `${macroTarget.carbs_g}g`, color: "#d97706" },
        { label: "Fat", value: `${macroTarget.fat_g}g`, color: "#dc2626" },
        { label: "Fibre", value: `${macroTarget.fiber_g}g`, color: "#7c3aed" },
      ]
    : [];

  return (
    <Box className="p-8 max-w-2xl">
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
        Hey, {user?.display_name}
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 4 }}>
        Your daily macro targets
      </Typography>

      <Box className="grid grid-cols-2 gap-3 mb-8">
        {macros.map((m) => (
          <Card key={m.label} variant="outlined" sx={{ borderLeft: `4px solid ${m.color}` }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>{m.label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{m.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Typography sx={{ color: "text.secondary", mb: 3 }}>
        Recipe feed coming in Phase 5.
      </Typography>

      <Button variant="outlined" size="small" onClick={logout}>
        Sign out
      </Button>
    </Box>
  );
}
