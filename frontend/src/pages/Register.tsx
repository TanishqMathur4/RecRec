import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent,
  CircularProgress, Link, TextField, Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Create account · RecRec"; }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const local: Record<string, string> = {};
    if (!displayName.trim()) local.display_name = "Name is required.";
    if (!email.trim()) local.email = "Email is required.";
    if (password.length < 8) local.password = "Password must be at least 8 characters.";
    if (Object.keys(local).length) { setErrors(local); return; }

    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim());
      navigate("/onboarding");
    } catch (err: unknown) {
      const apiErrors =
        (err as { response?: { data?: { errors?: Record<string, string> } } })
          ?.response?.data?.errors ?? {};
      setErrors(
        Object.keys(apiErrors).length
          ? apiErrors
          : { general: "Registration failed. Please try again." }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="min-h-screen flex items-center justify-center px-4">
      <Card sx={{ width: "100%", maxWidth: 420 }} elevation={2}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Create your account</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            Tell us a little about you and we'll calculate your macro targets.
          </Typography>

          {errors.general && <Alert severity="error" sx={{ mb: 2 }}>{errors.general}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Display name" fullWidth required margin="normal"
              value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              error={!!errors.display_name} helperText={errors.display_name}
              autoComplete="name"
            />
            <TextField
              label="Email" type="email" fullWidth required margin="normal"
              value={email} onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email} helperText={errors.email}
              autoComplete="email"
            />
            <TextField
              label="Password" type="password" fullWidth required margin="normal"
              value={password} onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password}
              helperText={errors.password ?? "Minimum 8 characters"}
              autoComplete="new-password"
            />
            <Button
              type="submit" variant="contained" fullWidth size="large"
              sx={{ mt: 2 }} disabled={loading}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : "Create account"}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 3, textAlign: "center" }}>
            Already have an account?{" "}
            <Link component={RouterLink} to="/login">Sign in</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
