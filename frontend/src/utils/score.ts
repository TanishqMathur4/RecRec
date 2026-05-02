const WEIGHTS: Record<string, number> = {
  calories_kcal: 0.40,
  protein_g:     0.30,
  carbs_g:       0.20,
  fat_g:         0.10,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function score_recipe(nutrition: any, target: any): number {
  let totalError = 0;
  for (const [macro, weight] of Object.entries(WEIGHTS)) {
    const t = target[macro] ?? 0;
    const a = nutrition[macro] ?? 0;
    if (t <= 0) continue;
    const relErr = Math.min(Math.abs(a - t) / t, 1.0);
    totalError += weight * relErr * relErr;
  }
  return Math.round((1 - totalError) * 100 * 10) / 10;
}
