// Multiplayer types and interfaces for Git Quest

export interface User {
  id: string;
  username: string;
  avatar: string;
  currentLevel: number;
  isOnline: boolean;
  lastSeen: Date;
  skills: Skill[];
  achievements: Achievement[];
  experience: number;
  rank: string;
}

export interface Skill {
  name: string;
  level: number;
  experience: number;
  maxLevel: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'busy' | 'away' | 'in-challenge' | 'mentoring';
  currentActivity: string;
  location: 'timeline' | 'terminal' | 'visual' | 'challenge';
  lastSeen: Date;
  isAvailable: boolean;
}

export interface Challenge {
  id: string;
  challenger: User;
  challenged: User;
  type: 'speed' | 'accuracy' | 'collaboration' | 'mentoring';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  timeLimit?: number;
  objectives: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  winner?: User;
  score?: ChallengeScore;
}

export interface ChallengeScore {
  challenger: number;
  challenged: number;
  timeElapsed: number;
  accuracy: number;
  commandsExecuted: number;
  errors: number;
}

export interface LiveCollaboration {
  id: string;
  participants: User[];
  sharedRepository: GitRepository;
  activeUser: string;
  cursorPosition: CursorPosition;
  liveChanges: LiveChange[];
  voiceChat: boolean;
  screenShare: boolean;
  createdAt: Date;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  timestamp: Date;
}

export interface LiveChange {
  id: string;
  userId: string;
  type: 'command' | 'file' | 'branch' | 'commit';
  data: any;
  timestamp: Date;
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

export interface GitFile {
  name: string;
  content: string;
  staged: boolean;
  modified: boolean;
}

export interface GitBranch {
  name: string;
  commits: GitCommit[];
  current: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  files: string[];
}

export interface LeaderboardEntry {
  user: User;
  score: number;
  rank: number;
  level: number;
  achievements: number;
  challengesWon: number;
  challengesLost: number;
  winRate: number;
}

export interface Leaderboard {
  global: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  bySkill: Map<string, LeaderboardEntry[]>;
  byLevel: Map<number, LeaderboardEntry[]>;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system' | 'challenge' | 'achievement';
}

export interface Notification {
  id: string;
  userId: string;
  type: 'challenge' | 'achievement' | 'message' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface MultiplayerState {
  onlineUsers: User[];
  activeChallenges: Challenge[];
  liveCollaborations: LiveCollaboration[];
  globalLeaderboard: LeaderboardEntry[];
  userPresence: UserPresence[];
  chatMessages: ChatMessage[];
  notifications: Notification[];
  currentUser?: User;
  isConnected: boolean;
}

// Socket.IO event types
export interface SocketEvents {
  // User events
  'user:join': (user: User) => void;
  'user:leave': (userId: string) => void;
  'user:presence': (presence: UserPresence) => void;
  'user:update': (user: User) => void;

  // Challenge events
  'challenge:create': (challenge: Challenge) => void;
  'challenge:accept': (challengeId: string) => void;
  'challenge:decline': (challengeId: string) => void;
  'challenge:start': (challengeId: string) => void;
  'challenge:complete': (challengeId: string, score: ChallengeScore) => void;
  'challenge:cancel': (challengeId: string) => void;

  // Collaboration events
  'collaboration:create': (collaboration: LiveCollaboration) => void;
  'collaboration:join': (collaborationId: string, user: User) => void;
  'collaboration:leave': (collaborationId: string, userId: string) => void;
  'collaboration:update': (collaboration: LiveCollaboration) => void;
  'collaboration:change': (collaborationId: string, change: LiveChange) => void;

  // Chat events
  'chat:message': (message: ChatMessage) => void;
  'chat:typing': (userId: string, isTyping: boolean) => void;

  // Leaderboard events
  'leaderboard:update': (leaderboard: Leaderboard) => void;

  // Notification events
  'notification:new': (notification: Notification) => void;
  'notification:read': (notificationId: string) => void;

  // Error events
  'error': (error: string) => void;
  'disconnect': () => void;
  'reconnect': () => void;
}

// Challenge types
export type ChallengeType = 'speed' | 'accuracy' | 'collaboration' | 'mentoring';
export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'cancelled';

// User status types
export type UserStatus = 'online' | 'busy' | 'away' | 'in-challenge' | 'mentoring';
export type UserLocation = 'timeline' | 'terminal' | 'visual' | 'challenge';

// Chat message types
export type ChatMessageType = 'text' | 'system' | 'challenge' | 'achievement';

// Notification types
export type NotificationType = 'challenge' | 'achievement' | 'message' | 'system';

// Utility functions
export const generateUserId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const generateChallengeId = (): string => {
  return 'challenge_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
};

export const generateCollaborationId = (): string => {
  return 'collab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
};

// Challenge objectives
export const CHALLENGE_OBJECTIVES = {
  speed: [
    'Complete 10 Git commands in under 2 minutes',
    'Create and merge 5 branches as fast as possible',
    'Make 20 commits with meaningful messages',
    'Resolve merge conflicts in record time'
  ],
  accuracy: [
    'Execute Git workflow with zero errors',
    'Write perfect commit messages',
    'Implement complex branching strategy',
    'Safely rewrite Git history'
  ],
  collaboration: [
    'Resolve complex merge conflicts together',
    'Develop feature across multiple branches',
    'Review and improve Git practices',
    'Set up project with best practices'
  ],
  mentoring: [
    'Guide beginner through Git basics',
    'Help resolve Git conflicts',
    'Teach advanced Git concepts',
    'Review and improve Git workflow'
  ]
};

// Skill definitions
export const SKILLS = [
  { name: 'Git Basics', maxLevel: 10 },
  { name: 'Branching', maxLevel: 10 },
  { name: 'Merging', maxLevel: 10 },
  { name: 'Collaboration', maxLevel: 10 },
  { name: 'Advanced Git', maxLevel: 10 },
  { name: 'Teaching', maxLevel: 10 }
];

// Achievement definitions
export const MULTIPLAYER_ACHIEVEMENTS = [
  {
    id: 'first-challenge',
    title: 'First Challenge',
    description: 'Complete your first multiplayer challenge',
    icon: '⚔️',
    rarity: 'common'
  },
  {
    id: 'challenge-master',
    title: 'Challenge Master',
    description: 'Win 10 challenges in a row',
    icon: '👑',
    rarity: 'legendary'
  },
  {
    id: 'mentor',
    title: 'Mentor',
    description: 'Help 5 beginners complete their first challenge',
    icon: '🎓',
    rarity: 'epic'
  },
  {
    id: 'collaborator',
    title: 'Collaborator',
    description: 'Complete 10 collaborative challenges',
    icon: '🤝',
    rarity: 'rare'
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Complete a speed challenge in record time',
    icon: '⚡',
    rarity: 'epic'
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Complete an accuracy challenge with zero errors',
    icon: '💎',
    rarity: 'rare'
  }
];

