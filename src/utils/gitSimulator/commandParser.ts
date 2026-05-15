import { ParsedCommand } from './types';

export const GIT_COMMANDS = [
  'init',
  'config',
  'status',
  'add',
  'commit',
  'log',
  'branch',
  'checkout',
  'merge',
  'revert',
  'reset',
  'tag',
  'push',
  'pull',
  'fetch',
  'clone',
  'remote',
  'stash',
  'rebase',
  'cherry-pick',
  'blame',
  'diff',
  'show',
  'help',
  'version',
  '--help',
  '--version',
  'switch',
  'restore',
  'clean',
  'mv',
  'rm',
  'bisect',
  'reflog',
  'worktree',
  'submodule',
  'notes',
  'replace',
  'gc',
  'fsck',
  'prune',
] as const;

export const SHELL_COMMANDS = ['ls', 'dir', 'pwd', 'clear', 'help', 'echo', 'touch', 'edit'] as const;

const gitCommandSet = new Set<string>(GIT_COMMANDS);
const shellCommandSet = new Set<string>(SHELL_COMMANDS);

export const parseCommand = (commandInput: string, args: string[]): ParsedCommand => {
  const command = commandInput.toLowerCase();

  if (command === 'git') {
    return {
      type: 'git',
      command: args[0]?.toLowerCase() ?? '',
      args: args.slice(1),
    };
  }

  if (command.startsWith('git')) {
    const gitCommand = command.replace('git', '').trim();
    if (gitCommand) {
      return {
        type: 'git',
        command: gitCommand,
        args,
      };
    }
  }

  if (gitCommandSet.has(command)) {
    return {
      type: 'git',
      command,
      args,
    };
  }

  if (shellCommandSet.has(command)) {
    return {
      type: 'shell',
      command,
      args,
    };
  }

  return {
    type: 'unknown',
    command: commandInput,
    args,
  };
};

export const isRegisteredGitCommand = (command: string): boolean => gitCommandSet.has(command);
