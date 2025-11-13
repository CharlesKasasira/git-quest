import { memo, useEffect, useRef, useState } from 'react';
import TimelinePanel from './TimelinePanel';
import TerminalPanel from './TerminalPanel';
import GameHeader from './GameHeader';
import LevelCompletionChecker from './LevelCompletionChecker';
import VisualPanel from './visual/VisualPanel';
import MultiplayerPanel from './multiplayer/MultiplayerPanel';
import { useGame } from '../contexts/GameContext';
import { useMultiplayer } from '../contexts/MultiplayerContext';
import { Eye, Terminal, X, Users, Wifi, WifiOff } from 'lucide-react';

const GameLayout = memo(function GameLayout() {
  const { gameState } = useGame();
  const { multiplayerState, updateUserPresence } = useMultiplayer();
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const [showVisualPanel, setShowVisualPanel] = useState(false);
  const [showMultiplayerPanel, setShowMultiplayerPanel] = useState(false);

  // Keyboard navigation to focus terminal
  useEffect(() => {
    const handleKeyDown = () => {
      // Focus terminal on any key press (except when already focused on input elements)
      const activeElement = document.activeElement;
      const isInputElement = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           (activeElement as HTMLElement)?.contentEditable === 'true';
      
      if (!isInputElement && terminalInputRef.current) {
        terminalInputRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text">
      <GameHeader />
      
      <div className="flex h-screen pt-16">
        {/* Left Panel - Timeline Map */}
        <div className="w-1/3 border-r-2 border-terminal-primary">
          <TimelinePanel />
        </div>
        
        {/* Right Panel - Terminal */}
        <div className="w-2/3">
          <TerminalPanel ref={terminalInputRef} />
        </div>
      </div>
      
      {/* Control Buttons */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {/* Visual Learning Panel Toggle */}
        <button
          onClick={() => setShowVisualPanel(!showVisualPanel)}
          className="flex items-center space-x-2 px-4 py-2 bg-terminal-primary text-black rounded border border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-80 transition-all"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm font-mono">
            {showVisualPanel ? 'Hide Visual' : 'Show Visual'}
          </span>
        </button>
        
        {/* Multiplayer Panel Toggle */}
        <button
          onClick={() => setShowMultiplayerPanel(!showMultiplayerPanel)}
          className="flex items-center space-x-2 px-4 py-2 bg-terminal-secondary text-black rounded border border-terminal-secondary hover:bg-terminal-secondary hover:bg-opacity-80 transition-all"
        >
          {multiplayerState.isConnected ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span className="text-sm font-mono">
            {showMultiplayerPanel ? 'Hide Multiplayer' : 'Show Multiplayer'}
          </span>
        </button>
      </div>
      
      {/* Floating Elements */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-black border border-terminal-primary rounded px-3 py-1">
          <span className="text-terminal-secondary text-sm">
            Score: {gameState.totalScore}
          </span>
        </div>
      </div>

      {/* Visual Learning Panel */}
      {showVisualPanel && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="w-full max-w-7xl h-full max-h-[90vh] bg-terminal-bg border-2 border-terminal-primary rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b-2 border-terminal-primary bg-terminal-bg">
              <h2 className="text-xl font-pixel text-terminal-primary">Visual Learning Center</h2>
              <button
                onClick={() => setShowVisualPanel(false)}
                className="p-2 text-terminal-secondary hover:text-terminal-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <VisualPanel className="h-full" />
          </div>
        </div>
      )}

      {/* Multiplayer Panel */}
      {showMultiplayerPanel && (
        <MultiplayerPanel
          isOpen={showMultiplayerPanel}
          onClose={() => setShowMultiplayerPanel(false)}
        />
      )}

      {/* Level Completion Checker */}
      <LevelCompletionChecker />
    </div>
  );
});

export default GameLayout; 