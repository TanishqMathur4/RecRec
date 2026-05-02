import { Typography, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();
  return (
    <Box className="p-8">
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Hey, {user?.display_name}
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 4 }}>
        Your recipe feed is coming in Phase 5.
      </Typography>
      <Typography
        variant="body2"
        sx={{ cursor: "pointer", color: "primary.main" }}
        onClick={logout}
      >
        Sign out
      </Typography>
    </Box>
  );
}
