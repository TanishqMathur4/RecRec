import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import "./index.css";
import App from "./App.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";

const theme = createTheme({
  palette: {
    primary: { main: "#2563eb" },
  },
  shape: { borderRadius: 10 },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);
