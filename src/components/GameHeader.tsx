import { useGame } from '../contexts/GameContext';
import { Flame, Trophy } from 'lucide-react';
import { getRankProgress } from '../utils/progression';

function GameHeader() {
  const { gameState } = useGame();
  const currentLevel = gameState.levels.find(level => level.id === gameState.currentLevel);
  const completedCount = gameState.levels.filter((level) => level.completed).length;
  const achievementCount = gameState.achievements.filter((achievement) => achievement.unlocked).length;
  const rankProgress = getRankProgress(gameState.totalScore);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black border-b-2 border-terminal-primary">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Game Title */}
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-pixel text-terminal-primary neon-glow">
            GIT QUEST
          </h1>
          <span className="text-terminal-secondary">Save the Timeline</span>
        </div>

        {/* Current Level Info */}
        {currentLevel && (
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm text-terminal-secondary">
                Level {currentLevel.id}/5
              </div>
              <div className="text-lg text-terminal-primary font-mono">
                {currentLevel.title}
              </div>
              <div className="text-xs text-terminal-secondary mt-1">
                {rankProgress.currentRank.name}
                {rankProgress.nextRank
                  ? ` • ${Math.max(0, rankProgress.nextFloor - gameState.totalScore)} pts to ${rankProgress.nextRank.name}`
                  : ' • Max Rank'}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-44">
              <div className="w-full h-2 bg-gray-800 border border-terminal-primary rounded">
                <div 
                  className="h-full bg-terminal-primary rounded transition-all duration-500"
                  style={{ 
                    width: `${(completedCount / gameState.levels.length) * 100}%` 
                  }}
                />
              </div>
              <div className="text-[10px] text-terminal-secondary mt-1 font-mono">
                Mission {completedCount}/{gameState.levels.length} • Rank {Math.round(rankProgress.progressPercent)}%
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <div className="flex items-center space-x-1 text-terminal-warning">
                <Flame className="w-3 h-3" />
                <span>x{gameState.commandStreak}</span>
              </div>
              <div className="flex items-center space-x-1 text-terminal-secondary">
                <Trophy className="w-3 h-3" />
                <span>{achievementCount}</span>
              </div>
              <div className="text-terminal-primary">
                {gameState.totalScore} XP
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default GameHeader; 
