import { GitRepository } from '../../types/game';
import { isRegisteredGitCommand } from './commandParser';
import { commandNotFound, unknownGitCommand } from './outputFormatter';
import { reduceGitCommand } from './repositoryReducer';
import { runShellCommand } from './shellCommandRegistry';
import { CommandResult, ParsedCommand } from './types';

export const runParsedCommand = (parsedCommand: ParsedCommand, repo: GitRepository): CommandResult => {
  if (parsedCommand.type === 'git') {
    const result = reduceGitCommand(parsedCommand.command, parsedCommand.args, repo);
    if (result) {
      return result;
    }

    return {
      output: unknownGitCommand(parsedCommand.command),
      success: false,
    };
  }

  if (parsedCommand.type === 'shell') {
    const result = runShellCommand(parsedCommand.command, parsedCommand.args, repo);
    if (result) {
      return result;
    }
  }

  if (isRegisteredGitCommand(parsedCommand.command)) {
    return {
      output: unknownGitCommand(parsedCommand.command),
      success: false,
    };
  }

  return {
    output: commandNotFound(parsedCommand.command),
    success: false,
  };
};
