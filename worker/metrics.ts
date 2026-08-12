export const safeRatio = (numerator: number | null, denominator: number | null) =>
  numerator === null || denominator === null || denominator === 0 ? null : numerator / denominator;

export function derivedMetrics(input: { views: number | null; likes: number | null; coins: number | null; favorites: number | null; comments: number | null; shares: number | null; followers: number | null; avgWatchSeconds: number | null }) {
  const interactions = [input.likes, input.coins, input.favorites, input.comments, input.shares].some((v) => v === null)
    ? null : [input.likes, input.coins, input.favorites, input.comments, input.shares].reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return {
    interactionRate: safeRatio(interactions, input.views),
    followerConversion: safeRatio(input.followers, input.views),
    watchHours: input.views === null || input.avgWatchSeconds === null ? null : input.views * input.avgWatchSeconds / 3600
  };
}

