import { Box, Typography } from "@mui/material";

interface Ring {
  label: string;
  value: number;
  target: number;
  color: string;
  track: string;
}

const RINGS: Omit<Ring, "value" | "target">[] = [
  { label: "Calories", color: "#8d9d4f", track: "rgba(141,157,79,0.18)" },
  { label: "Protein",  color: "#5e6e58", track: "rgba(94,110,88,0.18)"  },
  { label: "Carbs",    color: "#b19681", track: "rgba(177,150,129,0.18)"},
  { label: "Fat",      color: "#a18f5c", track: "rgba(161,143,92,0.18)" },
];

const GAP   = 14;   // px between rings
const BASE  = 42;   // innermost radius
const SW    = 11;   // stroke width

interface Props {
  consumed: { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  target:   { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number };
}

function Arc({ r, progress, color, track, sw }: { r: number; progress: number; color: string; track: string; sw: number }) {
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(progress, 1));
  const cx = BASE + (RINGS.length - 1) * (GAP + SW) + SW;

  return (
    <g>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={track} strokeWidth={sw} />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </g>
  );
}

export default function MacroRings({ consumed, target }: Props) {
  const values = [
    { v: consumed.calories_kcal, t: target.calories_kcal },
    { v: consumed.protein_g,     t: target.protein_g     },
    { v: consumed.carbs_g,       t: target.carbs_g       },
    { v: consumed.fat_g,         t: target.fat_g         },
  ];

  const size = (BASE + (RINGS.length - 1) * (GAP + SW) + SW) * 2;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size}>
          {RINGS.map((ring, i) => {
            const r = BASE + i * (GAP + SW);
            const progress = values[i].t > 0 ? values[i].v / values[i].t : 0;
            return <Arc key={ring.label} r={r} progress={progress} color={ring.color} track={ring.track} sw={SW} />;
          })}
        </svg>
        {/* Centre label */}
        <Box sx={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1, color: "#8d9d4f" }}>
            {Math.round(consumed.calories_kcal)}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            / {Math.round(target.calories_kcal)} kcal
          </Typography>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
        {RINGS.map((ring, i) => {
          const v = values[i];
          const pct = v.t > 0 ? Math.min(Math.round((v.v / v.t) * 100), 100) : 0;
          return (
            <Box key={ring.label} sx={{ textAlign: "center", minWidth: 64 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: ring.color, mx: "auto", mb: 0.25 }} />
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                {ring.label}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                {Math.round(v.v)}{i === 0 ? "" : "g"} <span style={{ color: "#85766a" }}>/ {Math.round(v.t)}{i === 0 ? "" : "g"}</span>
              </Typography>
              <Typography variant="caption" sx={{ color: ring.color, fontWeight: 600 }}>{pct}%</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
