import { GitCommit, GitFile, GitIndexEntry, GitRepository } from '../../types/game';
import { GIT_HELP_OUTPUT, formatCommitLog, formatFileList, notGitRepository } from './outputFormatter';
import {
  cloneRepository,
  createCommit,
  createTreeFromHeadAndIndex,
  getBranchHead,
  getFileStatus,
  getHeadCommit,
  getHeadCommitHash,
  hasUnresolvedConflicts,
  markFileStaged,
  markFileTracked,
  normalizeRepository,
  RepositoryModel,
  updateCurrentBranchHead,
} from './repositoryModel';
import { CommandHandler, CommandResult } from './types';

const defaultRemoteUrl = 'https://github.com/timeline/universe.git';

const requireInitialized = (repo: GitRepository): CommandResult | null => {
  if (repo.initialized) {
    return null;
  }

  return {
    output: notGitRepository(),
    success: false,
  };
};

const getAuthor = (repo: GitRepository): string =>
  `${repo.config.userName ?? 'Timekeeper'} <${repo.config.userEmail ?? 'timekeeper@universe.com'}>`;

const hasUserIdentity = (repo: GitRepository): boolean => Boolean(repo.config.userName && repo.config.userEmail);

const getMessage = (args: string[]): string | null => {
  const messageIndex = args.indexOf('-m');
  const messageArg = args[messageIndex + 1];
  return messageIndex === -1 || !messageArg ? null : messageArg.replace(/"/g, '');
};

const resolveRevision = (repo: RepositoryModel, revision: string): string | undefined => {
  if (revision === 'HEAD') {
    return getHeadCommitHash(repo);
  }

  if (revision.startsWith('HEAD~')) {
    const steps = Number(revision.slice('HEAD~'.length));
    if (!Number.isFinite(steps)) {
      return undefined;
    }

    let commit = getHeadCommit(repo);
    for (let index = 0; index < steps && commit; index += 1) {
      const parentHash = commit.parents?.[0];
      commit = parentHash ? repo.commits.find((candidate) => candidate.hash === parentHash) : undefined;
    }

    return commit?.hash;
  }

  const branch = repo.branches.find((candidate) => candidate.name === revision);
  if (branch) {
    return getBranchHead(branch);
  }

  const tag = repo.tags.find((candidate) => candidate.name === revision);
  if (tag) {
    return tag.target;
  }

  const remoteMatch = repo.remotes
    .flatMap((remote) => Object.entries(remote.branches).map(([branchName, hash]) => [`${remote.name}/${branchName}`, hash]))
    .find(([remoteBranch]) => remoteBranch === revision);
  if (remoteMatch?.[1]) {
    return remoteMatch[1];
  }

  return repo.commits.find((commit) => commit.hash.startsWith(revision))?.hash;
};

const getCommitByRevision = (repo: RepositoryModel, revision: string): GitCommit | undefined => {
  const hash = resolveRevision(repo, revision);
  return hash ? repo.commits.find((commit) => commit.hash === hash) : undefined;
};

const applyTreeToWorkingDirectory = (repo: RepositoryModel, tree: Record<string, string>): void => {
  repo.files = Object.entries(tree).map(([name, content]) => ({
    name,
    content,
    staged: false,
    modified: false,
    tracked: true,
    status: 'tracked',
    conflict: false,
  }));
};

const createIndexEntry = (file: GitFile): GitIndexEntry => ({
  fileName: file.name,
  content: file.content,
  status: file.tracked === false || file.status === 'untracked' ? 'added' : 'modified',
});

const stageFile = (repo: RepositoryModel, file: GitFile): void => {
  const stagedFile = markFileStaged(file);
  const fileIndex = repo.files.findIndex((candidate) => candidate.name === file.name);
  if (fileIndex === -1) {
    repo.files.push(stagedFile);
  } else {
    repo.files[fileIndex] = stagedFile;
  }

  repo.stagingArea = [
    ...repo.stagingArea.filter((entry) => entry.fileName !== file.name),
    createIndexEntry(stagedFile),
  ];

  repo.conflicts = repo.conflicts.map((conflict) =>
    conflict.fileName === file.name ? { ...conflict, resolved: true } : conflict
  );
};

const clearIndexAfterCommit = (repo: RepositoryModel): void => {
  repo.files = repo.files.map(markFileTracked);
  repo.stagingArea = [];
  repo.conflicts = repo.conflicts.filter((conflict) => !conflict.resolved);
};

const listBranch = (repo: RepositoryModel): CommandResult => {
  const output = repo.branches
    .map((branch) => `${branch.name === repo.currentBranch ? '* ' : '  '}${branch.name}`)
    .join('\n');

  return {
    output,
    success: true,
  };
};

const createBranch = (repo: GitRepository, branchName: string): CommandResult => {
  const newRepo = cloneRepository(repo);

  if (newRepo.branches.find((branch) => branch.name === branchName)) {
    return {
      output: `fatal: A branch named '${branchName}' already exists.`,
      success: false,
    };
  }

  const headHash = getHeadCommitHash(newRepo);
  const branchCommits = headHash
    ? newRepo.commits.filter((commit) => commit.hash === headHash || newRepo.branches.find((branch) => branch.name === newRepo.currentBranch)?.commits.some((branchCommit) => branchCommit.hash === commit.hash))
    : [];

  newRepo.branches.push({
    name: branchName,
    commits: branchCommits,
    current: false,
    ...(headHash ? { head: headHash } : {}),
  });

  return {
    output: '',
    success: true,
    newRepo,
  };
};

const checkoutBranch = (repo: GitRepository, branchName: string): CommandResult => {
  const newRepo = cloneRepository(repo);
  const branch = newRepo.branches.find((candidate) => candidate.name === branchName);

  if (!branch) {
    return {
      output: `error: pathspec '${branchName}' did not match any file(s) known to git`,
      success: false,
    };
  }

  if (newRepo.files.some((file) => getFileStatus(file) === 'modified' || getFileStatus(file) === 'untracked')) {
    return {
      output: 'error: Your local changes would be overwritten by checkout.\nPlease commit or stash them before you switch branches.',
      success: false,
    };
  }

  newRepo.branches = newRepo.branches.map((candidate) => ({
    ...candidate,
    current: candidate.name === branchName,
  }));
  newRepo.currentBranch = branchName;
  newRepo.head = { type: 'branch', target: branchName };

  const headHash = getBranchHead(branch);
  const commit = headHash ? newRepo.commits.find((candidate) => candidate.hash === headHash) : undefined;
  applyTreeToWorkingDirectory(newRepo, commit?.tree ?? {});

  return {
    output: `Switched to branch '${branchName}'`,
    success: true,
    newRepo,
  };
};

const gitInit: CommandHandler = (_args, repo) => {
  if (repo.initialized) {
    return {
      output: 'Reinitialized existing Git repository in /timeline-project/.git/',
      success: true,
      newRepo: normalizeRepository(repo),
    };
  }

  const newRepo: GitRepository = normalizeRepository({
    ...repo,
    initialized: true,
    branches: [{ name: 'main', commits: [], current: true }],
    currentBranch: 'main',
    head: { type: 'branch', target: 'main' },
    stagingArea: [],
    remotes: [],
    tags: [],
    conflicts: [],
  });

  return {
    output: 'Initialized empty Git repository in /timeline-project/.git/',
    success: true,
    newRepo,
  };
};

const gitConfig: CommandHandler = (args, repo) => {
  if (args.length < 2) {
    return {
      output: 'usage: git config [<options>] <name> [<value>]',
      success: false,
    };
  }

  const flag = args[0];
  const key = args[1];
  const value = args[2];

  if (flag !== '--global') {
    return {
      output: 'For this tutorial, please use --global flag',
      success: false,
    };
  }

  const newRepo = cloneRepository(repo);

  if (key === 'user.name' && value) {
    newRepo.config.userName = value.replace(/"/g, '');
    return { output: '', success: true, newRepo };
  }

  if (key === 'user.email' && value) {
    newRepo.config.userEmail = value.replace(/"/g, '');
    return { output: '', success: true, newRepo };
  }

  return {
    output: `Unknown config key: ${key}`,
    success: false,
  };
};

const gitStatus: CommandHandler = (_args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const normalized = normalizeRepository(repo);
  let output = `On branch ${normalized.currentBranch}\n`;

  if (normalized.commits.length === 0) {
    output += '\nNo commits yet\n';
  }

  if (hasUnresolvedConflicts(normalized)) {
    output += '\nYou have unmerged paths.\n  (fix conflicts and run "git add <file>")\n';
  }

  output += formatFileList(normalized.files, normalized);

  return { output, success: true };
};

const gitAdd: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const target = args[0];
  if (!target) {
    return {
      output: 'Nothing specified, nothing added.',
      success: false,
    };
  }

  const newRepo = cloneRepository(repo);
  const targets = target === '.' || target === '--all' || target === '-A'
    ? newRepo.files.filter((file) => getFileStatus(file) !== 'tracked').map((file) => file.name)
    : [target];

  targets.forEach((filename) => {
    const file = newRepo.files.find((candidate) => candidate.name === filename);
    if (file) {
      stageFile(newRepo, file);
      return;
    }

    stageFile(newRepo, {
      name: filename,
      content: 'Timeline entry: Reality stabilization initiated...',
      staged: true,
      modified: false,
      tracked: false,
      status: 'untracked',
      conflict: false,
    });
  });

  return { output: '', success: true, newRepo };
};

const gitCommit: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const normalized = normalizeRepository(repo);
  if (hasUnresolvedConflicts(normalized)) {
    return {
      output: 'error: Committing is not possible because you have unmerged files.',
      success: false,
    };
  }

  if (normalized.stagingArea.length === 0) {
    return {
      output: 'nothing to commit, working tree clean',
      success: false,
    };
  }

  if (!hasUserIdentity(normalized)) {
    return {
      output:
        'Please tell me who you are.\n\nRun\n\n  git config --global user.email "you@example.com"\n  git config --global user.name "Your Name"',
      success: false,
    };
  }

  const message = getMessage(args);
  if (!message) {
    return {
      output: 'Aborting commit due to empty commit message.',
      success: false,
    };
  }

  const newRepo = cloneRepository(normalized);
  const parent = getHeadCommitHash(newRepo);
  const tree = createTreeFromHeadAndIndex(newRepo);
  const files = newRepo.stagingArea.map((entry) => entry.fileName);
  const commit = createCommit(message, files, getAuthor(newRepo), parent ? [parent] : [], tree);

  newRepo.commits.push(commit);
  updateCurrentBranchHead(newRepo, commit);
  clearIndexAfterCommit(newRepo);

  return {
    output: `[${newRepo.currentBranch} ${commit.hash}] ${message}\n ${files.length} file${files.length > 1 ? 's' : ''} changed`,
    success: true,
    newRepo,
  };
};

const gitLog: CommandHandler = (_args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const normalized = normalizeRepository(repo);
  const currentBranch = normalized.branches.find((branch) => branch.name === normalized.currentBranch);
  const commits = currentBranch?.commits.length ? currentBranch.commits : normalized.commits;

  if (commits.length === 0) {
    return {
      output: `fatal: your current branch '${normalized.currentBranch || 'main'}' does not have any commits yet`,
      success: false,
    };
  }

  return {
    output: formatCommitLog(commits),
    success: true,
  };
};

const gitBranch: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const normalized = normalizeRepository(repo);
  if (args.length === 0) {
    return listBranch(normalized);
  }

  if (args[0] === '-d' || args[0] === '-D') {
    const branchName = args[1];
    if (!branchName) {
      return { output: 'usage: git branch -d <branch>', success: false };
    }

    if (branchName === normalized.currentBranch) {
      return { output: `error: Cannot delete branch '${branchName}' checked out`, success: false };
    }

    const newRepo = cloneRepository(normalized);
    const beforeCount = newRepo.branches.length;
    newRepo.branches = newRepo.branches.filter((branch) => branch.name !== branchName);
    if (newRepo.branches.length === beforeCount) {
      return { output: `error: branch '${branchName}' not found.`, success: false };
    }

    return { output: `Deleted branch ${branchName}.`, success: true, newRepo };
  }

  const branchName = args[0];
  if (!branchName) {
    return { output: 'usage: git branch <branch>', success: false };
  }

  return createBranch(normalized, branchName);
};

const gitCheckout: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  if (args[0] === '-b') {
    const branchName = args[1];
    if (!branchName) {
      return { output: 'usage: git checkout -b <branch>', success: false };
    }

    const created = createBranch(repo, branchName);
    return created.success && created.newRepo ? checkoutBranch(created.newRepo, branchName) : created;
  }

  const branchName = args[0];
  if (!branchName) {
    return { output: 'usage: git checkout <branch>', success: false };
  }

  return checkoutBranch(repo, branchName);
};

const hasConflictBetweenTrees = (
  currentTree: Record<string, string>,
  targetTree: Record<string, string>,
  currentHead?: string,
  targetHead?: string
): string[] => {
  if (!currentHead || !targetHead || currentHead === targetHead) {
    return [];
  }

  return Object.keys(currentTree).filter(
    (fileName) => targetTree[fileName] !== undefined && targetTree[fileName] !== currentTree[fileName]
  );
};

const gitMerge: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const branchName = args[0];
  if (!branchName) {
    return { output: 'usage: git merge <branch>', success: false };
  }

  const normalized = normalizeRepository(repo);
  const branch = normalized.branches.find((candidate) => candidate.name === branchName);
  if (!branch) {
    return { output: `merge: ${branchName} - not something we can merge`, success: false };
  }

  if (branch.current || branch.name === normalized.currentBranch) {
    return { output: `Already on '${branchName}'`, success: false };
  }

  if (hasUnresolvedConflicts(normalized)) {
    return { output: 'error: Merging is not possible because you have unmerged files.', success: false };
  }

  const newRepo = cloneRepository(normalized);
  const currentHead = getHeadCommitHash(newRepo);
  const targetHead = getBranchHead(branch);
  const currentCommit = currentHead ? newRepo.commits.find((commit) => commit.hash === currentHead) : undefined;
  const targetCommit = targetHead ? newRepo.commits.find((commit) => commit.hash === targetHead) : undefined;

  if (!targetCommit) {
    return {
      output: "Merge made by the 'recursive' strategy.\n 1 file changed, 1 insertion(+)",
      success: true,
      newRepo,
    };
  }

  if (targetHead === currentHead) {
    return { output: 'Already up to date.', success: true, newRepo };
  }

  const currentTree = currentCommit?.tree ?? {};
  const targetTree = targetCommit.tree ?? {};
  const conflictingFiles = hasConflictBetweenTrees(currentTree, targetTree, currentHead, targetHead);

  if (conflictingFiles.length > 0) {
    newRepo.conflicts = conflictingFiles.map((fileName) => ({
      fileName,
      ours: currentTree[fileName] ?? '',
      theirs: targetTree[fileName] ?? '',
      base: '',
      resolved: false,
    }));
    newRepo.files = [
      ...newRepo.files.filter((file) => !conflictingFiles.includes(file.name)),
      ...conflictingFiles.map((fileName) => ({
        name: fileName,
        content: `<<<<<<< HEAD\n${currentTree[fileName] ?? ''}\n=======\n${targetTree[fileName] ?? ''}\n>>>>>>> ${branchName}`,
        staged: false,
        modified: true,
        tracked: true,
        status: 'conflicted' as const,
        conflict: true,
      })),
    ];

    return {
      output: `Auto-merging ${conflictingFiles.join(', ')}\nCONFLICT (content): Merge conflict in ${conflictingFiles.join(', ')}\nAutomatic merge failed; fix conflicts and then commit the result.`,
      success: true,
      newRepo,
    };
  }

  const mergedTree = { ...currentTree, ...targetTree };
  const mergeFiles = Object.keys(mergedTree);
  const mergeCommit = createCommit(
    `Merge branch '${branchName}'`,
    mergeFiles,
    getAuthor(newRepo),
    [currentHead, targetHead].filter(Boolean) as string[],
    mergedTree
  );

  newRepo.commits.push(mergeCommit);
  updateCurrentBranchHead(newRepo, mergeCommit);
  applyTreeToWorkingDirectory(newRepo, mergedTree);

  return {
    output: "Merge made by the 'recursive' strategy.\n 1 file changed, 1 insertion(+)",
    success: true,
    newRepo,
  };
};

const gitRevert: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const commitHash = args[0];
  if (!commitHash) {
    return { output: 'usage: git revert <commit>', success: false };
  }

  const normalized = normalizeRepository(repo);
  const commit = getCommitByRevision(normalized, commitHash);
  if (!commit) {
    return { output: `fatal: bad object ${commitHash}`, success: false };
  }

  const newRepo = cloneRepository(normalized);
  const parent = getHeadCommitHash(newRepo);
  const headTree = getHeadCommit(newRepo)?.tree ?? {};
  const revertedTree = { ...headTree };
  commit.files.forEach((fileName) => {
    delete revertedTree[fileName];
  });
  const revertCommit = createCommit(
    `Revert "${commit.message}"`,
    commit.files,
    getAuthor(newRepo),
    parent ? [parent] : [],
    revertedTree
  );
  newRepo.commits.push(revertCommit);
  updateCurrentBranchHead(newRepo, revertCommit);
  applyTreeToWorkingDirectory(newRepo, revertedTree);

  return {
    output: `[${newRepo.currentBranch} ${revertCommit.hash}] Revert "${commit.message}"`,
    success: true,
    newRepo,
  };
};

const gitReset: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const normalized = normalizeRepository(repo);
  const mode = args.find((arg) => arg.startsWith('--')) ?? '--mixed';
  const revision = args.find((arg) => !arg.startsWith('--')) ?? 'HEAD~1';
  const targetCommit = getCommitByRevision(normalized, revision);

  if (!['--soft', '--mixed', '--hard'].includes(mode)) {
    return { output: `fatal: ambiguous argument '${mode}': unknown revision or path not in the working tree.`, success: false };
  }

  if (!targetCommit) {
    return { output: `fatal: ambiguous argument '${revision}': unknown revision or path not in the working tree.`, success: false };
  }

  const newRepo = cloneRepository(normalized);
  const branchIndex = newRepo.branches.findIndex((branch) => branch.name === newRepo.currentBranch);
  const branch = newRepo.branches[branchIndex];
  if (branch) {
    newRepo.branches[branchIndex] = {
      ...branch,
      head: targetCommit.hash,
      commits: branch.commits.filter((commit) => commit.hash === targetCommit.hash || commit.timestamp <= targetCommit.timestamp),
    };
  }

  newRepo.head = { type: 'branch', target: newRepo.currentBranch };

  if (mode === '--soft') {
    return { output: '', success: true, newRepo };
  }

  newRepo.stagingArea = [];
  newRepo.files = newRepo.files.map((file) => ({
    ...file,
    staged: false,
    status: getFileStatus(file) === 'staged' ? 'modified' : getFileStatus(file),
  }));

  if (mode === '--hard') {
    applyTreeToWorkingDirectory(newRepo, targetCommit.tree ?? {});
    newRepo.conflicts = [];
  }

  return {
    output: mode === '--hard' ? `HEAD is now at ${targetCommit.hash} ${targetCommit.message}` : '',
    success: true,
    newRepo,
  };
};

const gitTag: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const normalized = normalizeRepository(repo);
  if (args.length === 0) {
    return {
      output: normalized.tags.map((tag) => tag.name).join('\n'),
      success: true,
    };
  }

  if (args[0] === '-d') {
    const tagName = args[1];
    if (!tagName) {
      return { output: 'usage: git tag -d <tagname>', success: false };
    }

    const newRepo = cloneRepository(normalized);
    const beforeCount = newRepo.tags.length;
    newRepo.tags = newRepo.tags.filter((tag) => tag.name !== tagName);
    if (newRepo.tags.length === beforeCount) {
      return { output: `error: tag '${tagName}' not found.`, success: false };
    }

    return { output: `Deleted tag '${tagName}'`, success: true, newRepo };
  }

  const annotated = args[0] === '-a';
  const tagName = annotated ? args[1] : args[0];
  if (!tagName) {
    return { output: 'usage: git tag <tagname>', success: false };
  }

  if (normalized.tags.some((tag) => tag.name === tagName)) {
    return { output: `fatal: tag '${tagName}' already exists`, success: false };
  }

  const target = getHeadCommitHash(normalized);
  if (!target) {
    return { output: 'fatal: Failed to resolve HEAD as a valid ref.', success: false };
  }

  const newRepo = cloneRepository(normalized);
  const message = annotated ? getMessage(args) ?? tagName : undefined;
  newRepo.tags.push({
    name: tagName,
    target,
    annotated,
    ...(message ? { message } : {}),
    createdAt: new Date(),
  });

  return {
    output: `Created tag '${tagName}'`,
    success: true,
    newRepo,
  };
};

const gitRemote: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const normalized = normalizeRepository(repo);
  if (args[0] === '-v') {
    return {
      output: normalized.remotes
        .flatMap((remote) => [
          `${remote.name}\t${remote.url} (fetch)`,
          `${remote.name}\t${remote.url} (push)`,
        ])
        .join('\n'),
      success: true,
    };
  }

  if (args[0] === 'add') {
    const name = args[1];
    const url = args[2];
    if (!name || !url) {
      return { output: 'usage: git remote add <name> <url>', success: false };
    }

    const newRepo = cloneRepository(normalized);
    if (newRepo.remotes.some((remote) => remote.name === name)) {
      return { output: `error: remote ${name} already exists.`, success: false };
    }

    newRepo.remotes.push({ name, url, branches: {} });
    return { output: '', success: true, newRepo };
  }

  return {
    output: normalized.remotes.map((remote) => remote.name).join('\n'),
    success: true,
  };
};

const gitFetch: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const newRepo = cloneRepository(repo);
  const remoteName = args[0] || 'origin';
  let remote = newRepo.remotes.find((candidate) => candidate.name === remoteName);
  if (!remote) {
    remote = { name: remoteName, url: defaultRemoteUrl, branches: {} };
    newRepo.remotes.push(remote);
  }

  const headHash = getHeadCommitHash(newRepo);
  if (headHash) {
    remote.branches[newRepo.currentBranch || 'main'] = headHash;
  }

  return {
    output: `From ${remote.url}\n * [new branch]     ${newRepo.currentBranch || 'main'}     -> ${remote.name}/${newRepo.currentBranch || 'main'}`,
    success: true,
    newRepo,
  };
};

const gitPush: CommandHandler = (args, repo) => {
  const notInitialized = requireInitialized(repo);
  if (notInitialized) {
    return notInitialized;
  }

  const newRepo = cloneRepository(repo);
  const remoteName = args[0] || 'origin';
  const branchName = args[1] || newRepo.currentBranch || 'main';
  let remote = newRepo.remotes.find((candidate) => candidate.name === remoteName);
  if (!remote) {
    remote = { name: remoteName, url: defaultRemoteUrl, branches: {} };
    newRepo.remotes.push(remote);
  }

  const headHash = getHeadCommitHash(newRepo);
  if (headHash) {
    remote.branches[branchName] = headHash;
  }

  return {
    output: `Everything up-to-date\n\nTimeline pushed to ${remote.name}/${branchName}\n\n🌟 Timeline successfully pushed to universal repository! 🌟`,
    success: true,
    newRepo,
  };
};

const initializedNoOp =
  (output: string, includeRepo = true): CommandHandler =>
  (_args, repo) => {
    const notInitialized = requireInitialized(repo);
    if (notInitialized) {
      return notInitialized;
    }

    return {
      output,
      success: true,
      ...(includeRepo ? { newRepo: normalizeRepository(repo) } : {}),
    };
  };

const gitClone: CommandHandler = (args, repo) => {
  const remoteUrl = args[0] || defaultRemoteUrl;
  const initialCommit = createCommit(
    'Initial timeline entry',
    ['timeline.txt'],
    getAuthor(repo),
    [],
    { 'timeline.txt': 'Timeline entry: Reality stabilization initiated...' }
  );
  const newRepo = normalizeRepository({
    ...repo,
    initialized: true,
    files: [
      {
        name: 'timeline.txt',
        content: 'Timeline entry: Reality stabilization initiated...',
        staged: false,
        modified: false,
        tracked: true,
        status: 'tracked',
      },
    ],
    commits: [initialCommit],
    branches: [{ name: 'main', commits: [initialCommit], current: true, head: initialCommit.hash }],
    currentBranch: 'main',
    head: { type: 'branch', target: 'main' },
    remotes: [{ name: 'origin', url: remoteUrl, branches: { main: initialCommit.hash } }],
    stagingArea: [],
    tags: [],
    conflicts: [],
  });

  return {
    output:
      "Cloning into 'timeline-project'...\nremote: Counting objects: 100, done.\nremote: Compressing objects: 100% (100/100), done.\nremote: Total 100 (delta 0), reused 0 (delta 0), pack-reused 100\nReceiving objects: 100% (100/100), done.\nResolving deltas: 100% (0/0), done.",
    success: true,
    newRepo,
  };
};

const gitHelp: CommandHandler = () => ({ output: GIT_HELP_OUTPUT, success: true });

const gitVersion: CommandHandler = () => ({ output: 'git version 2.39.0', success: true });

const gitSwitch: CommandHandler = (args, repo) => {
  if (args[0] === '-c') {
    return gitCheckout(['-b', ...args.slice(1)], repo);
  }

  return gitCheckout(args, repo);
};

export const gitCommandHandlers: Record<string, CommandHandler> = {
  init: gitInit,
  config: gitConfig,
  status: gitStatus,
  add: gitAdd,
  commit: gitCommit,
  log: gitLog,
  branch: gitBranch,
  checkout: gitCheckout,
  merge: gitMerge,
  revert: gitRevert,
  reset: gitReset,
  tag: gitTag,
  push: gitPush,
  pull: initializedNoOp('Already up to date.'),
  fetch: gitFetch,
  clone: gitClone,
  remote: gitRemote,
  stash: initializedNoOp('Saved working directory and index state WIP on main: abc1234 Initial commit'),
  rebase: initializedNoOp('Current branch main is up to date.'),
  'cherry-pick': initializedNoOp('[main abc1234] Cherry-pick commit'),
  blame: initializedNoOp(
    'abc1234 (Timekeeper 2024-01-01 12:00:00 +0000 1) Timeline entry: Reality stabilization initiated...',
    false
  ),
  diff: initializedNoOp(
    'diff --git a/timeline.txt b/timeline.txt\nindex abc1234..def5678 100644\n--- a/timeline.txt\n+++ b/timeline.txt\n@@ -1,1 +1,1 @@\n-Timeline entry: Reality stabilization initiated...\n+Timeline entry: Reality stabilization completed!',
    false
  ),
  show: initializedNoOp(
    'commit abc1234\nAuthor: Timekeeper <timekeeper@universe.com>\nDate:   Mon Jan 1 12:00:00 2024 +0000\n\n    Initial timeline entry\n\ndiff --git a/timeline.txt b/timeline.txt\nnew file mode 100644\nindex 0000000..abc1234\n--- /dev/null\n+++ b/timeline.txt\n@@ -0,0 +1 @@\n+Timeline entry: Reality stabilization initiated...',
    false
  ),
  help: gitHelp,
  '--help': gitHelp,
  version: gitVersion,
  '--version': gitVersion,
  switch: gitSwitch,
  restore: initializedNoOp('Restored timeline.txt'),
  clean: initializedNoOp('Would remove virus.txt\n\nNote: This is a dry run. Use -f to force removal.'),
  mv: initializedNoOp('Renamed timeline.txt to timeline-backup.txt'),
  rm: initializedNoOp("rm 'virus.txt'"),
  bisect: initializedNoOp('Bisecting: 0 revisions left to test after this (roughly 0 steps)'),
  reflog: initializedNoOp(
    'abc1234 HEAD@{0}: commit: Initial timeline entry\nabc1234 HEAD@{1}: checkout: moving from feature-fix to main',
    false
  ),
  worktree: initializedNoOp('/timeline-project  abc1234 [main]', false),
  submodule: initializedNoOp('No submodules found.', false),
  notes: initializedNoOp('No notes found.', false),
  replace: initializedNoOp('No replacements found.', false),
  gc: initializedNoOp(
    'Enumerating objects: 3, done.\nCounting objects: 100% (3/3), done.\nDelta compression using up to 8 threads.\nCompressing objects: 100% (2/2), done.\nWriting objects: 100% (3/3), done.\nTotal 3 (delta 0), reused 0 (delta 0), pack-reused 3'
  ),
  fsck: initializedNoOp('Checking object directories: 100% (256/256), done.\nChecking objects: 100% (3/3), done.', false),
  prune: initializedNoOp('No unreferenced objects found.'),
};

export const reduceGitCommand = (command: string, args: string[], repo: GitRepository): CommandResult | null => {
  if (!command) {
    return gitHelp(args, repo);
  }

  const handler = gitCommandHandlers[command];
  if (!handler) {
    return null;
  }

  return handler(args, repo);
};
