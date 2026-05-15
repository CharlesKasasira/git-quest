import { GitCommit, GitFile, GitRepository } from '../../types/game';
import { getFileStatus, normalizeRepository } from './repositoryModel';

export const GIT_HELP_OUTPUT =
  'usage: git [--version] [--help] [-C <path>] [-c <name>=<value>]\n' +
  '           [--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]\n' +
  '           [-p | --paginate | -P | --no-pager] [--no-replace-objects] [--bare]\n' +
  '           [--git-dir=<path>] [--work-tree=<path>] [--namespace=<name>]\n' +
  '           <command> [<args>]\n\n' +
  'These are common Git commands used in various situations:\n\n' +
  'start a working area (see also: git help tutorial)\n' +
  '   clone     Clone a repository into a new directory\n' +
  '   init      Create an empty Git repository or reinitialize an existing one\n\n' +
  'work on the current change (see also: git help everyday)\n' +
  '   add       Add file contents to the index\n' +
  '   mv        Move or rename a file, a directory, or a symlink\n' +
  '   reset     Reset current HEAD to the specified state\n' +
  '   rm        Remove files from the working tree and from the index\n\n' +
  'examine the history and state (see also: git help revisions)\n' +
  '   bisect    Use binary search to find the commit that introduced a bug\n' +
  '   grep      Print lines matching a pattern\n' +
  '   log       Show commit logs\n' +
  '   show      Show various types of objects\n' +
  '   status    Show the working tree status\n\n' +
  'grow, mark and tweak your common history\n' +
  '   branch    List, create, or delete branches\n' +
  '   checkout  Switch branches or restore working tree files\n' +
  '   commit    Record changes to the repository\n' +
  '   diff      Show changes between commits, commit and working tree, etc\n' +
  '   merge     Join two or more development histories together\n' +
  '   rebase    Reapply commits on top of another base tip\n' +
  '   tag       Create, list, delete or verify a tag object signed with GPG';

export const SHELL_HELP_OUTPUT = `Available commands:
  git [command]     - Git version control commands
  ls, dir          - List files
  pwd              - Show current directory
  clear            - Clear screen
  echo [text]      - Display text
  touch [file]     - Create an untracked file
  edit [file]      - Modify a tracked file
  help             - Show this help

Git commands: init, config, status, add, commit, log, branch, checkout, merge, revert, reset, tag, push, pull, fetch, clone, remote, stash, rebase, cherry-pick, blame, diff, show, help, version, switch, restore, clean, mv, rm, bisect, reflog, worktree, submodule, notes, replace, gc, fsck, prune

Type 'git --help' for detailed Git command information.`;

export const notGitRepository = (): string =>
  'fatal: not a git repository (or any of the parent directories): .git';

export const commandNotFound = (command: string): string =>
  `Command not found: ${command}. Type 'help' for available commands or 'git --help' for Git commands.`;

export const unknownGitCommand = (command: string): string =>
  `git: '${command}' is not a git command. See 'git --help'.\n\nThe most similar command is\n\tgit ${findSimilarGitCommand(command)}`;

export const findSimilarGitCommand = (command: string): string => {
  const commands = ['init', 'config', 'status', 'add', 'commit', 'log', 'branch', 'checkout', 'merge'];
  return commands.find((candidate) => candidate.startsWith(command) || command.startsWith(candidate)) || 'help';
};

const formatChangeLabel = (file: GitFile): string => {
  if (file.tracked === false || file.status === 'untracked') {
    return `new file:   ${file.name}`;
  }

  return `modified:   ${file.name}`;
};

export const formatFileList = (files: GitFile[], repo?: GitRepository): string => {
  const normalizedRepo = repo ? normalizeRepository(repo) : undefined;
  const normalizedFiles = normalizedRepo?.files ?? files;

  if (normalizedFiles.length === 0) {
    return 'nothing to commit, working tree clean';
  }

  const conflicts = normalizedRepo?.conflicts.filter((conflict) => !conflict.resolved) ?? [];
  const staged = normalizedFiles.filter((file) => getFileStatus(file) === 'staged' || file.staged);
  const modified = normalizedFiles.filter((file) => getFileStatus(file) === 'modified');
  const untracked = normalizedFiles.filter((file) => getFileStatus(file) === 'untracked');

  let output = '';

  if (conflicts.length > 0) {
    output += '\nUnmerged paths:\n';
    conflicts.forEach((conflict) => {
      output += `  both modified:   ${conflict.fileName}\n`;
    });
  }

  if (staged.length > 0) {
    output += '\nChanges to be committed:\n';
    staged.forEach((file) => {
      output += `  ${formatChangeLabel(file)}\n`;
    });
  }

  if (modified.length > 0) {
    output += '\nChanges not staged for commit:\n';
    modified.forEach((file) => {
      output += `  modified:   ${file.name}\n`;
    });
  }

  if (untracked.length > 0) {
    output += '\nUntracked files:\n';
    untracked.forEach((file) => {
      output += `  ${file.name}\n`;
    });
  }

  return output;
};

export const formatCommitLog = (commits: GitCommit[]): string => {
  let output = '';
  commits.slice().reverse().forEach((commit) => {
    output += `commit ${commit.hash}\n`;
    output += `Author: ${commit.author}\n`;
    output += `Date: ${commit.timestamp.toDateString()}\n\n`;
    output += `    ${commit.message}\n\n`;
  });

  return output.trim();
};
