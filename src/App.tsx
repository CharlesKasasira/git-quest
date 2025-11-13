import React from 'react';
import { GameProvider } from './contexts/GameContext';
import { TerminalProvider } from './contexts/TerminalContext';
import { MultiplayerProvider } from './contexts/MultiplayerContext';
import GameLayout from './components/GameLayout';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <TerminalProvider>
          <MultiplayerProvider>
            <div className="App">
              <div className="scan-line"></div>
              <GameLayout />
            </div>
          </MultiplayerProvider>
        </TerminalProvider>
      </GameProvider>
    </ErrorBoundary>
  );
}

export default App; 