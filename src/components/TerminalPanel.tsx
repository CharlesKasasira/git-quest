import React, { useState, useRef, useEffect, useCallback, useMemo, memo, forwardRef } from 'react';
import { useTerminal } from '../contexts/TerminalContext';
import { useGame } from '../contexts/GameContext';
import { Terminal, HelpCircle, Lightbulb } from 'lucide-react';

interface TerminalPanelProps {}

const TerminalPanel = forwardRef<HTMLInputElement, TerminalPanelProps>(
  function TerminalPanel(_, ref) {
    const [currentCommand, setCurrentCommand] = useState<string>('');
    const [showHint, setShowHint] = useState<boolean>(false);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const { terminalState, executeCommand } = useTerminal();
    const { currentLevel } = useGame();
    const inputRef = useRef<HTMLInputElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);

    // Use forwarded ref or fallback to internal ref
    const effectiveRef = ref || inputRef;

    // Auto-scroll to bottom when new commands are added
    useEffect(() => {
      if (historyRef.current) {
        historyRef.current.scrollTop = historyRef.current.scrollHeight;
      }
    }, [terminalState.history]);

    // Focus input on mount and when ref changes
    useEffect(() => {
      if (effectiveRef && 'current' in effectiveRef && effectiveRef.current) {
        effectiveRef.current.focus();
      }
    }, [effectiveRef]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
      e.preventDefault();
      if (currentCommand.trim() && !terminalState.isProcessing) {
        // Add to command history
        setCommandHistory(prev => [...prev, currentCommand.trim()]);
        setHistoryIndex(-1);
        
        await executeCommand(currentCommand.trim());
        setCurrentCommand('');
        setShowHint(false);
      }
    }, [currentCommand, terminalState.isProcessing, executeCommand]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentCommand(e.target.value);
      setShowHint(false);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          const command = commandHistory[newIndex];
          if (command) {
            setCurrentCommand(command);
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex !== -1) {
          const newIndex = historyIndex + 1;
          if (newIndex >= commandHistory.length) {
            setHistoryIndex(-1);
            setCurrentCommand('');
          } else {
            setHistoryIndex(newIndex);
            const command = commandHistory[newIndex];
            if (command) {
              setCurrentCommand(command);
            }
          }
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Simple tab completion for common Git commands
        const commonCommands = ['git', 'init', 'add', 'commit', 'status', 'log', 'branch', 'checkout', 'merge'];
        const current = currentCommand.toLowerCase();
        
        for (const cmd of commonCommands) {
          if (cmd.startsWith(current) && cmd !== current) {
            setCurrentCommand(cmd);
            break;
          }
        }
      }
    }, [commandHistory, historyIndex, currentCommand]);

    const getCurrentHint = useMemo(() => {
      if (!currentLevel || !currentCommand.trim()) return null;
      
      const command = currentCommand.trim().split(' ')[0];
      if (!command) return null;
      
      return currentLevel.hints[command] || null;
    }, [currentLevel, currentCommand]);

    const toggleHint = useCallback(() => {
      setShowHint(!showHint);
    }, [showHint]);

    const formatTimestamp = useCallback((date: Date): string => {
      return date.toLocaleTimeString();
    }, []);

    return (
      <div className="h-full flex flex-col bg-black">
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-terminal-primary bg-terminal-bg">
          <div className="flex items-center space-x-3">
            <Terminal className="w-6 h-6 text-terminal-primary" />
            <span className="font-mono text-terminal-primary">
              timeline-project:~$ 
            </span>
            <span className="text-terminal-secondary text-sm">
              {terminalState.currentRepo.initialized ? 'Git Repository' : 'No Repository'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {getCurrentHint && (
              <button
                onClick={toggleHint}
                className="flex items-center space-x-1 px-3 py-1 bg-terminal-warning bg-opacity-20 border border-terminal-warning rounded text-terminal-warning hover:bg-opacity-30 transition-all"
              >
                <Lightbulb className="w-4 h-4" />
                <span className="text-xs">Hint Available</span>
              </button>
            )}
            
            <button
              onClick={() => setShowHint(!showHint)}
              className="p-2 text-terminal-secondary hover:text-terminal-primary transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hint Panel */}
        {showHint && getCurrentHint && (
          <div className="p-4 bg-terminal-warning bg-opacity-10 border-b border-terminal-warning">
            <div className="flex items-start space-x-2">
              <Lightbulb className="w-5 h-5 text-terminal-warning mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-terminal-warning mb-1">Hint:</div>
                <div className="text-sm text-terminal-text">{getCurrentHint}</div>
              </div>
            </div>
          </div>
        )}

        {/* Terminal History */}
        <div 
          ref={historyRef}
          className="flex-1 p-4 overflow-y-auto terminal-scrollbar font-mono text-sm"
        >
          {terminalState.history.length === 0 && (
            <div className="text-terminal-secondary mb-4">
              <div className="mb-2">Welcome to Git Quest Terminal Simulator!</div>
              <div className="mb-2">Type Git commands to progress through the timeline.</div>
              <div className="text-terminal-warning">💡 Start with basic commands like 'git --help' or follow the mission objectives.</div>
              <div className="text-terminal-secondary mt-2 text-xs">
                💡 Tip: Press any key to focus the terminal. Use ↑/↓ arrows to navigate command history.
              </div>
            </div>
          )}

          {terminalState.history.map((cmd, index) => (
            <div key={index} className="mb-4">
              {/* Command Input */}
              <div className="flex items-center space-x-2">
                <span className="text-terminal-primary">$</span>
                <span className="text-terminal-text">{cmd.command}</span>
                <span className="text-xs text-terminal-secondary ml-auto">
                  {formatTimestamp(cmd.timestamp)}
                </span>
              </div>
              
              {/* Command Output */}
              {cmd.output && (
                <div 
                  className={`mt-1 ml-4 whitespace-pre-wrap ${
                    cmd.success ? 'text-terminal-text' : 'text-terminal-error'
                  }`}
                >
                  {cmd.output}
                </div>
              )}
            </div>
          ))}

          {/* Processing Indicator */}
          {terminalState.isProcessing && (
            <div className="flex items-center space-x-2 text-terminal-secondary">
              <div className="w-2 h-2 bg-terminal-primary rounded-full animate-pulse"></div>
              <span>Processing command...</span>
            </div>
          )}
        </div>

        {/* Command Input */}
        <div className="p-4 border-t-2 border-terminal-primary bg-terminal-bg">
          <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            <span className="text-terminal-primary font-mono">$</span>
            <input
              ref={effectiveRef}
              type="text"
              value={currentCommand}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter Git command..."
              disabled={terminalState.isProcessing}
              className={`
                flex-1 bg-transparent text-terminal-text font-mono outline-none
                placeholder-terminal-secondary
                ${terminalState.isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
            <button
              type="submit"
              disabled={!currentCommand.trim() || terminalState.isProcessing}
              className={`
                px-4 py-2 rounded border transition-all
                ${currentCommand.trim() && !terminalState.isProcessing
                  ? 'border-terminal-primary text-terminal-primary hover:bg-terminal-primary hover:text-black'
                  : 'border-gray-600 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              Execute
            </button>
          </form>
          
          <div className="mt-2 text-xs text-terminal-secondary">
            Press Enter to execute commands • Type "git --help" for available commands • Use ↑/↓ for history
          </div>
        </div>
      </div>
    );
  }
);

export default TerminalPanel; 