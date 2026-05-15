import { GitRepository } from '../../types/game';
import { CommandResult, ParsedCommand } from './types';

const isGitCommand = (parsedCommand: ParsedCommand, command: string): boolean =>
  parsedCommand.type === 'git' && parsedCommand.command === command;

const hasStagedFiles = (repo: GitRepository): boolean => repo.files.some((file) => file.staged);

const hasTrackedOrUntrackedFiles = (repo: GitRepository): boolean => repo.files.length > 0;

const hasUnresolvedConflicts = (repo: GitRepository): boolean =>
  repo.conflicts?.some((conflict) => !conflict.resolved) || repo.files.some((file) => file.conflict);

const requiresRepository = (parsedCommand: ParsedCommand): boolean => {
  if (parsedCommand.type !== 'git') {
    return false;
  }

  return !['init', 'clone', 'help', '--help', 'version', '--version'].includes(parsedCommand.command);
};

export const getCommandFeedback = (
  parsedCommand: ParsedCommand,
  result: CommandResult,
  repo: GitRepository
): string | undefined => {
  if (result.success) {
    return undefined;
  }

  if (requiresRepository(parsedCommand) && !repo.initialized) {
    return 'Tutor: This folder is not a Git repository yet. Start with `git init`, then retry the command.';
  }

  if (isGitCommand(parsedCommand, 'commit')) {
    if (hasUnresolvedConflicts(repo)) {
      return 'Tutor: Resolve each conflicted file, then run `git add <file>` to mark it resolved before committing the merge.';
    }

    if (!hasStagedFiles(repo) && hasTrackedOrUntrackedFiles(repo)) {
      return 'Tutor: You need to stage changes before committing. Run `git add <file>` first, then retry `git commit`.';
    }

    if (!hasStagedFiles(repo)) {
      return 'Tutor: There is nothing staged for a commit yet. Create or change a file, stage it with `git add`, then commit.';
    }

    if (!repo.config.userName || !repo.config.userEmail) {
      return 'Tutor: Git needs your identity before it can create commits. Configure `user.name` and `user.email`, then retry the commit.';
    }

    if (!parsedCommand.args.includes('-m')) {
      return 'Tutor: This simulator expects a commit message. Use `git commit -m "Describe the change"`.';
    }
  }

  if (isGitCommand(parsedCommand, 'add') && parsedCommand.args.length === 0) {
    return 'Tutor: Tell Git which file to stage. For example, run `git add timeline.txt`.';
  }

  if (isGitCommand(parsedCommand, 'config')) {
    if (parsedCommand.args[0] !== '--global') {
      return 'Tutor: For this lesson, use the global config form: `git config --global user.name "Your Name"` or `git config --global user.email "you@example.com"`.';
    }

    return 'Tutor: Check the config key and value. The supported keys here are `user.name` and `user.email`.';
  }

  if (isGitCommand(parsedCommand, 'log') && repo.commits.length === 0) {
    return 'Tutor: There is no history yet. Stage a file with `git add`, create a commit, then `git log` will have something to show.';
  }

  if (isGitCommand(parsedCommand, 'checkout') || isGitCommand(parsedCommand, 'switch')) {
    const branchName = parsedCommand.args[0];
    if (!branchName) {
      return 'Tutor: Choose the branch you want to move to. For example, `git checkout feature-fix`.';
    }

    return `Tutor: Branch '${branchName}' does not exist yet. Create it with \`git branch ${branchName}\`, then check it out.`;
  }

  if (isGitCommand(parsedCommand, 'merge')) {
    const branchName = parsedCommand.args[0];
    if (!branchName) {
      return 'Tutor: Choose a branch to merge into your current branch. For example, `git merge feature-fix`.';
    }

    const branch = repo.branches.find((candidate) => candidate.name === branchName);
    if (branch?.current) {
      return 'Tutor: You are already on that branch. Switch back to the branch that should receive the changes, then merge.';
    }

    if (hasUnresolvedConflicts(repo)) {
      return 'Tutor: Finish the current merge first. Resolve conflicts, stage the resolved files, and commit before starting another merge.';
    }

    return `Tutor: Git cannot find a branch named '${branchName}'. Check \`git branch\` or create the branch first.`;
  }

  if (isGitCommand(parsedCommand, 'reset')) {
    return 'Tutor: Reset needs a valid revision such as `HEAD~1` and an optional mode: `--soft`, `--mixed`, or `--hard`.';
  }

  if (isGitCommand(parsedCommand, 'revert')) {
    if (parsedCommand.args.length === 0) {
      return 'Tutor: Revert needs a commit hash. Run `git log`, copy the bad commit hash, then run `git revert <hash>`.';
    }

    return 'Tutor: That commit hash was not found. Run `git log` and use one of the hashes shown there.';
  }

  if (parsedCommand.type === 'unknown') {
    return 'Tutor: I do not recognize that command. Try `help` for supported shell commands or `git --help` for Git commands.';
  }

  if (parsedCommand.type === 'git') {
    return 'Tutor: Check the command syntax and compare it with the current mission objectives.';
  }

  return undefined;
};
