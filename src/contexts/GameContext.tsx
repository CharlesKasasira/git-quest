import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
  AchievementId,
  GameAction,
  GameState,
  Level,
  LevelScoreBreakdown,
  LevelStats,
  isAchievementId,
} from '../types/game';
import { levelsData } from '../data/levels';
import { achievementsData } from '../data/achievements';

interface GameContextType {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
  startLevel: (levelId: number) => void;
  completeLevel: (levelId: number) => void;
  unlockAchievement: (achievementId: AchievementId) => void;
  recordCommandResult: (levelId: number, success: boolean, command: string) => void;
  recordHintUsed: (levelId: number) => void;
  clearLastUnlockedAchievement: () => void;
  resetProgress: () => void;
  saveProgress: () => void;
  currentLevel: Level | undefined;
  unlockedLevels: Level[];
  completedLevels: Level[];
}

const BASE_LEVEL_POINTS = 100;
const ACHIEVEMENT_POINTS = 75;
const SUCCESS_GIT_COMMAND_POINTS = 12;
const SUCCESS_SHELL_COMMAND_POINTS = 6;
const FAILED_COMMAND_PENALTY = 2;

const createDefaultLevelStats = (levelId: number): LevelStats => ({
  levelId,
  attempts: 0,
  successfulCommands: 0,
  failedCommands: 0,
  hintsUsed: 0,
});

const createLevelStatsMap = (): Record<number, LevelStats> =>
  levelsData.reduce<Record<number, LevelStats>>((acc, level) => {
    acc[level.id] = createDefaultLevelStats(level.id);
    return acc;
  }, {});

const createInitialGameState = (): GameState => ({
  currentLevel: 1,
  levels: levelsData.map((level, index) => ({
    ...level,
    completed: false,
    unlocked: index === 0,
  })),
  achievements: achievementsData.map((achievement) => ({
    ...achievement,
    unlocked: false,
  })),
  totalScore: 0,
  completedCommands: [],
  commandStreak: 0,
  bestCommandStreak: 0,
  totalCommandsExecuted: 0,
  successfulCommandsExecuted: 0,
  failedCommandsExecuted: 0,
  levelStats: createLevelStatsMap(),
  startTime: new Date(),
  lastPlayTime: new Date(),
});

const normalizeCommand = (commandInput: string): string => {
  const [first = '', second = ''] = commandInput.trim().toLowerCase().split(/\s+/);
  if (first === 'git' && second) {
    return `git ${second}`;
  }
  return first;
};

const isGitStyleCommand = (command: string): boolean => command.startsWith('git ');

const calculateLevelScore = (
  levelId: number,
  stats: LevelStats,
  commandStreak: number
): LevelScoreBreakdown => {
  const timeMs = stats.completionTimeMs ?? 0;

  let speedBonus = 0;
  if (timeMs > 0 && timeMs <= 90000) {
    speedBonus = 60;
  } else if (timeMs > 0 && timeMs <= 180000) {
    speedBonus = 35;
  } else if (timeMs > 0 && timeMs <= 300000) {
    speedBonus = 20;
  }

  const totalCommands = stats.successfulCommands + stats.failedCommands;
  const accuracy = totalCommands > 0 ? stats.successfulCommands / totalCommands : 1;
  let accuracyBonus = 5;
  if (stats.failedCommands === 0) {
    accuracyBonus = 40;
  } else if (accuracy >= 0.85) {
    accuracyBonus = 25;
  } else if (accuracy >= 0.7) {
    accuracyBonus = 15;
  }

  const streakBonus = Math.min(30, commandStreak * 3);
  const totalPoints = BASE_LEVEL_POINTS + speedBonus + accuracyBonus + streakBonus;

  let grade: LevelScoreBreakdown['grade'] = 'C';
  if (totalPoints >= 210) {
    grade = 'S';
  } else if (totalPoints >= 175) {
    grade = 'A';
  } else if (totalPoints >= 140) {
    grade = 'B';
  }

  return {
    levelId,
    basePoints: BASE_LEVEL_POINTS,
    speedBonus,
    accuracyBonus,
    streakBonus,
    totalPoints,
    timeMs,
    failedCommands: stats.failedCommands,
    grade,
  };
};

const safeDate = (value: unknown, fallback: Date): Date => {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const hydrateSavedProgress = (saved: unknown): GameState => {
  const fallback = createInitialGameState();
  if (!saved || typeof saved !== 'object') {
    return fallback;
  }

  const raw = saved as Partial<GameState> & { [key: string]: any };
  const savedLevels = Array.isArray(raw.levels) ? raw.levels : [];
  const savedAchievements = Array.isArray(raw.achievements) ? raw.achievements : [];
  const savedLevelStats = raw.levelStats ?? {};

  const levels = fallback.levels.map((defaultLevel) => {
    const savedLevel = savedLevels.find((level: any) => level?.id === defaultLevel.id);
    if (!savedLevel) {
      return defaultLevel;
    }
    return {
      ...defaultLevel,
      completed: Boolean(savedLevel.completed),
      unlocked: defaultLevel.id === 1 ? true : Boolean(savedLevel.unlocked),
    };
  });

  const achievements = fallback.achievements.map((defaultAchievement) => {
    const savedAchievement = savedAchievements.find((achievement: any) => achievement?.id === defaultAchievement.id);
    if (!savedAchievement) {
      return defaultAchievement;
    }
    const unlockedAt = savedAchievement.unlockedAt
      ? safeDate(savedAchievement.unlockedAt, new Date())
      : undefined;
    return {
      ...defaultAchievement,
      unlocked: Boolean(savedAchievement.unlocked),
      ...(unlockedAt ? { unlockedAt } : {}),
    };
  });

  const levelStats = levels.reduce<Record<number, LevelStats>>((acc, level) => {
    const defaultStats = createDefaultLevelStats(level.id);
    const stats = savedLevelStats[level.id] ?? {};
    const startedAt = typeof stats.startedAt === 'number' ? stats.startedAt : undefined;
    const completedAt = typeof stats.completedAt === 'number' ? stats.completedAt : undefined;
    const completionTimeMs =
      typeof stats.completionTimeMs === 'number' ? stats.completionTimeMs : undefined;
    const bestCompletionTimeMs =
      typeof stats.bestCompletionTimeMs === 'number' ? stats.bestCompletionTimeMs : undefined;

    acc[level.id] = {
      ...defaultStats,
      attempts: Number(stats.attempts ?? defaultStats.attempts),
      successfulCommands: Number(stats.successfulCommands ?? defaultStats.successfulCommands),
      failedCommands: Number(stats.failedCommands ?? defaultStats.failedCommands),
      hintsUsed: Number(stats.hintsUsed ?? defaultStats.hintsUsed),
      ...(typeof startedAt === 'number' ? { startedAt } : {}),
      ...(typeof completedAt === 'number' ? { completedAt } : {}),
      ...(typeof completionTimeMs === 'number' ? { completionTimeMs } : {}),
      ...(typeof bestCompletionTimeMs === 'number' ? { bestCompletionTimeMs } : {}),
    };
    return acc;
  }, {});

  const completedCommands = Array.isArray(raw.completedCommands)
    ? raw.completedCommands.filter((command): command is string => typeof command === 'string')
    : [];

  let lastLevelScore: GameState['lastLevelScore'];
  if (raw.lastLevelScore && typeof raw.lastLevelScore === 'object') {
    const score = raw.lastLevelScore as any;
    const grade = ['S', 'A', 'B', 'C'].includes(score.grade) ? score.grade : 'C';
    lastLevelScore = {
      levelId: Number(score.levelId ?? 1),
      basePoints: Number(score.basePoints ?? BASE_LEVEL_POINTS),
      speedBonus: Number(score.speedBonus ?? 0),
      accuracyBonus: Number(score.accuracyBonus ?? 0),
      streakBonus: Number(score.streakBonus ?? 0),
      totalPoints: Number(score.totalPoints ?? BASE_LEVEL_POINTS),
      timeMs: Number(score.timeMs ?? 0),
      failedCommands: Number(score.failedCommands ?? 0),
      grade,
    };
  }

  const currentLevelCandidate = Number(raw.currentLevel);
  const currentLevel = levels.some((level) => level.id === currentLevelCandidate)
    ? currentLevelCandidate
    : 1;

  const lastUnlockedAchievementId =
    typeof raw.lastUnlockedAchievementId === 'string' && isAchievementId(raw.lastUnlockedAchievementId)
      ? raw.lastUnlockedAchievementId
      : undefined;

  return {
    ...fallback,
    currentLevel,
    levels,
    achievements,
    totalScore: Number(raw.totalScore ?? fallback.totalScore),
    completedCommands,
    commandStreak: Number(raw.commandStreak ?? fallback.commandStreak),
    bestCommandStreak: Number(raw.bestCommandStreak ?? fallback.bestCommandStreak),
    totalCommandsExecuted: Number(raw.totalCommandsExecuted ?? fallback.totalCommandsExecuted),
    successfulCommandsExecuted: Number(
      raw.successfulCommandsExecuted ?? fallback.successfulCommandsExecuted
    ),
    failedCommandsExecuted: Number(raw.failedCommandsExecuted ?? fallback.failedCommandsExecuted),
    levelStats,
    startTime: raw.startTime ? safeDate(raw.startTime, fallback.startTime) : fallback.startTime,
    lastPlayTime: raw.lastPlayTime ? safeDate(raw.lastPlayTime, fallback.lastPlayTime) : fallback.lastPlayTime,
    ...(lastLevelScore ? { lastLevelScore } : {}),
    ...(lastUnlockedAchievementId ? { lastUnlockedAchievementId } : {}),
  };
};

const initialGameState = createInitialGameState();

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_CURRENT_LEVEL': {
      const restState: GameState = { ...state };
      delete (restState as Partial<GameState>).lastLevelScore;
      const levelStats = state.levelStats[action.payload] ?? createDefaultLevelStats(action.payload);
      return {
        ...restState,
        currentLevel: action.payload,
        levelStats: {
          ...state.levelStats,
          [action.payload]: {
            ...levelStats,
            attempts: levelStats.attempts + 1,
            startedAt: Date.now(),
          },
        },
        lastPlayTime: new Date(),
      };
    }

    case 'COMPLETE_LEVEL': {
      const now = Date.now();
      const currentLevel = state.levels.find((level) => level.id === action.payload);
      if (!currentLevel || currentLevel.completed) {
        return state;
      }

      const existingStats = state.levelStats[action.payload] ?? createDefaultLevelStats(action.payload);
      const completionTimeMs = existingStats.startedAt ? Math.max(0, now - existingStats.startedAt) : 0;
      const bestCompletionTimeMs =
        typeof existingStats.bestCompletionTimeMs === 'number'
          ? Math.min(existingStats.bestCompletionTimeMs, completionTimeMs || existingStats.bestCompletionTimeMs)
          : completionTimeMs || undefined;
      const updatedStats: LevelStats = {
        ...existingStats,
        completedAt: now,
        completionTimeMs,
        ...(typeof bestCompletionTimeMs === 'number' ? { bestCompletionTimeMs } : {}),
      };

      const scoreBreakdown = calculateLevelScore(action.payload, updatedStats, state.commandStreak);
      const updatedLevels = state.levels.map(level => {
        if (level.id === action.payload) {
          return { ...level, completed: true };
        }
        if (level.id === action.payload + 1) {
          return { ...level, unlocked: true };
        }
        return level;
      });

      return {
        ...state,
        levels: updatedLevels,
        levelStats: {
          ...state.levelStats,
          [action.payload]: updatedStats,
        },
        totalScore: state.totalScore + scoreBreakdown.totalPoints,
        lastLevelScore: scoreBreakdown,
        lastPlayTime: new Date(),
      };
    }

    case 'UNLOCK_ACHIEVEMENT': {
      const achievement = state.achievements.find((item) => item.id === action.payload);
      if (!achievement || achievement.unlocked) {
        return state;
      }

      const updatedAchievements = state.achievements.map(achievement => {
        if (achievement.id === action.payload) {
          return { ...achievement, unlocked: true, unlockedAt: new Date() };
        }
        return achievement;
      });

      return {
        ...state,
        achievements: updatedAchievements,
        totalScore: state.totalScore + ACHIEVEMENT_POINTS,
        lastUnlockedAchievementId: action.payload,
      };
    }

    case 'RECORD_COMMAND_RESULT': {
      const commandKey = normalizeCommand(action.payload.command);
      const isGitCommand = isGitStyleCommand(commandKey);
      const points = action.payload.success
        ? isGitCommand
          ? SUCCESS_GIT_COMMAND_POINTS
          : SUCCESS_SHELL_COMMAND_POINTS
        : -FAILED_COMMAND_PENALTY;
      const levelStats = state.levelStats[action.payload.levelId] ?? createDefaultLevelStats(action.payload.levelId);
      const nextStreak = action.payload.success ? state.commandStreak + 1 : 0;
      const completedCommands =
        action.payload.success && commandKey && !state.completedCommands.includes(commandKey)
          ? [...state.completedCommands, commandKey]
          : state.completedCommands;

      return {
        ...state,
        completedCommands,
        commandStreak: nextStreak,
        bestCommandStreak: Math.max(state.bestCommandStreak, nextStreak),
        totalCommandsExecuted: state.totalCommandsExecuted + 1,
        successfulCommandsExecuted:
          state.successfulCommandsExecuted + (action.payload.success ? 1 : 0),
        failedCommandsExecuted: state.failedCommandsExecuted + (action.payload.success ? 0 : 1),
        totalScore: Math.max(0, state.totalScore + points),
        levelStats: {
          ...state.levelStats,
          [action.payload.levelId]: {
            ...levelStats,
            successfulCommands:
              levelStats.successfulCommands + (action.payload.success ? 1 : 0),
            failedCommands: levelStats.failedCommands + (action.payload.success ? 0 : 1),
          },
        },
        lastPlayTime: new Date(),
      };
    }

    case 'RECORD_HINT_USED': {
      const levelStats = state.levelStats[action.payload] ?? createDefaultLevelStats(action.payload);
      return {
        ...state,
        levelStats: {
          ...state.levelStats,
          [action.payload]: {
            ...levelStats,
            hintsUsed: levelStats.hintsUsed + 1,
          },
        },
        lastPlayTime: new Date(),
      };
    }

    case 'CLEAR_LAST_UNLOCKED_ACHIEVEMENT':
      if (!state.lastUnlockedAchievementId) {
        return state;
      }
      const restState: GameState = { ...state };
      delete (restState as Partial<GameState>).lastUnlockedAchievementId;
      return {
        ...restState,
      };

    case 'RESET_PROGRESS':
      return createInitialGameState();

    case 'LOAD_PROGRESS':
      return hydrateSavedProgress(action.payload);

    default:
      return state;
  }
}

const getCompletedLevelStats = (state: GameState): LevelStats[] =>
  Object.values(state.levelStats).filter((stats) => typeof stats.completedAt === 'number');

const getTotalHintsUsed = (state: GameState): number =>
  Object.values(state.levelStats).reduce((total, stats) => total + stats.hintsUsed, 0);

const getAchievementCriteria = (state: GameState): Record<AchievementId, boolean> => {
  const completedLevels = state.levels.filter((level) => level.completed);
  const completedStats = getCompletedLevelStats(state);
  const level3Stats = state.levelStats[3];
  const totalHintsUsed = getTotalHintsUsed(state);
  const masteredGitCommands = state.completedCommands.filter((command) =>
    command.startsWith('git ')
  ).length;

  return {
    'first-steps': completedLevels.some((level) => level.id === 1),
    'branch-wizard': completedLevels.some((level) => level.id === 3),
    'conflict-resolver':
      completedLevels.some((level) => level.id === 3) &&
      Boolean(level3Stats) &&
      level3Stats.failedCommands <= 2 &&
      state.completedCommands.includes('git merge'),
    'time-reverter': completedLevels.some((level) => level.id === 4),
    'timeline-master': completedLevels.length === state.levels.length,
    speedrunner: completedStats.some(
      (stats) => typeof stats.completionTimeMs === 'number' && stats.completionTimeMs <= 120000
    ),
    perfectionist: completedStats.some((stats) => stats.failedCommands === 0),
    explorer: totalHintsUsed > 0,
    'comeback-kid': completedStats.some((stats) => stats.failedCommands >= 3),
    'git-guru': completedLevels.length === state.levels.length && masteredGitCommands >= 10,
  };
};

const GameContext = createContext<GameContextType | null>(null);

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);

  const currentLevel = useMemo(
    () => gameState.levels.find((level) => level.id === gameState.currentLevel),
    [gameState.levels, gameState.currentLevel]
  );

  const unlockedLevels = useMemo(
    () => gameState.levels.filter((level) => level.unlocked),
    [gameState.levels]
  );

  const completedLevels = useMemo(
    () => gameState.levels.filter((level) => level.completed),
    [gameState.levels]
  );

  useEffect(() => {
    const savedProgress = localStorage.getItem('git-quest-progress');
    if (savedProgress) {
      try {
        const parsedProgress = JSON.parse(savedProgress);
        dispatch({ type: 'LOAD_PROGRESS', payload: parsedProgress });
      } catch (error) {
        console.error('Failed to load saved progress:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('git-quest-progress', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    const criteria = getAchievementCriteria(gameState);
    gameState.achievements.forEach((achievement) => {
      const achievementId = achievement.id as AchievementId;
      if (!achievement.unlocked && criteria[achievementId]) {
        dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: achievementId });
      }
    });
  }, [gameState]);

  const startLevel = useCallback((levelId: number) => {
    dispatch({ type: 'SET_CURRENT_LEVEL', payload: levelId });
  }, []);

  const completeLevel = useCallback((levelId: number) => {
    dispatch({ type: 'COMPLETE_LEVEL', payload: levelId });
  }, []);

  const unlockAchievement = useCallback((achievementId: AchievementId) => {
    dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: achievementId });
  }, []);

  const recordCommandResult = useCallback((levelId: number, success: boolean, command: string) => {
    dispatch({ type: 'RECORD_COMMAND_RESULT', payload: { levelId, success, command } });
  }, []);

  const recordHintUsed = useCallback((levelId: number) => {
    dispatch({ type: 'RECORD_HINT_USED', payload: levelId });
  }, []);

  const clearLastUnlockedAchievement = useCallback(() => {
    dispatch({ type: 'CLEAR_LAST_UNLOCKED_ACHIEVEMENT' });
  }, []);

  const resetProgress = useCallback(() => {
    dispatch({ type: 'RESET_PROGRESS' });
    localStorage.removeItem('git-quest-progress');
  }, []);

  const saveProgress = useCallback(() => {
    localStorage.setItem('git-quest-progress', JSON.stringify(gameState));
  }, [gameState]);

  const contextValue = useMemo(
    () => ({
      gameState,
      dispatch,
      startLevel,
      completeLevel,
      unlockAchievement,
      recordCommandResult,
      recordHintUsed,
      clearLastUnlockedAchievement,
      resetProgress,
      saveProgress,
      currentLevel,
      unlockedLevels,
      completedLevels,
    }),
    [
      gameState,
      startLevel,
      completeLevel,
      unlockAchievement,
      recordCommandResult,
      recordHintUsed,
      clearLastUnlockedAchievement,
      resetProgress,
      saveProgress,
      currentLevel,
      unlockedLevels,
      completedLevels,
    ]
  );

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
