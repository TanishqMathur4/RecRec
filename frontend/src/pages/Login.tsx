import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent,
  CircularProgress, Link, TextField, Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Sign in · RecRec"; }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/home");
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { errors?: Record<string, string>; error?: string } } })
        ?.response?.data;
      setError(
        data?.errors?.email ??
        data?.errors?.password ??
        data?.error ??
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="min-h-screen flex items-center justify-center px-4">
      <Card sx={{ width: "100%", maxWidth: 420 }} elevation={2}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Welcome back</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            Sign in to see your personalised recipe feed.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email" type="email" fullWidth required margin="normal"
              value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <TextField
              label="Password" type="password" fullWidth required margin="normal"
              value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button
              type="submit" variant="contained" fullWidth size="large"
              sx={{ mt: 2 }} disabled={loading || !email.trim() || !password}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : "Sign in"}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 3, textAlign: "center" }}>
            Don't have an account?{" "}
            <Link component={RouterLink} to="/register">Sign up</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
