import { Typography, Box } from "@mui/material";

export default function Onboarding() {
  return (
    <Box className="p-8">
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Onboarding
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>Coming in Phase 2.</Typography>
    </Box>
  );
}
