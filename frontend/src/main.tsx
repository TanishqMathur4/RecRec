import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import "./index.css";
import App from "./App.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";

const SANS  = '"Merriweather", serif';
const SERIF = '"Source Serif 4", serif';
const MONO  = '"JetBrains Mono", monospace';

const theme = createTheme({
  palette: {
    primary:    { main: "#8d9d4f", light: "#9db18c", dark: "#71856a", contrastText: "#fdfbf6" },
    secondary:  { main: "#decea0", contrastText: "#5c4b3e" },
    error:      { main: "#d98b7e", contrastText: "#faf8f2" },
    warning:    { main: "#a18f5c", contrastText: "#fdfbf6" },
    success:    { main: "#9db18c", contrastText: "#fdfbf6" },
    info:       { main: "#8a9f7b", contrastText: "#fdfbf6" },
    background: { default: "#e4d7b0", paper: "#e7dbbf" },
    text:       { primary: "#5c4b3e", secondary: "#85766a" },
    divider:    "#b19681",
  },

  typography: {
    fontFamily: SANS,
    h1: { fontFamily: SERIF },
    h2: { fontFamily: SERIF },
    h3: { fontFamily: SERIF },
    h4: { fontFamily: SERIF },
    h5: { fontFamily: SERIF },
    h6: { fontFamily: SERIF },
    subtitle1: { fontFamily: SERIF },
    subtitle2: { fontFamily: SERIF },
    button: { fontFamily: SANS, textTransform: "none", fontWeight: 700 },
    overline: { fontFamily: SANS, letterSpacing: "0.08em" },
    caption: { fontFamily: SANS },
    body1: { fontFamily: SANS },
    body2: { fontFamily: SANS },
  },

  shape: { borderRadius: 7 },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#e4d7b0", color: "#5c4b3e", fontFamily: SANS },
        code: { fontFamily: MONO },
        pre:  { fontFamily: MONO },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", backgroundColor: "#e7dbbf" },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#e7dbbf",
          border: "1px solid #b19681",
          boxShadow: "3px 3px 2px 0px hsl(88 22% 35% / 0.15)",
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
          fontFamily: SANS,
          fontWeight: 700,
          textTransform: "none",
          borderRadius: 7,
        },
        outlined: {
          borderColor: "#b19681",
          "&:hover": { borderColor: "#8d9d4f", backgroundColor: "rgba(141,157,79,0.08)" },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontFamily: SANS,
          backgroundColor: "#dbc894",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#b19681" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#8d9d4f" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#8d9d4f" },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { fontFamily: SANS, color: "#85766a", "&.Mui-focused": { color: "#8d9d4f" } },
      },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: "#b19681" } },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontFamily: SANS },
        outlined: { borderColor: "#b19681" },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: { fontFamily: SANS, textTransform: "none", fontWeight: 600 },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: "#8d9d4f" },
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: SANS,
          textTransform: "none",
          borderColor: "#b19681",
          color: "#5c4b3e",
          "&.Mui-selected": {
            backgroundColor: "rgba(141,157,79,0.18)",
            color: "#5c4b3e",
            borderColor: "#8d9d4f",
            "&:hover": { backgroundColor: "rgba(141,157,79,0.25)" },
          },
          "&:hover": { backgroundColor: "rgba(141,157,79,0.08)" },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { fontFamily: SANS },
      },
    },

    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: "rgba(177,150,129,0.25)" },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: SANS,
          backgroundColor: "#5c4b3e",
          color: "#fdfbf6",
          fontSize: "0.72rem",
        },
        arrow: { color: "#5c4b3e" },
      },
    },

    MuiMobileStepper: {
      styleOverrides: {
        dot: { backgroundColor: "#b19681" },
        dotActive: { backgroundColor: "#8d9d4f" },
      },
    },
  },
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
