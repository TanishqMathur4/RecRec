import { useLocation, useNavigate } from "react-router-dom";
import { BottomNavigation, BottomNavigationAction, Box, Paper } from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import type { ReactNode } from "react";

const NAV = [
  { label: "Home",     icon: <HomeRoundedIcon />,           path: "/home"     },
  { label: "Progress", icon: <TrackChangesRoundedIcon />,   path: "/progress" },
  { label: "Profile",  icon: <PersonRoundedIcon />,         path: "/profile"  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const current = NAV.findIndex((n) => pathname.startsWith(n.path));

  return (
    <Box sx={{ pb: 8 }}>
      {children}
      <Paper
        elevation={0}
        sx={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          borderTop: "1px solid", borderColor: "divider",
          bgcolor: "background.paper",
          zIndex: 1200,
        }}
      >
        <BottomNavigation
          value={current === -1 ? false : current}
          onChange={(_, i) => navigate(NAV[i].path)}
          sx={{ bgcolor: "transparent" }}
        >
          {NAV.map((n) => (
            <BottomNavigationAction
              key={n.path}
              label={n.label}
              icon={n.icon}
              sx={{
                color: "text.secondary",
                "&.Mui-selected": { color: "primary.main" },
                minWidth: 0,
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
