import React from 'react';
import { useGame } from '../contexts/GameContext';
import { Clock, GitBranch, Shield, RotateCcw, Zap, CheckCircle, Lock } from 'lucide-react';
import { Level } from '../types/game';

const levelIcons: Record<number, React.ComponentType<any>> = {
  1: Clock,
  2: Shield,
  3: GitBranch,
  4: RotateCcw,
  5: Zap,
};

function TimelinePanel() {
  const { gameState, startLevel } = useGame();
  const currentLevel = gameState.levels.find(level => level.id === gameState.currentLevel);

  const handleLevelClick = (level: Level) => {
    if (level.unlocked && !level.completed) {
      startLevel(level.id);
    }
  };

  return (
    <div className="h-full p-6 overflow-y-auto terminal-scrollbar">
      {/* Timeline Map */}
      <div className="mb-8">
        <h2 className="text-xl font-pixel text-terminal-primary mb-6 neon-glow">
          TIMELINE MAP
        </h2>
        
        <div className="space-y-4">
          {gameState.levels.map((level, index) => {
            const Icon = levelIcons[level.id];
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
            <h4 className="text-sm text-terminal-secondary mb-2">OBJECTIVES</h4>
            <ul className="space-y-2">
              {currentLevel.objectives.map((objective, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm">
                  <span className="text-terminal-primary mt-1">▸</span>
                  <span className="text-terminal-text">{objective}</span>
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
        </div>
      )}
    </div>
  );
}

export default TimelinePanel; 