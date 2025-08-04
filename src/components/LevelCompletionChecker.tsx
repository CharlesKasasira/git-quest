import { useEffect, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { useTerminal } from '../contexts/TerminalContext';
import { LevelManager } from '../utils/levelManager';
import { CheckCircle, Star, ArrowRight } from 'lucide-react';
import { Level } from '../types/game';

function LevelCompletionChecker() {
  const { gameState, completeLevel, startLevel } = useGame();
  const { terminalState, resetTerminal } = useTerminal();
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedLevel, setCompletedLevel] = useState<Level | null>(null);
  const [lastLevelId, setLastLevelId] = useState<number | null>(null);
  const levelManager = new LevelManager();

  // Initialize terminal when level changes
  useEffect(() => {
    const currentLevel = gameState.levels.find(level => level.id === gameState.currentLevel);
    
    if (currentLevel && currentLevel.id !== lastLevelId) {
      // Reset terminal with the level's initial repository state
      resetTerminal(currentLevel.initialRepo);
      setLastLevelId(currentLevel.id);
    }
  }, [gameState.currentLevel, lastLevelId, resetTerminal]);

  // Check for level completion
  useEffect(() => {
    const currentLevel = gameState.levels.find(level => level.id === gameState.currentLevel);
    
    if (currentLevel && !currentLevel.completed) {
      const isCompleted = levelManager.checkLevelCompletion(
        currentLevel,
        terminalState.currentRepo,
        terminalState.history
      );

      if (isCompleted) {
        setCompletedLevel(currentLevel);
        setShowCompletion(true);
        completeLevel(currentLevel.id);
      }
    }
  }, [terminalState.history, terminalState.currentRepo, gameState.currentLevel, completeLevel]);

  const handleContinue = () => {
    setShowCompletion(false);
    
    // Move to next level if available
    const nextLevel = gameState.levels.find(level => level.id === gameState.currentLevel + 1);
    if (nextLevel && nextLevel.unlocked) {
      setTimeout(() => {
        startLevel(nextLevel.id);
      }, 500);
    }
  };

  const handleReplay = () => {
    setShowCompletion(false);
    // Reset terminal for current level
    if (completedLevel) {
      resetTerminal(completedLevel.initialRepo);
    }
  };

  if (!showCompletion || !completedLevel) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-terminal-bg border-2 border-terminal-primary rounded-lg p-8 max-w-md w-full mx-4 relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-terminal-primary via-terminal-secondary to-terminal-primary opacity-10 animate-pulse"></div>
        
        <div className="relative z-10">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-terminal-primary rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12 text-black" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-pixel text-terminal-primary text-center mb-2 neon-glow">
            LEVEL COMPLETE!
          </h2>
          
          <h3 className="text-lg text-terminal-secondary text-center mb-6">
            {completedLevel.title}
          </h3>

          {/* Success Message */}
          <div className="bg-black border border-terminal-primary rounded p-4 mb-6">
            <p className="text-sm text-terminal-text text-center leading-relaxed">
              🎉 Excellent work, Timekeeper! You've successfully restored this part of the timeline. 
              Reality is becoming more stable with each Git command you master.
            </p>
          </div>

          {/* Score */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Star className="w-5 h-5 text-terminal-warning" />
            <span className="text-terminal-warning font-mono">
              +100 Timeline Points
            </span>
            <Star className="w-5 h-5 text-terminal-warning" />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleReplay}
              className="flex-1 px-4 py-2 border border-terminal-secondary text-terminal-secondary rounded hover:bg-terminal-secondary hover:text-black transition-all"
            >
              Replay Level
            </button>
            
            <button
              onClick={handleContinue}
              className="flex-1 px-4 py-2 bg-terminal-primary text-black rounded hover:bg-terminal-secondary transition-all flex items-center justify-center space-x-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Next Level Preview */}
          {gameState.currentLevel < 5 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-terminal-secondary">
                Next: Level {gameState.currentLevel + 1} - {gameState.levels[gameState.currentLevel]?.title}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LevelCompletionChecker; 