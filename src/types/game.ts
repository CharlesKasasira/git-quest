// Enhanced type definitions with better TypeScript practices

export interface GitFile {
  name: string;
  content: string;
  staged: boolean;
  modified: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  files: string[];
}

export interface GitBranch {
  name: string;
  commits: GitCommit[];
  current: boolean;
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
}

export interface TerminalCommand {
  command: string;
  args: string[];
  output: string;
  success: boolean;
  timestamp: Date;
}

export interface Level {
  id: number;
  title: string;
  story: string;
  objectives: string[];
  expectedCommands: string[];
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

export interface GameState {
  currentLevel: number;
  levels: Level[];
  achievements: Achievement[];
  totalScore: number;
  completedCommands: string[];
  startTime: Date;
  lastPlayTime: Date;
}

export interface TerminalState {
  history: TerminalCommand[];
  currentRepo: GitRepository;
  currentDirectory: string;
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
  | 'time-reverter' 
  | 'timeline-master';

// Strict typing for game actions
export type GameAction =
  | { type: 'SET_CURRENT_LEVEL'; payload: number }
  | { type: 'COMPLETE_LEVEL'; payload: number }
  | { type: 'UNLOCK_ACHIEVEMENT'; payload: AchievementId }
  | { type: 'ADD_COMPLETED_COMMAND'; payload: string }
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
    'first-steps', 'branch-wizard', 'time-reverter', 'timeline-master'
  ];
  return validIds.includes(id as AchievementId);
}; 