import { GitRepository } from '../types/game';
import { parseCommand } from './gitSimulator/commandParser';
import { runParsedCommand } from './gitSimulator/commandRegistry';
import { getCommandFeedback } from './gitSimulator/feedbackEngine';
import { CommandResult } from './gitSimulator/types';
import { getVisualChanges } from './gitSimulator/visualChangeTracker';

export class GitSimulator {
  executeCommand(command: string, args: string[], repo: GitRepository): CommandResult {
    const parsedCommand = parseCommand(command, args);
    const result = runParsedCommand(parsedCommand, repo);
    const feedback = getCommandFeedback(parsedCommand, result, repo);
    const nextRepo = result.newRepo ?? repo;
    const visualChanges = getVisualChanges(parsedCommand, result.success, repo, nextRepo);

    return {
      ...result,
      ...(feedback ? { feedback } : {}),
      visualChanges,
    };
  }
}

export type { CommandResult };
