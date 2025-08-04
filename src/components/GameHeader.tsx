import { useGame } from '../contexts/GameContext';

function GameHeader() {
  const { gameState } = useGame();
  const currentLevel = gameState.levels.find(level => level.id === gameState.currentLevel);

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
            </div>
            
            {/* Progress Bar */}
            <div className="w-32 h-2 bg-gray-800 border border-terminal-primary rounded">
              <div 
                className="h-full bg-terminal-primary rounded transition-all duration-500"
                style={{ 
                  width: `${(gameState.levels.filter(l => l.completed).length / gameState.levels.length) * 100}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default GameHeader; 