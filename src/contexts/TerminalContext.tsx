import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TerminalState, TerminalCommand, GitRepository } from '../types/game';
import { createDefaultEnvironment, createDefaultFileSystem, createPrompt, runBashScript } from '../utils/bashTerminal';
import { GitSimulator } from '../utils/gitSimulator';
import { useGame } from './GameContext';

interface TerminalContextType {
  terminalState: TerminalState;
  executeCommand: (command: string) => Promise<void>;
  resetTerminal: (repo: GitRepository) => void;
  clearHistory: () => void;
}

type TerminalAction =
  | { type: 'ADD_COMMAND'; payload: TerminalCommand }
  | { type: 'SET_REPO'; payload: GitRepository }
  | { type: 'APPLY_EXECUTION'; payload: Omit<TerminalState, 'history' | 'isProcessing'> }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'RESET'; payload: GitRepository };

const initialEnvironment = createDefaultEnvironment();

const initialTerminalState: TerminalState = {
  history: [],
  currentRepo: {
    initialized: false,
    files: [],
    branches: [],
    currentBranch: '',
    commits: [],
    config: {},
    workingDirectory: '/timeline-project',
  },
  currentDirectory: initialEnvironment.HOME ?? '/timeline-project',
  environment: initialEnvironment,
  aliases: {
    gs: 'git status',
    gl: 'git log',
  },
  fileSystem: createDefaultFileSystem(),
  lastExitCode: 0,
  isProcessing: false,
};

function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case 'ADD_COMMAND':
      return {
        ...state,
        history: [...state.history, action.payload],
      };

    case 'SET_REPO':
      return {
        ...state,
        currentRepo: action.payload,
      };

    case 'APPLY_EXECUTION':
      return {
        ...state,
        ...action.payload,
      };

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload,
      };

    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: [],
      };

    case 'RESET':
      return {
        ...initialTerminalState,
        currentRepo: action.payload,
        currentDirectory: action.payload.workingDirectory,
        environment: {
          ...initialEnvironment,
          HOME: action.payload.workingDirectory,
          PWD: action.payload.workingDirectory,
        },
        fileSystem: createDefaultFileSystem().map((entry) =>
          entry.path.startsWith('/timeline-project')
            ? {
                ...entry,
                path: entry.path.replace('/timeline-project', action.payload.workingDirectory),
              }
            : entry
        ),
      };

    default:
      return state;
  }
}

const TerminalContext = createContext<TerminalContextType | null>(null);

interface TerminalProviderProps {
  children: ReactNode;
}

export function TerminalProvider({ children }: TerminalProviderProps) {
  const [terminalState, dispatch] = useReducer(terminalReducer, initialTerminalState);
  const gitSimulator = new GitSimulator();
  const { currentLevel, recordCommandResult } = useGame();

  const executeCommand = async (commandInput: string): Promise<void> => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    const startedAt = performance.now();

    try {
      const [, ...args] = commandInput.trim().split(/\s+/);
      const prompt = createPrompt(terminalState);
      
      // Create command entry
      const terminalCommand: TerminalCommand = {
        command: commandInput,
        args,
        output: '',
        success: false,
        cwd: terminalState.currentDirectory,
        prompt,
        timestamp: new Date(),
      };

      await new Promise(resolve => setTimeout(resolve, 80));

      const result = runBashScript(commandInput, terminalState, gitSimulator);

      // Update the command with results
      const updatedCommand: TerminalCommand = {
        ...terminalCommand,
        output: result.output,
        ...(result.feedback ? { feedback: result.feedback } : {}),
        ...(result.visualChanges ? { visualChanges: result.visualChanges } : {}),
        success: result.success,
        exitCode: result.exitCode,
        durationMs: Math.round(performance.now() - startedAt),
      };

      if (result.clearHistory) {
        dispatch({ type: 'CLEAR_HISTORY' });
      }

      if (!result.clearHistory) {
        dispatch({
          type: 'ADD_COMMAND',
          payload: updatedCommand,
        });
      }

      recordCommandResult(currentLevel?.id ?? 1, result.success, commandInput);

      dispatch({
        type: 'APPLY_EXECUTION',
        payload: {
          currentRepo: result.newRepo,
          currentDirectory: result.currentDirectory,
          environment: result.environment,
          aliases: result.aliases,
          fileSystem: result.fileSystem,
          lastExitCode: result.exitCode,
        },
      });

    } catch (error) {
      console.error('Command execution error:', error);
      
      const errorCommand: TerminalCommand = {
        command: commandInput,
        args: [],
        output: 'Error: Command execution failed',
        success: false,
        exitCode: 1,
        cwd: terminalState.currentDirectory,
        prompt: createPrompt(terminalState),
        durationMs: Math.round(performance.now() - startedAt),
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_COMMAND', payload: errorCommand });
      recordCommandResult(currentLevel?.id ?? 1, false, commandInput);
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const resetTerminal = (repo: GitRepository) => {
    dispatch({ type: 'RESET', payload: repo });
  };

  const clearHistory = () => {
    dispatch({ type: 'CLEAR_HISTORY' });
  };

  return (
    <TerminalContext.Provider
      value={{
        terminalState,
        executeCommand,
        resetTerminal,
        clearHistory,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
} 
