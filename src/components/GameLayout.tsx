import React, { memo, useEffect, useRef } from 'react';
import TimelinePanel from './TimelinePanel';
import TerminalPanel from './TerminalPanel';
import GameHeader from './GameHeader';
import LevelCompletionChecker from './LevelCompletionChecker';
import { useGame } from '../contexts/GameContext';

const GameLayout = memo(function GameLayout() {
  const { gameState } = useGame();
  const terminalInputRef = useRef<HTMLInputElement>(null);

  // Keyboard navigation to focus terminal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus terminal on any key press (except when already focused on input elements)
      const activeElement = document.activeElement;
      const isInputElement = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           activeElement?.contentEditable === 'true';
      
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
      
      {/* Floating Elements */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-black border border-terminal-primary rounded px-3 py-1">
          <span className="text-terminal-secondary text-sm">
            Score: {gameState.totalScore}
          </span>
        </div>
      </div>

      {/* Level Completion Checker */}
      <LevelCompletionChecker />
    </div>
  );
});

export default GameLayout; 