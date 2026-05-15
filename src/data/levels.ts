import authoredLevels from './levels.json';
import {
  GitBranch,
  GitCommit,
  GitFile,
  GitConflict,
  GitIndexEntry,
  GitRemote,
  GitRepository,
  GitTag,
  Level,
  LevelCompletionCriterion,
} from '../types/game';
import { normalizeRepository } from '../utils/gitSimulator/repositoryModel';

type RawGitCommit = Omit<GitCommit, 'timestamp'> & {
  timestamp?: string;
};

type RawGitBranch = Omit<GitBranch, 'commits'> & {
  commits?: RawGitCommit[];
};

interface RawGitRepository {
  initialized?: boolean;
  files?: GitFile[];
  branches?: RawGitBranch[];
  currentBranch?: string;
  commits?: RawGitCommit[];
  config?: GitRepository['config'];
  workingDirectory?: string;
  head?: GitRepository['head'];
  stagingArea?: GitIndexEntry[];
  remotes?: GitRemote[];
  tags?: (Omit<GitTag, 'createdAt'> & { createdAt?: string })[];
  conflicts?: GitConflict[];
}

interface RawLevel {
  id: number;
  title: string;
  story: string;
  objectives: string[];
  objectiveCriteria: LevelCompletionCriterion[][];
  progressCriteria: LevelCompletionCriterion[];
  completionCriteria: LevelCompletionCriterion[];
  expectedCommands: string[];
  expectedOutputs?: Record<string, string>;
  initialRepo: RawGitRepository;
  hints: Record<string, string>;
}

const defaultCommitTimestamp = '2024-01-01T00:00:00.000Z';

const createCommit = (commit: RawGitCommit): GitCommit => ({
  ...commit,
  timestamp: new Date(commit.timestamp ?? defaultCommitTimestamp),
});

const createInitialRepo = (rawRepo: RawGitRepository): GitRepository => {
  const initialized = Boolean(rawRepo.initialized);
  const commits = (rawRepo.commits ?? []).map(createCommit);
  const tags = rawRepo.tags?.map((tag) => ({
    ...tag,
    createdAt: new Date(tag.createdAt ?? defaultCommitTimestamp),
  }));

  return normalizeRepository({
    initialized,
    files: rawRepo.files ?? [],
    branches:
      rawRepo.branches?.map((branch) => ({
        ...branch,
        commits: (branch.commits ?? []).map(createCommit),
      })) ?? (initialized ? [{ name: 'main', commits: [], current: true }] : []),
    currentBranch: rawRepo.currentBranch ?? (initialized ? 'main' : ''),
    commits,
    config: rawRepo.config ?? {},
    workingDirectory: rawRepo.workingDirectory ?? '/timeline-project',
    ...(rawRepo.head ? { head: rawRepo.head } : {}),
    ...(rawRepo.stagingArea ? { stagingArea: rawRepo.stagingArea } : {}),
    ...(rawRepo.remotes ? { remotes: rawRepo.remotes } : {}),
    ...(tags ? { tags } : {}),
    ...(rawRepo.conflicts ? { conflicts: rawRepo.conflicts } : {}),
  });
};

const createLevel = (rawLevel: RawLevel, index: number): Level => ({
  id: rawLevel.id,
  title: rawLevel.title,
  story: rawLevel.story,
  objectives: rawLevel.objectives,
  objectiveCriteria: rawLevel.objectiveCriteria,
  progressCriteria: rawLevel.progressCriteria,
  completionCriteria: rawLevel.completionCriteria,
  expectedCommands: rawLevel.expectedCommands,
  expectedOutputs: rawLevel.expectedOutputs ?? {},
  initialRepo: createInitialRepo(rawLevel.initialRepo),
  hints: rawLevel.hints,
  completed: false,
  unlocked: index === 0,
});

export const levelsData: Level[] = (authoredLevels as RawLevel[]).map(createLevel);
