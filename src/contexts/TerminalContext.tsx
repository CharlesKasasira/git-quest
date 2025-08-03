import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TerminalState, TerminalCommand, GitRepository } from '../types/game';
import { GitSimulator } from '../utils/gitSimulator';
import { LevelManager } from '../utils/levelManager';
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
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'RESET'; payload: GitRepository };

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
  currentDirectory: '/timeline-project',
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
  const levelManager = new LevelManager();

  const executeCommand = async (commandInput: string): Promise<void> => {
    dispatch({ type: 'SET_PROCESSING', payload: true });

    try {
      // Parse the command
      const [command, ...args] = commandInput.trim().split(/\s+/);
      
      // Create command entry
      const terminalCommand: TerminalCommand = {
        command: commandInput,
        args,
        output: '',
        success: false,
        timestamp: new Date(),
      };

      // Add the command to history immediately
      dispatch({ type: 'ADD_COMMAND', payload: terminalCommand });

      // Simulate command execution delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Execute the command using GitSimulator
      const result = gitSimulator.executeCommand(command, args, terminalState.currentRepo);

      // Update the command with results
      const updatedCommand: TerminalCommand = {
        ...terminalCommand,
        output: result.output,
        success: result.success,
      };

      // Update history with the result
      dispatch({
        type: 'ADD_COMMAND',
        payload: updatedCommand,
      });

      // Update repository state if command was successful
      if (result.success && result.newRepo) {
        dispatch({ type: 'SET_REPO', payload: result.newRepo });
      }

    } catch (error) {
      console.error('Command execution error:', error);
      
      const errorCommand: TerminalCommand = {
        command: commandInput,
        args: [],
        output: 'Error: Command execution failed',
        success: false,
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_COMMAND', payload: errorCommand });
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