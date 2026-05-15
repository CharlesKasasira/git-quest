import { ComponentType, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { useTerminal } from '../contexts/TerminalContext';
import { LevelManager } from '../utils/levelManager';
import {
  CheckCircle,
  Clock,
  Flame,
  GitBranch,
  Lock,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { Level } from '../types/game';

const levelIcons: Record<number, ComponentType<any>> = {
  1: Clock,
  2: Shield,
  3: GitBranch,
  4: RotateCcw,
  5: Zap,
};

function TimelinePanel() {
  const { gameState, startLevel } = useGame();
  const { terminalState } = useTerminal();
  const currentLevel = gameState.levels.find(level => level.id === gameState.currentLevel);
  const levelManager = useMemo(() => new LevelManager(), []);
  const unlockedAchievements = gameState.achievements.filter((achievement) => achievement.unlocked);

  const handleLevelClick = (level: Level) => {
    if (level.unlocked && !level.completed) {
      startLevel(level.id);
    }
  };

  const objectiveStatuses = useMemo(() => {
    if (!currentLevel) {
      return [];
    }
    return levelManager.getObjectiveStatuses(
      currentLevel,
      terminalState.currentRepo,
      terminalState.history
    );
  }, [currentLevel, levelManager, terminalState.currentRepo, terminalState.history]);

  const missionProgress = useMemo(() => {
    if (!currentLevel) {
      return 0;
    }
    return levelManager.getCompletionPercentage(
      currentLevel,
      terminalState.currentRepo,
      terminalState.history
    );
  }, [currentLevel, levelManager, terminalState.currentRepo, terminalState.history]);

  const currentLevelStats = currentLevel ? gameState.levelStats[currentLevel.id] : undefined;
  const successful = currentLevelStats?.successfulCommands ?? 0;
  const failed = currentLevelStats?.failedCommands ?? 0;
  const totalCommands = successful + failed;
  const accuracy = totalCommands > 0 ? Math.round((successful / totalCommands) * 100) : 100;

  return (
    <div className="h-full p-6 overflow-y-auto terminal-scrollbar">
      {/* Timeline Map */}
      <div className="mb-8">
        <h2 className="text-xl font-pixel text-terminal-primary mb-6 neon-glow">
          TIMELINE MAP
        </h2>
        
        <div className="space-y-4">
          {gameState.levels.map((level, index) => {
            const Icon = levelIcons[level.id] ?? Clock;
            const isActive = level.id === gameState.currentLevel;
            const isCompleted = level.completed;
            const isLocked = !level.unlocked;
            
            return (
              <div key={level.id} className="relative">
                {/* Connection Line */}
                {index < gameState.levels.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-terminal-primary opacity-50" />
                )}
                
                <div
                  className={`
                    flex items-center space-x-3 p-3 rounded border-2 transition-all cursor-pointer
                    ${isActive 
                      ? 'border-terminal-primary bg-terminal-primary bg-opacity-20 shadow-lg' 
                      : isCompleted
                        ? 'border-terminal-secondary bg-terminal-secondary bg-opacity-10'
                        : isLocked
                          ? 'border-gray-600 bg-gray-800 opacity-50 cursor-not-allowed'
                          : 'border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-10'
                    }
                  `}
                  onClick={() => handleLevelClick(level)}
                >
                  <div className={`
                    w-12 h-12 rounded-full border-2 flex items-center justify-center
                    ${isCompleted 
                      ? 'border-terminal-secondary bg-terminal-secondary' 
                      : isActive
                        ? 'border-terminal-primary bg-terminal-primary'
                        : 'border-gray-600'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-black" />
                    ) : isLocked ? (
                      <Lock className="w-6 h-6 text-gray-400" />
                    ) : (
                      <Icon className={`w-6 h-6 ${isActive ? 'text-black' : 'text-terminal-primary'}`} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm font-mono">Level {level.id}</div>
                    <div className={`text-lg ${isActive ? 'text-terminal-primary' : 'text-terminal-text'}`}>
                      {level.title}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Level Details */}
      {currentLevel && (
        <div className="border-t-2 border-terminal-primary pt-6">
          <h3 className="text-lg font-pixel text-terminal-primary mb-4">
            MISSION BRIEFING
          </h3>
          
          {/* Story */}
          <div className="mb-6 p-4 bg-black border border-terminal-primary rounded">
            <h4 className="text-sm text-terminal-secondary mb-2">STORY</h4>
            <p className="text-sm leading-relaxed text-terminal-text">
              {currentLevel.story}
            </p>
          </div>
          
          {/* Objectives */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm text-terminal-secondary">OBJECTIVES</h4>
              <span className="text-xs text-terminal-primary font-mono">
                {missionProgress}% complete
              </span>
            </div>
            <div className="w-full h-2 border border-terminal-primary rounded bg-black mb-3">
              <div
                className="h-full bg-terminal-primary rounded transition-all duration-500"
                style={{ width: `${missionProgress}%` }}
              />
            </div>
            <ul className="space-y-2">
              {objectiveStatuses.map((item, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm">
                  <span className={`mt-0.5 ${item.completed ? 'text-terminal-secondary' : 'text-terminal-primary'}`}>
                    {item.completed ? '✓' : '▸'}
                  </span>
                  <span className={item.completed ? 'text-terminal-secondary line-through' : 'text-terminal-text'}>
                    {item.objective}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Expected Commands */}
          <div>
            <h4 className="text-sm text-terminal-secondary mb-2">KEY COMMANDS</h4>
            <div className="flex flex-wrap gap-2">
              {currentLevel.expectedCommands.map((command, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-terminal-primary bg-opacity-20 border border-terminal-primary rounded text-xs text-terminal-primary font-mono"
                >
                  {command}
                </span>
              ))}
            </div>
          </div>

          {/* Player Mission Stats */}
          <div className="mt-6 p-4 bg-black border border-terminal-secondary rounded">
            <h4 className="text-sm text-terminal-secondary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              CURRENT MISSION STATS
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border border-terminal-primary rounded p-2">
                <div className="text-terminal-secondary mb-1">Accuracy</div>
                <div className="text-terminal-primary font-mono">{accuracy}%</div>
              </div>
              <div className="border border-terminal-primary rounded p-2">
                <div className="text-terminal-secondary mb-1">Command Streak</div>
                <div className="text-terminal-primary font-mono">x{gameState.commandStreak}</div>
              </div>
              <div className="border border-terminal-primary rounded p-2">
                <div className="text-terminal-secondary mb-1">Hints Used</div>
                <div className="text-terminal-primary font-mono">{currentLevelStats?.hintsUsed ?? 0}</div>
              </div>
              <div className="border border-terminal-primary rounded p-2">
                <div className="text-terminal-secondary mb-1">Attempts</div>
                <div className="text-terminal-primary font-mono">{currentLevelStats?.attempts ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Progress */}
      <div className="border-t-2 border-terminal-primary pt-6 mt-6">
        <h3 className="text-lg font-pixel text-terminal-primary mb-4">
          HERO PROGRESSION
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 border border-terminal-primary rounded bg-black">
            <div className="text-xs text-terminal-secondary mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Score
            </div>
            <div className="text-terminal-primary font-mono text-lg">{gameState.totalScore}</div>
          </div>
          <div className="p-3 border border-terminal-primary rounded bg-black">
            <div className="text-xs text-terminal-secondary mb-1 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Best Streak
            </div>
            <div className="text-terminal-primary font-mono text-lg">x{gameState.bestCommandStreak}</div>
          </div>
          <div className="p-3 border border-terminal-primary rounded bg-black">
            <div className="text-xs text-terminal-secondary mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" />
              Success Rate
            </div>
            <div className="text-terminal-primary font-mono text-lg">
              {gameState.totalCommandsExecuted > 0
                ? `${Math.round((gameState.successfulCommandsExecuted / gameState.totalCommandsExecuted) * 100)}%`
                : '100%'}
            </div>
          </div>
          <div className="p-3 border border-terminal-primary rounded bg-black">
            <div className="text-xs text-terminal-secondary mb-1 flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Achievements
            </div>
            <div className="text-terminal-primary font-mono text-lg">
              {unlockedAchievements.length}/{gameState.achievements.length}
            </div>
          </div>
        </div>

        <div className="border border-terminal-primary rounded p-3 bg-black">
          <h4 className="text-sm text-terminal-secondary mb-2">RECENT ACHIEVEMENTS</h4>
          {unlockedAchievements.length === 0 ? (
            <div className="text-xs text-terminal-secondary">No badges yet. Keep running missions.</div>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto terminal-scrollbar pr-1">
              {unlockedAchievements.slice(-4).reverse().map((achievement) => (
                <div key={achievement.id} className="flex items-center justify-between text-xs border border-terminal-secondary rounded p-2">
                  <span className="text-terminal-text">
                    {achievement.icon} {achievement.title}
                  </span>
                  <span className="text-terminal-secondary">+75</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TimelinePanel; 
