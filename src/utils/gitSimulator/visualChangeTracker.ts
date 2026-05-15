import { GitFile, GitRepository, GitVisualChange } from '../../types/game';
import { getFileStatus, normalizeRepository } from './repositoryModel';
import { ParsedCommand } from './types';

const fileKey = (file: GitFile): string =>
  `${file.name}:${file.staged}:${file.modified}:${file.status ?? ''}:${file.tracked ?? ''}:${file.conflict ?? ''}:${file.content}`;

const names = (values: string[]): string[] | undefined => (values.length > 0 ? values : undefined);

const formatList = (values: string[]): string => {
  if (values.length === 0) {
    return '';
  }

  if (values.length === 1) {
    return values[0] ?? '';
  }

  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
};

const summarizeFileState = (file: GitFile): string => {
  switch (getFileStatus(file)) {
    case 'conflicted':
      return 'conflicted';
    case 'staged':
      return 'staged';
    case 'modified':
      return 'modified';
    case 'untracked':
      return 'untracked';
    case 'tracked':
      return 'tracked';
  }
};

const createNoChangeMessage = (parsedCommand: ParsedCommand): GitVisualChange => {
  if (parsedCommand.type === 'git') {
    return {
      area: 'repository',
      label: 'Repository inspected',
      detail: `git ${parsedCommand.command || '--help'} did not change the graph, staging area, branches, or files.`,
    };
  }

  return {
    area: 'repository',
    label: 'No Git state change',
    detail: `${parsedCommand.command} did not change the repository visuals.`,
  };
};

export const getVisualChanges = (
  parsedCommand: ParsedCommand,
  success: boolean,
  before: GitRepository,
  after: GitRepository
): GitVisualChange[] => {
  if (!success) {
    return [
      {
        area: 'repository',
        label: 'No visual change',
        detail: 'The command failed, so the commit graph, staging area, branches, and files stayed the same.',
      },
    ];
  }

  const beforeRepo = normalizeRepository(before);
  const afterRepo = normalizeRepository(after);
  const changes: GitVisualChange[] = [];

  if (!beforeRepo.initialized && afterRepo.initialized) {
    changes.push({
      area: 'repository',
      label: 'Repository initialized',
      detail: 'Git tracking is now active and the repository visuals can show branches, commits, and file states.',
    });
  }

  const beforeFiles = new Map(beforeRepo.files.map((file) => [file.name, file]));
  const afterFiles = new Map(afterRepo.files.map((file) => [file.name, file]));
  const addedFiles = afterRepo.files.filter((file) => !beforeFiles.has(file.name));
  const removedFiles = beforeRepo.files.filter((file) => !afterFiles.has(file.name));
  const changedFiles = afterRepo.files.filter((file) => {
    const beforeFile = beforeFiles.get(file.name);
    return beforeFile && fileKey(beforeFile) !== fileKey(file);
  });

  if (addedFiles.length > 0) {
    const fileNames = addedFiles.map((file) => file.name);
    changes.push({
      area: 'files',
      label: 'Files added to explorer',
      detail: `${formatList(fileNames)} ${fileNames.length === 1 ? 'now appears' : 'now appear'} in the repository explorer.`,
      names: fileNames,
    });
  }

  if (removedFiles.length > 0) {
    const fileNames = removedFiles.map((file) => file.name);
    changes.push({
      area: 'files',
      label: 'Files removed from explorer',
      detail: `${formatList(fileNames)} ${fileNames.length === 1 ? 'was' : 'were'} removed from the file explorer.`,
      names: fileNames,
    });
  }

  const stagedFiles = changedFiles.filter((file) => file.staged && !beforeFiles.get(file.name)?.staged);
  if (stagedFiles.length > 0) {
    const fileNames = stagedFiles.map((file) => file.name);
    changes.push({
      area: 'staging',
      label: 'Moved into staging area',
      detail: `${formatList(fileNames)} ${fileNames.length === 1 ? 'is' : 'are'} ready to be included in the next commit.`,
      names: fileNames,
    });
  }

  const unstagedFiles = changedFiles.filter((file) => !file.staged && beforeFiles.get(file.name)?.staged);
  if (unstagedFiles.length > 0) {
    const fileNames = unstagedFiles.map((file) => file.name);
    changes.push({
      area: 'staging',
      label: 'Cleared from staging area',
      detail: `${formatList(fileNames)} ${fileNames.length === 1 ? 'moved' : 'moved'} out of staging after the command.`,
      names: fileNames,
    });
  }

  const statusChangedFiles = changedFiles.filter(
    (file) =>
      !stagedFiles.some((stagedFile) => stagedFile.name === file.name) &&
      !unstagedFiles.some((unstagedFile) => unstagedFile.name === file.name)
  );
  if (statusChangedFiles.length > 0) {
    changes.push({
      area: 'files',
      label: 'File state updated',
      detail: statusChangedFiles
        .map((file) => `${file.name} is now ${summarizeFileState(file)}`)
        .join('; '),
      names: statusChangedFiles.map((file) => file.name),
    });
  }

  const beforeBranches = new Map(beforeRepo.branches.map((branch) => [branch.name, branch]));
  const afterBranches = new Map(afterRepo.branches.map((branch) => [branch.name, branch]));
  const addedBranches = afterRepo.branches.filter((branch) => !beforeBranches.has(branch.name));
  if (addedBranches.length > 0) {
    const branchNames = addedBranches.map((branch) => branch.name);
    changes.push({
      area: 'branches',
      label: 'Branch tree expanded',
      detail: `${formatList(branchNames)} ${branchNames.length === 1 ? 'was' : 'were'} added to the branch tree.`,
      names: branchNames,
    });
  }

  if (beforeRepo.currentBranch !== afterRepo.currentBranch || beforeRepo.head.target !== afterRepo.head.target) {
    changes.push({
      area: 'branches',
      label: 'Current branch changed',
      detail: `HEAD moved from ${beforeRepo.currentBranch || beforeRepo.head.target || 'no branch'} to ${afterRepo.currentBranch || afterRepo.head.target || 'no branch'}.`,
      names: names([afterRepo.currentBranch].filter(Boolean)),
    });
  }

  const beforeTagNames = new Set(beforeRepo.tags.map((tag) => tag.name));
  const addedTags = afterRepo.tags.filter((tag) => !beforeTagNames.has(tag.name));
  if (addedTags.length > 0) {
    changes.push({
      area: 'repository',
      label: 'Tag added',
      detail: `${formatList(addedTags.map((tag) => tag.name))} now marks a commit in history.`,
      names: addedTags.map((tag) => tag.name),
    });
  }

  const unresolvedBefore = beforeRepo.conflicts.filter((conflict) => !conflict.resolved);
  const unresolvedAfter = afterRepo.conflicts.filter((conflict) => !conflict.resolved);
  if (unresolvedBefore.length !== unresolvedAfter.length) {
    changes.push({
      area: 'files',
      label: 'Merge conflict state changed',
      detail: `${unresolvedAfter.length} unresolved conflict${unresolvedAfter.length === 1 ? '' : 's'} remain.`,
      names: afterRepo.conflicts.map((conflict) => conflict.fileName),
    });
  }

  const beforeCommitHashes = new Set(beforeRepo.commits.map((commit) => commit.hash));
  const addedCommits = afterRepo.commits.filter((commit) => !beforeCommitHashes.has(commit.hash));
  if (addedCommits.length > 0) {
    changes.push({
      area: 'commits',
      label: 'Commit graph updated',
      detail: `${addedCommits.length} new commit${addedCommits.length === 1 ? '' : 's'} appeared in the commit graph: ${addedCommits
        .map((commit) => `${commit.hash} "${commit.message}"`)
        .join(', ')}.`,
      names: addedCommits.map((commit) => commit.hash),
    });
  }

  afterRepo.branches.forEach((branch) => {
    const previousBranch = beforeBranches.get(branch.name);
    if (!previousBranch) {
      return;
    }

    const beforeHashes = new Set(previousBranch.commits.map((commit) => commit.hash));
    const newBranchCommits = branch.commits.filter((commit) => !beforeHashes.has(commit.hash));
    if (newBranchCommits.length > 0) {
      changes.push({
        area: 'branches',
        label: `${branch.name} branch advanced`,
        detail: `${branch.name} now points to ${newBranchCommits[newBranchCommits.length - 1]?.hash}.`,
        names: [branch.name],
      });
    }
  });

  return changes.length > 0 ? changes : [createNoChangeMessage(parsedCommand)];
};
