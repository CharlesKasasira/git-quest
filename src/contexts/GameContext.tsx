import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { GameState, Level, Achievement } from '../types/game';
import { levelsData } from '../data/levels';
import { achievementsData } from '../data/achievements';

interface GameContextType {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
  startLevel: (levelId: number) => void;
  completeLevel: (levelId: number) => void;
  unlockAchievement: (achievementId: string) => void;
  resetProgress: () => void;
  saveProgress: () => void;
  currentLevel: Level | undefined;
  unlockedLevels: Level[];
  completedLevels: Level[];
}

type GameAction =
  | { type: 'SET_CURRENT_LEVEL'; payload: number }
  | { type: 'COMPLETE_LEVEL'; payload: number }
  | { type: 'UNLOCK_ACHIEVEMENT'; payload: string }
  | { type: 'ADD_COMPLETED_COMMAND'; payload: string }
  | { type: 'RESET_PROGRESS' }
  | { type: 'LOAD_PROGRESS'; payload: GameState };

const initialGameState: GameState = {
  currentLevel: 1,
  levels: levelsData,
  achievements: achievementsData,
  totalScore: 0,
  completedCommands: [],
  startTime: new Date(),
  lastPlayTime: new Date(),
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_CURRENT_LEVEL':
      return {
        ...state,
        currentLevel: action.payload,
        lastPlayTime: new Date(),
      };

    case 'COMPLETE_LEVEL':
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
        totalScore: state.totalScore + 100,
        lastPlayTime: new Date(),
      };

    case 'UNLOCK_ACHIEVEMENT':
      const updatedAchievements = state.achievements.map(achievement => {
        if (achievement.id === action.payload) {
          return { ...achievement, unlocked: true, unlockedAt: new Date() };
        }
        return achievement;
      });

      return {
        ...state,
        achievements: updatedAchievements,
        totalScore: state.totalScore + 50,
      };

    case 'ADD_COMPLETED_COMMAND':
      if (!state.completedCommands.includes(action.payload)) {
        return {
          ...state,
          completedCommands: [...state.completedCommands, action.payload],
          totalScore: state.totalScore + 10,
        };
      }
      return state;

    case 'RESET_PROGRESS':
      return {
        ...initialGameState,
        startTime: new Date(),
        levels: levelsData.map((level, index) => ({
          ...level,
          completed: false,
          unlocked: index === 0,
        })),
        achievements: achievementsData.map(achievement => ({
          ...achievement,
          unlocked: false,
          unlockedAt: undefined,
        })),
      };

    case 'LOAD_PROGRESS':
      return action.payload;

    default:
      return state;
  }
}

const GameContext = createContext<GameContextType | null>(null);

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);

  // Memoize expensive calculations
  const currentLevel = useMemo(() => 
    gameState.levels.find(level => level.id === gameState.currentLevel),
    [gameState.levels, gameState.currentLevel]
  );

  const unlockedLevels = useMemo(() => 
    gameState.levels.filter(level => level.unlocked),
    [gameState.levels]
  );

  const completedLevels = useMemo(() => 
    gameState.levels.filter(level => level.completed),
    [gameState.levels]
  );

  // Load progress from localStorage on mount
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

  // Save progress to localStorage whenever gameState changes
  useEffect(() => {
    localStorage.setItem('git-quest-progress', JSON.stringify(gameState));
  }, [gameState]);

  // Memoize callback functions to prevent unnecessary re-renders
  const startLevel = useCallback((levelId: number) => {
    dispatch({ type: 'SET_CURRENT_LEVEL', payload: levelId });
  }, []);

  const completeLevel = useCallback((levelId: number) => {
    dispatch({ type: 'COMPLETE_LEVEL', payload: levelId });
    
    // Check for achievements
    if (levelId === 1) {
      unlockAchievement('first-steps');
    }
    if (levelId === 3) {
      unlockAchievement('branch-wizard');
    }
    if (levelId === 4) {
      unlockAchievement('time-reverter');
    }
    if (levelId === 5) {
      unlockAchievement('timeline-master');
    }
  }, []);

  const unlockAchievement = useCallback((achievementId: string) => {
    dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: achievementId });
  }, []);

  const resetProgress = useCallback(() => {
    dispatch({ type: 'RESET_PROGRESS' });
    localStorage.removeItem('git-quest-progress');
  }, []);

  const saveProgress = useCallback(() => {
    localStorage.setItem('git-quest-progress', JSON.stringify(gameState));
  }, [gameState]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    gameState,
    dispatch,
    startLevel,
    completeLevel,
    unlockAchievement,
    resetProgress,
    saveProgress,
    currentLevel,
    unlockedLevels,
    completedLevels,
  }), [
    gameState,
    startLevel,
    completeLevel,
    unlockAchievement,
    resetProgress,
    saveProgress,
    currentLevel,
    unlockedLevels,
    completedLevels,
  ]);

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
} 