export interface RankTier {
  name: string;
  minScore: number;
}

export interface RankProgress {
  currentRank: RankTier;
  nextRank?: RankTier;
  progressPercent: number;
  currentFloor: number;
  nextFloor: number;
}

export const rankTiers: RankTier[] = [
  { name: 'Timeline Cadet', minScore: 0 },
  { name: 'Repo Ranger', minScore: 350 },
  { name: 'Branch Captain', minScore: 800 },
  { name: 'Merge Commander', minScore: 1400 },
  { name: 'Git Chronomaster', minScore: 2200 },
];

const defaultRankTier: RankTier = { name: 'Timeline Cadet', minScore: 0 };

export const getRankProgress = (score: number): RankProgress => {
  const current = [...rankTiers]
    .reverse()
    .find((tier) => score >= tier.minScore) ?? defaultRankTier;

  const currentIndex = rankTiers.findIndex((tier) => tier.name === current.name);
  const next = currentIndex >= 0 ? rankTiers[currentIndex + 1] : undefined;

  if (!next) {
    return {
      currentRank: current,
      progressPercent: 100,
      currentFloor: current.minScore,
      nextFloor: current.minScore,
    };
  }

  const span = Math.max(1, next.minScore - current.minScore);
  const progress = Math.min(100, Math.max(0, ((score - current.minScore) / span) * 100));

  return {
    currentRank: current,
    nextRank: next,
    progressPercent: progress,
    currentFloor: current.minScore,
    nextFloor: next.minScore,
  };
};

export const formatDuration = (milliseconds?: number): string => {
  if (!milliseconds || milliseconds <= 0) {
    return '0s';
  }
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};
