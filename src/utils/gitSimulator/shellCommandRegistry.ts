import { GitRepository } from '../../types/game';
import { SHELL_HELP_OUTPUT } from './outputFormatter';
import { cloneRepository, getFileStatus } from './repositoryModel';
import { CommandHandler, CommandResult } from './types';

const listFiles: CommandHandler = (_args, repo) => {
  let output = '';
  if (repo.files.length > 0) {
    output += `${repo.files.map((file) => file.name).join('  ')}\n`;
  } else {
    output += 'No files found.\n';
  }

  return {
    output,
    success: true,
  };
};

const printWorkingDirectory: CommandHandler = (_args, repo) => ({
  output: repo.workingDirectory,
  success: true,
});

const clearScreen: CommandHandler = () => ({
  output: '\n'.repeat(50),
  success: true,
});

const printHelp: CommandHandler = () => ({
  output: SHELL_HELP_OUTPUT,
  success: true,
});

const echo: CommandHandler = (args) => ({
  output: args.join(' '),
  success: true,
});

const touchFile: CommandHandler = (args, repo) => {
  const filename = args[0];
  if (!filename) {
    return {
      output: 'usage: touch <file>',
      success: false,
    };
  }

  const newRepo = cloneRepository(repo);
  const file = newRepo.files.find((candidate) => candidate.name === filename);
  if (file) {
    file.modified = getFileStatus(file) !== 'untracked';
    file.status = file.modified ? 'modified' : 'untracked';
  } else {
    newRepo.files.push({
      name: filename,
      content: '',
      staged: false,
      modified: true,
      tracked: false,
      status: 'untracked',
    });
  }

  return {
    output: '',
    success: true,
    newRepo,
  };
};

const editFile: CommandHandler = (args, repo) => {
  const filename = args[0];
  if (!filename) {
    return {
      output: 'usage: edit <file> [content]',
      success: false,
    };
  }

  const newRepo = cloneRepository(repo);
  const fileIndex = newRepo.files.findIndex((candidate) => candidate.name === filename);
  const content = args.slice(1).join(' ') || `Updated ${filename}`;

  if (fileIndex === -1) {
    newRepo.files.push({
      name: filename,
      content,
      staged: false,
      modified: true,
      tracked: false,
      status: 'untracked',
    });
  } else {
    const file = newRepo.files[fileIndex];
    if (file) {
      newRepo.files[fileIndex] = {
        ...file,
        content,
        staged: false,
        modified: true,
        status: file.tracked === false || file.status === 'untracked' ? 'untracked' : 'modified',
      };
      newRepo.stagingArea = newRepo.stagingArea.filter((entry) => entry.fileName !== filename);
    }
  }

  return {
    output: '',
    success: true,
    newRepo,
  };
};

export const shellCommandHandlers: Record<string, CommandHandler> = {
  ls: listFiles,
  dir: listFiles,
  pwd: printWorkingDirectory,
  clear: clearScreen,
  help: printHelp,
  echo,
  touch: touchFile,
  edit: editFile,
};

export const runShellCommand = (command: string, args: string[], repo: GitRepository): CommandResult | null => {
  const handler = shellCommandHandlers[command];
  if (!handler) {
    return null;
  }

  return handler(args, repo);
};
