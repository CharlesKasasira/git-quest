import {
  GitBranch,
  GitCommit,
  GitConflict,
  GitFile,
  GitIndexEntry,
  GitRemote,
  GitRepository,
  GitTag,
} from '../../types/game';

export interface RepositoryModel extends GitRepository {
  head: NonNullable<GitRepository['head']>;
  stagingArea: GitIndexEntry[];
  remotes: GitRemote[];
  tags: GitTag[];
  conflicts: GitConflict[];
}

export const createCommitHash = (): string => Math.random().toString(36).substring(2, 8);

export const getFileStatus = (file: GitFile): NonNullable<GitFile['status']> => {
  if (file.conflict) {
    return 'conflicted';
  }

  if (file.status) {
    return file.status;
  }

  if (file.staged) {
    return 'staged';
  }

  if (file.modified && file.tracked === false) {
    return 'untracked';
  }

  if (file.modified) {
    return 'modified';
  }

  return 'tracked';
};

export const getBranchHead = (branch: GitBranch): string | undefined =>
  branch.head ?? branch.commits[branch.commits.length - 1]?.hash;

export const getCurrentBranch = (repo: GitRepository): GitBranch | undefined =>
  repo.branches.find((branch) => branch.name === repo.currentBranch || branch.current);

export const getHeadCommitHash = (repo: GitRepository): string | undefined => {
  if (repo.head?.type === 'detached') {
    return repo.head.target;
  }

  const branchName = repo.head?.target || repo.currentBranch;
  const branch = repo.branches.find((candidate) => candidate.name === branchName);
  return branch ? getBranchHead(branch) : undefined;
};

export const getHeadCommit = (repo: GitRepository): GitCommit | undefined => {
  const headHash = getHeadCommitHash(repo);
  return headHash ? repo.commits.find((commit) => commit.hash === headHash) : undefined;
};

const createTreeFromFiles = (files: GitFile[]): Record<string, string> =>
  Object.fromEntries(
    files
      .filter((file) => getFileStatus(file) !== 'untracked' && !file.conflict)
      .map((file) => [file.name, file.content])
  );

export const createCommit = (
  message: string,
  files: string[],
  author: string,
  parents: string[],
  tree: Record<string, string>
): GitCommit => ({
  hash: createCommitHash(),
  message,
  author,
  timestamp: new Date(),
  files,
  parents,
  tree,
});

export const normalizeRepository = (repo: GitRepository): RepositoryModel => {
  const fallbackTree = createTreeFromFiles(repo.files);
  const commits = repo.commits.map((commit) => ({
    ...commit,
    parents: commit.parents ?? [],
    tree: commit.tree && Object.keys(commit.tree).length > 0 ? commit.tree : fallbackTree,
  }));
  const commitByHash = new Map(commits.map((commit) => [commit.hash, commit]));
  const declaredCurrentBranch = repo.currentBranch || repo.branches.find((branch) => branch.current)?.name || '';

  const branches = repo.branches.map((branch) => {
    const isCurrentBranch = branch.name === declaredCurrentBranch || branch.current;
    const branchCommits = branch.commits.length > 0
      ? branch.commits.map((commit) => commitByHash.get(commit.hash) ?? commit)
      : (isCurrentBranch ? commits : []);
    return {
      ...branch,
      commits: branchCommits,
      head: branch.head ?? branchCommits[branchCommits.length - 1]?.hash,
      current: isCurrentBranch,
    };
  });

  const currentBranch = declaredCurrentBranch;
  const files = repo.files.map((file) => {
    const status = getFileStatus(file);
    return {
      ...file,
      tracked: file.tracked ?? status !== 'untracked',
      status,
      staged: status === 'staged' || file.staged,
      modified: status === 'modified' || status === 'untracked' || status === 'conflicted' || file.modified,
      conflict: status === 'conflicted' || file.conflict,
    };
  });

  const stagingArea = repo.stagingArea ?? files
    .filter((file) => file.staged)
    .map((file) => ({
      fileName: file.name,
      content: file.content,
      status: file.tracked === false || file.status === 'untracked' ? 'added' as const : 'modified' as const,
    }));

  const head = repo.head ?? {
    type: currentBranch ? 'branch' as const : 'detached' as const,
    target: currentBranch || getHeadCommitHash({ ...repo, commits, branches }) || '',
  };

  return {
    ...repo,
    files,
    branches,
    currentBranch,
    commits,
    head,
    stagingArea,
    remotes: repo.remotes ?? [],
    tags: repo.tags ?? [],
    conflicts: repo.conflicts ?? files
      .filter((file) => file.conflict)
      .map((file) => ({
        fileName: file.name,
        ours: file.content,
        theirs: file.content,
        resolved: false,
      })),
  };
};

export const cloneRepository = (repo: GitRepository): RepositoryModel => {
  const normalized = normalizeRepository(repo);
  return {
    ...normalized,
    files: normalized.files.map((file) => ({ ...file })),
    branches: normalized.branches.map((branch) => ({
      ...branch,
      commits: branch.commits.map((commit) => ({ ...commit, parents: [...(commit.parents ?? [])], tree: { ...(commit.tree ?? {}) } })),
    })),
    commits: normalized.commits.map((commit) => ({ ...commit, parents: [...(commit.parents ?? [])], tree: { ...(commit.tree ?? {}) } })),
    config: { ...normalized.config },
    head: { ...normalized.head },
    stagingArea: normalized.stagingArea.map((entry) => ({ ...entry })),
    remotes: normalized.remotes.map((remote) => ({ ...remote, branches: { ...remote.branches } })),
    tags: normalized.tags.map((tag) => ({ ...tag, createdAt: new Date(tag.createdAt) })),
    conflicts: normalized.conflicts.map((conflict) => ({ ...conflict })),
  };
};

export const markFileTracked = (file: GitFile): GitFile => ({
  ...file,
  tracked: true,
  staged: false,
  modified: false,
  status: 'tracked',
  conflict: false,
});

export const markFileStaged = (file: GitFile): GitFile => ({
  ...file,
  tracked: file.tracked ?? file.status !== 'untracked',
  staged: true,
  modified: false,
  status: 'staged',
  conflict: false,
});

export const createTreeFromHeadAndIndex = (repo: RepositoryModel): Record<string, string> => {
  const headTree = getHeadCommit(repo)?.tree ?? {};
  const tree = { ...headTree };

  repo.stagingArea.forEach((entry) => {
    if (entry.status === 'deleted') {
      delete tree[entry.fileName];
      return;
    }

    tree[entry.fileName] = entry.content;
  });

  return tree;
};

export const updateCurrentBranchHead = (repo: RepositoryModel, commit: GitCommit): void => {
  const branchIndex = repo.branches.findIndex((branch) => branch.name === repo.currentBranch);
  const currentBranch = repo.branches[branchIndex];

  if (!currentBranch) {
    repo.head = { type: 'detached', target: commit.hash };
    return;
  }

  repo.branches[branchIndex] = {
    ...currentBranch,
    head: commit.hash,
    current: true,
    commits: [...currentBranch.commits, commit],
  };
  repo.head = { type: 'branch', target: currentBranch.name };
};

export const hasUnresolvedConflicts = (repo: GitRepository): boolean =>
  normalizeRepository(repo).conflicts.some((conflict) => !conflict.resolved);
