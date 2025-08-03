import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameProvider } from '../../contexts/GameContext';
import { TerminalProvider } from '../../contexts/TerminalContext';
import TerminalPanel from '../TerminalPanel';

// Mock the contexts
vi.mock('../../contexts/GameContext', () => ({
  useGame: () => ({
    currentLevel: {
      id: 1,
      title: 'Test Level',
      hints: {
        'git init': 'Initialize a repository',
      },
    },
  }),
}));

vi.mock('../../contexts/TerminalContext', () => ({
  useTerminal: () => ({
    terminalState: {
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
      isProcessing: false,
    },
    executeCommand: vi.fn(),
  }),
}));

describe('TerminalPanel', () => {
  it('renders terminal interface', () => {
    render(
      <GameProvider>
        <TerminalProvider>
          <TerminalPanel />
        </TerminalProvider>
      </GameProvider>
    );

    expect(screen.getByText('timeline-project:~$')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Git command...')).toBeInTheDocument();
    expect(screen.getByText('Execute')).toBeInTheDocument();
  });

  it('shows welcome message when no history', () => {
    render(
      <GameProvider>
        <TerminalProvider>
          <TerminalPanel />
        </TerminalProvider>
      </GameProvider>
    );

    expect(screen.getByText('Welcome to Git Quest Terminal Simulator!')).toBeInTheDocument();
    expect(screen.getByText(/Start with basic commands/)).toBeInTheDocument();
  });

  it('handles command input and submission', async () => {
    const mockExecuteCommand = vi.fn();
    vi.mocked(require('../../contexts/TerminalContext').useTerminal).mockReturnValue({
      terminalState: {
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
        isProcessing: false,
      },
      executeCommand: mockExecuteCommand,
    });

    render(
      <GameProvider>
        <TerminalProvider>
          <TerminalPanel />
        </TerminalProvider>
      </GameProvider>
    );

    const input = screen.getByPlaceholderText('Enter Git command...');
    const submitButton = screen.getByText('Execute');

    fireEvent.change(input, { target: { value: 'git init' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockExecuteCommand).toHaveBeenCalledWith('git init');
    });
  });

  it('disables input when processing', () => {
    vi.mocked(require('../../contexts/TerminalContext').useTerminal).mockReturnValue({
      terminalState: {
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
        isProcessing: true,
      },
      executeCommand: vi.fn(),
    });

    render(
      <GameProvider>
        <TerminalProvider>
          <TerminalPanel />
        </TerminalProvider>
      </GameProvider>
    );

    const input = screen.getByPlaceholderText('Enter Git command...');
    expect(input).toBeDisabled();
  });
}); 