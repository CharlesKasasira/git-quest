import { GitRepository, GitVisualChange } from '../../types/game';

export interface CommandResult {
  output: string;
  feedback?: string;
  visualChanges?: GitVisualChange[];
  success: boolean;
  newRepo?: GitRepository;
}

export type ParsedCommand =
  | { type: 'git'; command: string; args: string[] }
  | { type: 'shell'; command: string; args: string[] }
  | { type: 'unknown'; command: string; args: string[] };

export type CommandHandler = (args: string[], repo: GitRepository) => CommandResult;
