// Enhanced type definitions with better TypeScript practices

export interface GitFile {
  name: string;
  content: string;
  staged: boolean;
  modified: boolean;
  tracked?: boolean;
  status?: GitFileStatus;
  conflict?: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  files: string[];
  parents?: string[];
  tree?: Record<string, string>;
}

export interface GitBranch {
  name: string;
  commits: GitCommit[];
  current: boolean;
  head?: string;
}

export type GitFileStatus = 'untracked' | 'modified' | 'staged' | 'tracked' | 'conflicted';

export interface GitHead {
  type: 'branch' | 'detached';
  target: string;
}

export interface GitIndexEntry {
  fileName: string;
  content: string;
  status: 'added' | 'modified' | 'deleted';
}

export interface GitRemote {
  name: string;
  url: string;
  branches: Record<string, string>;
}

export interface GitTag {
  name: string;
  target: string;
  annotated: boolean;
  message?: string;
  createdAt: Date;
}

export interface GitConflict {
  fileName: string;
  ours: string;
  theirs: string;
  base?: string;
  resolved: boolean;
}

export interface GitRepository {
  initialized: boolean;
  files: GitFile[];
  branches: GitBranch[];
  currentBranch: string;
  commits: GitCommit[];
  config: {
    userName?: string;
    userEmail?: string;
  };
  workingDirectory: string;
  head?: GitHead;
  stagingArea?: GitIndexEntry[];
  remotes?: GitRemote[];
  tags?: GitTag[];
  conflicts?: GitConflict[];
}

export interface TerminalCommand {
  command: string;
  args: string[];
  output: string;
  feedback?: string;
  visualChanges?: GitVisualChange[];
  success: boolean;
  exitCode?: number;
  cwd?: string;
  prompt?: string;
  durationMs?: number;
  timestamp: Date;
}

export interface TerminalFileEntry {
  path: string;
  type: 'file' | 'directory';
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type GitVisualArea = 'repository' | 'files' | 'staging' | 'commits' | 'branches';

export interface GitVisualChange {
  area: GitVisualArea;
  label: string;
  detail: string;
  names?: string[];
}

export type LevelCompletionCriterion =
  | 'gitInitRun'
  | 'gitUserNameConfigured'
  | 'gitUserEmailConfigured'
  | 'gitStatusRun'
  | 'gitAddRun'
  | 'gitCommitRun'
  | 'gitLogRun'
  | 'gitBranchRun'
  | 'gitCheckoutRun'
  | 'gitMergeRun'
  | 'gitRevertRun'
  | 'gitResetRun'
  | 'gitRevertOrResetRun'
  | 'gitTagRun'
  | 'gitPushRun'
  | 'repositoryInitialized'
  | 'userNameConfigured'
  | 'userEmailConfigured'
  | 'userIdentityConfigured'
  | 'hasFiles'
  | 'hasTimelineFile'
  | 'hasCommits'
  | 'hasMultipleBranches'
  | 'hasAtLeastTwoCommits'
  | 'hasAtLeastThreeCommits'
  | 'currentBranchFeatureFix'
  | 'currentBranchMain'
  | 'noConflictFiles'
  | 'noActiveVirusFile'
  | 'noVirusFile'
  | 'branchCountAtMostTwo';

export interface Level {
  id: number;
  title: string;
  story: string;
  objectives: string[];
  objectiveCriteria: LevelCompletionCriterion[][];
  progressCriteria: LevelCompletionCriterion[];
  completionCriteria: LevelCompletionCriterion[];
  expectedCommands: string[];
  expectedOutputs: Record<string, string>;
  initialRepo: GitRepository;
  hints: Record<string, string>;
  completed: boolean;
  unlocked: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface LevelStats {
  levelId: number;
  attempts: number;
  startedAt?: number;
  completedAt?: number;
  completionTimeMs?: number;
  bestCompletionTimeMs?: number;
  successfulCommands: number;
  failedCommands: number;
  hintsUsed: number;
}

export interface LevelScoreBreakdown {
  levelId: number;
  basePoints: number;
  speedBonus: number;
  accuracyBonus: number;
  streakBonus: number;
  totalPoints: number;
  timeMs: number;
  failedCommands: number;
  grade: 'S' | 'A' | 'B' | 'C';
}

export interface GameState {
  currentLevel: number;
  levels: Level[];
  achievements: Achievement[];
  totalScore: number;
  completedCommands: string[];
  commandStreak: number;
  bestCommandStreak: number;
  totalCommandsExecuted: number;
  successfulCommandsExecuted: number;
  failedCommandsExecuted: number;
  levelStats: Record<number, LevelStats>;
  lastLevelScore?: LevelScoreBreakdown;
  lastUnlockedAchievementId?: string;
  startTime: Date;
  lastPlayTime: Date;
}

export interface TerminalState {
  history: TerminalCommand[];
  currentRepo: GitRepository;
  currentDirectory: string;
  environment: Record<string, string>;
  aliases: Record<string, string>;
  fileSystem: TerminalFileEntry[];
  lastExitCode: number;
  isProcessing: boolean;
}

// Utility types for better type safety
export type GitCommand = 
  | 'init' 
  | 'config' 
  | 'status' 
  | 'add' 
  | 'commit' 
  | 'log' 
  | 'branch' 
  | 'checkout' 
  | 'merge' 
  | 'revert' 
  | 'reset' 
  | 'tag' 
  | 'push';

export type AchievementId = 
  | 'first-steps' 
  | 'branch-wizard' 
  | 'conflict-resolver'
  | 'time-reverter' 
  | 'timeline-master'
  | 'speedrunner'
  | 'perfectionist'
  | 'explorer'
  | 'comeback-kid'
  | 'git-guru';

// Strict typing for game actions
export type GameAction =
  | { type: 'SET_CURRENT_LEVEL'; payload: number }
  | { type: 'COMPLETE_LEVEL'; payload: number }
  | { type: 'UNLOCK_ACHIEVEMENT'; payload: AchievementId }
  | { type: 'RECORD_COMMAND_RESULT'; payload: { levelId: number; success: boolean; command: string } }
  | { type: 'RECORD_HINT_USED'; payload: number }
  | { type: 'CLEAR_LAST_UNLOCKED_ACHIEVEMENT' }
  | { type: 'RESET_PROGRESS' }
  | { type: 'LOAD_PROGRESS'; payload: GameState };

// Type guards for runtime type checking
export const isGitCommand = (command: string): command is GitCommand => {
  const validCommands: GitCommand[] = [
    'init', 'config', 'status', 'add', 'commit', 'log', 
    'branch', 'checkout', 'merge', 'revert', 'reset', 'tag', 'push'
  ];
  return validCommands.includes(command as GitCommand);
};

export const isAchievementId = (id: string): id is AchievementId => {
  const validIds: AchievementId[] = [
    'first-steps',
    'branch-wizard',
    'conflict-resolver',
    'time-reverter',
    'timeline-master',
    'speedrunner',
    'perfectionist',
    'explorer',
    'comeback-kid',
    'git-guru',
  ];
  return validIds.includes(id as AchievementId);
};
