import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CircularProgress, Box, Typography } from "@mui/material";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import AddRecipe from "./pages/AddRecipe";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, macroTarget } = useAuth();
  if (isLoading) {
    return <Box className="min-h-screen flex flex-col items-center justify-center gap-3">
    <CircularProgress />
    <Typography variant="body2" sx={{ color: "text.secondary" }}>Waking up the server…</Typography>
  </Box>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!macroTarget) return <Navigate to="/onboarding" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading, macroTarget } = useAuth();
  if (isLoading) {
    return <Box className="min-h-screen flex flex-col items-center justify-center gap-3">
    <CircularProgress />
    <Typography variant="body2" sx={{ color: "text.secondary" }}>Waking up the server…</Typography>
  </Box>;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/home" replace /> : <Register />} />
      <Route
        path="/onboarding"
        element={
          !isAuthenticated ? <Navigate to="/login" replace /> :
          macroTarget ? <Navigate to="/home" replace /> :
          <Onboarding />
        }
      />
      <Route path="/home"         element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/progress"     element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/recipes/add"  element={<ProtectedRoute><AddRecipe /></ProtectedRoute>} />
      <Route path="/recipes/:id"  element={<ProtectedRoute><RecipeDetailPage /></ProtectedRoute>} />
      <Route
        path="/"
        element={<Navigate to={!isAuthenticated ? "/login" : !macroTarget ? "/onboarding" : "/home"} replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
