import React, { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import { useTerminal } from '../contexts/TerminalContext';
import { useGame } from '../contexts/GameContext';
import { createPrompt, formatDirectoryForPrompt, getTerminalCompletions } from '../utils/bashTerminal';
import { Terminal, HelpCircle, Lightbulb } from 'lucide-react';

interface TerminalPanelProps {}

const TerminalPanel = forwardRef<HTMLInputElement, TerminalPanelProps>(
  function TerminalPanel(_, ref) {
    const [currentCommand, setCurrentCommand] = useState<string>('');
    const [showHint, setShowHint] = useState<boolean>(false);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [completionOptions, setCompletionOptions] = useState<string[]>([]);
    const { terminalState, executeCommand, clearHistory } = useTerminal();
    const { gameState, currentLevel, recordHintUsed } = useGame();
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
        setCompletionOptions([]);
      }
    }, [currentCommand, terminalState.isProcessing, executeCommand]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentCommand(e.target.value);
      setShowHint(false);
      setCompletionOptions([]);
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
        const completions = getTerminalCompletions(currentCommand, terminalState);
        if (completions.length === 1) {
          const tokens = currentCommand.split(/\s+/);
          tokens[tokens.length - 1] = completions[0] ?? '';
          setCurrentCommand(tokens.join(' '));
          setCompletionOptions([]);
        } else if (completions.length > 1) {
          setCompletionOptions(completions.slice(0, 12));
        }
      } else if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
        e.preventDefault();
        clearHistory();
      } else if (e.key.toLowerCase() === 'c' && e.ctrlKey) {
        e.preventDefault();
        setCurrentCommand('');
        setCompletionOptions([]);
      }
    }, [commandHistory, historyIndex, currentCommand, terminalState, clearHistory]);

    const getCurrentHint = useMemo(() => {
      if (!currentLevel || !currentCommand.trim()) return null;
      
      const [firstToken = '', secondToken = ''] = currentCommand.trim().toLowerCase().split(/\s+/);
      if (!firstToken) return null;

      if (firstToken === 'git' && secondToken) {
        return currentLevel.hints[`git ${secondToken}`] || currentLevel.hints['git'] || null;
      }

      return currentLevel.hints[firstToken] || null;
    }, [currentLevel, currentCommand]);

    const toggleHint = useCallback(() => {
      const shouldOpen = !showHint;
      setShowHint(shouldOpen);
      if (shouldOpen && getCurrentHint && currentLevel) {
        recordHintUsed(currentLevel.id);
      }
    }, [showHint, getCurrentHint, currentLevel, recordHintUsed]);

    const formatTimestamp = useCallback((date: Date): string => {
      return date.toLocaleTimeString();
    }, []);

    const commandAccuracy = useMemo(() => {
      if (gameState.totalCommandsExecuted === 0) {
        return 100;
      }
      return Math.round((gameState.successfulCommandsExecuted / gameState.totalCommandsExecuted) * 100);
    }, [gameState.totalCommandsExecuted, gameState.successfulCommandsExecuted]);

    const prompt = useMemo(() => createPrompt(terminalState), [terminalState]);
    const displayDirectory = useMemo(() => formatDirectoryForPrompt(terminalState), [terminalState]);

    return (
      <div className="h-full flex flex-col bg-black">
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-terminal-primary bg-terminal-bg">
          <div className="flex items-center space-x-3">
            <Terminal className="w-6 h-6 text-terminal-primary" />
            <span className="font-mono text-terminal-primary">
              {prompt}
            </span>
            <span className="text-terminal-secondary text-sm">
              {terminalState.currentRepo.initialized ? 'Git Repository' : 'No Repository'}
            </span>
            <span className="text-terminal-secondary text-xs font-mono">
              bash • {displayDirectory}
            </span>
            <span className="text-terminal-warning text-xs font-mono">
              Streak x{gameState.commandStreak}
            </span>
            <span className="text-terminal-secondary text-xs font-mono">
              Accuracy {commandAccuracy}%
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
              <div className="mb-2">Welcome to Git Quest Bash.</div>
              <div className="mb-2">Use shell commands, Git commands, pipes, variables, aliases, and redirection inside the training workspace.</div>
              <div className="text-terminal-warning">Start with `git --help`, `ls -la`, `pwd`, or the mission objectives.</div>
              <div className="text-terminal-secondary mt-2 text-xs">
                Tip: ↑/↓ history • Tab completion • Ctrl+L clear • Ctrl+C cancel line • `help` for shell features.
              </div>
            </div>
          )}

          {terminalState.history.map((cmd, index) => (
            <div key={index} className="mb-4">
              {/* Command Input */}
              <div className="flex items-center space-x-2">
                <span className="text-terminal-primary">{cmd.prompt || '$'}</span>
                <span className="text-terminal-text">{cmd.command}</span>
                <span className="text-xs text-terminal-secondary ml-auto">
                  {formatTimestamp(cmd.timestamp)}
                  {typeof cmd.exitCode === 'number' && ` • exit ${cmd.exitCode}`}
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

              {cmd.feedback && (
                <div className="mt-2 ml-4 border-l-2 border-terminal-warning pl-3 text-terminal-warning whitespace-pre-wrap">
                  {cmd.feedback}
                </div>
              )}

              {cmd.visualChanges && cmd.visualChanges.length > 0 && (
                <div className="mt-2 ml-4 border-l-2 border-terminal-secondary pl-3">
                  <div className="text-terminal-secondary text-xs uppercase tracking-wide mb-1">
                    Visual sync
                  </div>
                  <div className="space-y-1">
                    {cmd.visualChanges.map((change, changeIndex) => (
                      <div key={`${cmd.command}-visual-${changeIndex}`} className="text-xs">
                        <span className="text-terminal-primary">{change.label}: </span>
                        <span className="text-terminal-text">{change.detail}</span>
                      </div>
                    ))}
                  </div>
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
            <span className="text-terminal-primary font-mono whitespace-nowrap">{prompt}</span>
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
              Run
            </button>
          </form>

          {completionOptions.length > 0 && (
            <div className="mt-2 ml-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-terminal-secondary">
              {completionOptions.map((option) => (
                <span key={option}>{option}</span>
              ))}
            </div>
          )}
          
          <div className="mt-2 text-xs text-terminal-secondary">
            {'Enter runs commands • Supports `&&`, `||`, `;`, pipes, `>`, `>>`, `$VARS`, aliases, and Git commands'}
          </div>
        </div>
      </div>
    );
  }
);

export default TerminalPanel; 
