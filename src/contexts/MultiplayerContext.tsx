import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useState, ReactNode } from 'react';
import { getSocketIO, getUUIDv4, generateId } from '../utils/multiplayerUtils';
import { 
  MultiplayerState, 
  User, 
  Challenge, 
  LiveCollaboration, 
  ChatMessage, 
  Notification,
  LeaderboardEntry,
  UserPresence,
  ChallengeScore,
  LiveChange,
  MultiplayerRoom,
  ChallengeResult,
  SharedRepositoryUpdate,
  GitRepository
} from '../types/multiplayer';

interface MultiplayerContextType {
  multiplayerState: MultiplayerState;
  dispatch: React.Dispatch<MultiplayerAction>;
  // Connection methods
  connect: (username: string) => void;
  disconnect: () => void;
  // User methods
  updateUserPresence: (presence: Partial<UserPresence>) => void;
  // Room methods
  createRoom: (name: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  spectateRoom: (roomId: string) => void;
  stopSpectating: (roomId: string) => void;
  updateSharedRepository: (target: { roomId?: string; collaborationId?: string }, repository: GitRepository, change?: LiveChange) => void;
  // Challenge methods
  createChallenge: (challengedUser: User, type: string, difficulty: string, roomId?: string) => void;
  acceptChallenge: (challengeId: string) => void;
  declineChallenge: (challengeId: string) => void;
  completeChallenge: (challengeId: string, score: ChallengeScore) => void;
  // Collaboration methods
  createCollaboration: (participants: User[], roomId?: string) => void;
  joinCollaboration: (collaborationId: string) => void;
  leaveCollaboration: (collaborationId: string) => void;
  sendLiveChange: (collaborationId: string, change: LiveChange) => void;
  // Chat methods
  sendMessage: (message: string, type?: string) => void;
  // Utility methods
  getOnlineUsers: () => User[];
  getRooms: () => MultiplayerRoom[];
  getActiveChallenges: () => Challenge[];
  getChallengeResults: () => ChallengeResult[];
  getNotifications: () => Notification[];
  markNotificationRead: (notificationId: string) => void;
}

type MultiplayerAction =
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'CLEAR_CURRENT_USER' }
  | { type: 'SET_ONLINE_USERS'; payload: User[] }
  | { type: 'ADD_ONLINE_USER'; payload: User }
  | { type: 'REMOVE_ONLINE_USER'; payload: string }
  | { type: 'UPDATE_USER_PRESENCE'; payload: UserPresence }
  | { type: 'SET_ROOMS'; payload: MultiplayerRoom[] }
  | { type: 'UPSERT_ROOM'; payload: MultiplayerRoom }
  | { type: 'REMOVE_ROOM'; payload: string }
  | { type: 'SET_CURRENT_ROOM'; payload: string }
  | { type: 'CLEAR_CURRENT_ROOM' }
  | { type: 'SET_SPECTATING_ROOM'; payload: string }
  | { type: 'CLEAR_SPECTATING_ROOM' }
  | { type: 'UPDATE_SHARED_REPOSITORY'; payload: SharedRepositoryUpdate }
  | { type: 'ADD_CHALLENGE'; payload: Challenge }
  | { type: 'UPDATE_CHALLENGE'; payload: Challenge }
  | { type: 'REMOVE_CHALLENGE'; payload: string }
  | { type: 'ADD_CHALLENGE_RESULT'; payload: ChallengeResult }
  | { type: 'ADD_COLLABORATION'; payload: LiveCollaboration }
  | { type: 'UPDATE_COLLABORATION'; payload: LiveCollaboration }
  | { type: 'REMOVE_COLLABORATION'; payload: string }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'UPDATE_LEADERBOARD'; payload: LeaderboardEntry[] }
  | { type: 'SET_ERROR'; payload: string };

const initialMultiplayerState: MultiplayerState = {
  onlineUsers: [],
  rooms: [],
  activeChallenges: [],
  liveCollaborations: [],
  challengeResults: [],
  globalLeaderboard: [],
  userPresence: [],
  chatMessages: [],
  notifications: [],
  isConnected: false,
};

const createEmptySharedRepository = (): GitRepository => ({
  initialized: false,
  files: [],
  branches: [],
  currentBranch: '',
  commits: [],
  config: {},
  workingDirectory: '/shared-project',
});

const getMultiplayerServerUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'ws://localhost:3001';
  }

  const runtimeConfig = window as Window & { __GIT_QUEST_MULTIPLAYER_URL__?: string };
  return runtimeConfig.__GIT_QUEST_MULTIPLAYER_URL__ || 'ws://localhost:3001';
};

const asDate = (value: Date | string): Date => value instanceof Date ? value : new Date(value);

const normalizeRoom = (room: MultiplayerRoom): MultiplayerRoom => ({
  ...room,
  createdAt: asDate(room.createdAt),
  updatedAt: asDate(room.updatedAt),
  sharedRepository: {
    ...room.sharedRepository,
    commits: room.sharedRepository.commits.map((commit) => ({
      ...commit,
      timestamp: asDate(commit.timestamp),
    })),
    branches: room.sharedRepository.branches.map((branch) => ({
      ...branch,
      commits: branch.commits.map((commit) => ({
        ...commit,
        timestamp: asDate(commit.timestamp),
      })),
    })),
  },
});

const normalizeChallenge = (challenge: Challenge): Challenge => ({
  ...challenge,
  createdAt: asDate(challenge.createdAt),
  ...(challenge.startedAt ? { startedAt: asDate(challenge.startedAt) } : {}),
  ...(challenge.completedAt ? { completedAt: asDate(challenge.completedAt) } : {}),
});

const normalizeChallengeResult = (result: ChallengeResult): ChallengeResult => ({
  ...result,
  completedAt: asDate(result.completedAt),
});

const normalizeCollaboration = (collaboration: LiveCollaboration): LiveCollaboration => ({
  ...collaboration,
  createdAt: asDate(collaboration.createdAt),
  ...(collaboration.updatedAt ? { updatedAt: asDate(collaboration.updatedAt) } : {}),
  cursorPosition: {
    ...collaboration.cursorPosition,
    timestamp: asDate(collaboration.cursorPosition.timestamp),
  },
  liveChanges: collaboration.liveChanges.map((change) => ({
    ...change,
    timestamp: asDate(change.timestamp),
  })),
});

const normalizeChatMessage = (message: ChatMessage): ChatMessage => ({
  ...message,
  timestamp: asDate(message.timestamp),
});

function multiplayerReducer(state: MultiplayerState, action: MultiplayerAction): MultiplayerState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload,
      };

    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload,
      };

    case 'CLEAR_CURRENT_USER': {
      const stateWithoutCurrentUser: MultiplayerState = { ...state };
      delete stateWithoutCurrentUser.currentUser;
      return stateWithoutCurrentUser;
    }

    case 'SET_ONLINE_USERS':
      return {
        ...state,
        onlineUsers: action.payload,
      };

    case 'ADD_ONLINE_USER':
      return {
        ...state,
        onlineUsers: [...state.onlineUsers.filter(u => u.id !== action.payload.id), action.payload],
      };

    case 'REMOVE_ONLINE_USER':
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter(u => u.id !== action.payload),
        userPresence: state.userPresence.filter(p => p.userId !== action.payload),
      };

    case 'UPDATE_USER_PRESENCE':
      return {
        ...state,
        userPresence: [
          ...state.userPresence.filter(p => p.userId !== action.payload.userId),
          action.payload,
        ],
      };

    case 'SET_ROOMS':
      return {
        ...state,
        rooms: action.payload,
      };

    case 'UPSERT_ROOM':
      return {
        ...state,
        rooms: [
          ...state.rooms.filter(room => room.id !== action.payload.id),
          action.payload,
        ],
      };

    case 'REMOVE_ROOM': {
      const stateWithoutClosedRoom: MultiplayerState = {
        ...state,
        rooms: state.rooms.filter(room => room.id !== action.payload),
      };

      if (stateWithoutClosedRoom.currentRoomId === action.payload) {
        delete stateWithoutClosedRoom.currentRoomId;
      }

      if (stateWithoutClosedRoom.spectatingRoomId === action.payload) {
        delete stateWithoutClosedRoom.spectatingRoomId;
      }

      return stateWithoutClosedRoom;
    }

    case 'SET_CURRENT_ROOM': {
      const stateWithRoom: MultiplayerState = {
        ...state,
        currentRoomId: action.payload,
      };
      delete stateWithRoom.spectatingRoomId;
      return stateWithRoom;
    }

    case 'CLEAR_CURRENT_ROOM': {
      const stateWithoutRoom: MultiplayerState = { ...state };
      delete stateWithoutRoom.currentRoomId;
      return stateWithoutRoom;
    }

    case 'SET_SPECTATING_ROOM': {
      const spectatingState: MultiplayerState = {
        ...state,
        spectatingRoomId: action.payload,
      };
      delete spectatingState.currentRoomId;
      return spectatingState;
    }

    case 'CLEAR_SPECTATING_ROOM': {
      const stateWithoutSpectatingRoom: MultiplayerState = { ...state };
      delete stateWithoutSpectatingRoom.spectatingRoomId;
      return stateWithoutSpectatingRoom;
    }

    case 'UPDATE_SHARED_REPOSITORY':
      return {
        ...state,
        rooms: action.payload.roomId
          ? state.rooms.map(room =>
              room.id === action.payload.roomId
                ? { ...room, sharedRepository: action.payload.repository, updatedAt: action.payload.updatedAt }
                : room
            )
          : state.rooms,
        liveCollaborations: action.payload.collaborationId
          ? state.liveCollaborations.map(collaboration =>
              collaboration.id === action.payload.collaborationId
                ? {
                    ...collaboration,
                    sharedRepository: action.payload.repository,
                    liveChanges: action.payload.change
                      ? [...collaboration.liveChanges, action.payload.change]
                      : collaboration.liveChanges,
                    updatedAt: action.payload.updatedAt,
                  }
                : collaboration
            )
          : state.liveCollaborations,
      };

    case 'ADD_CHALLENGE':
      return {
        ...state,
        activeChallenges: [
          ...state.activeChallenges.filter(challenge => challenge.id !== action.payload.id),
          action.payload,
        ],
      };

    case 'UPDATE_CHALLENGE':
      return {
        ...state,
        activeChallenges: state.activeChallenges.map(c => 
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case 'REMOVE_CHALLENGE':
      return {
        ...state,
        activeChallenges: state.activeChallenges.filter(c => c.id !== action.payload),
      };

    case 'ADD_CHALLENGE_RESULT':
      return {
        ...state,
        challengeResults: [
          action.payload,
          ...state.challengeResults.filter(result => result.id !== action.payload.id),
        ],
      };

    case 'ADD_COLLABORATION':
      return {
        ...state,
        liveCollaborations: [
          ...state.liveCollaborations.filter(collaboration => collaboration.id !== action.payload.id),
          action.payload,
        ],
      };

    case 'UPDATE_COLLABORATION':
      return {
        ...state,
        liveCollaborations: state.liveCollaborations.map(c => 
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case 'REMOVE_COLLABORATION':
      return {
        ...state,
        liveCollaborations: state.liveCollaborations.filter(c => c.id !== action.payload),
      };

    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload],
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };

    case 'UPDATE_LEADERBOARD':
      return {
        ...state,
        globalLeaderboard: action.payload,
      };

    case 'SET_ERROR':
      console.error('Multiplayer error:', action.payload);
      return state;

    default:
      return state;
  }
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

interface MultiplayerProviderProps {
  children: ReactNode;
}

export function MultiplayerProvider({ children }: MultiplayerProviderProps) {
  const [multiplayerState, dispatch] = useReducer(multiplayerReducer, initialMultiplayerState);
  const [socket, setSocket] = useState<any>(null);

  // Initialize socket connection
  const connect = useCallback(async (username: string) => {
    if (socket) return;

    try {
      // Dynamically import socket.io-client
      const socketModule = await getSocketIO();
      if (!socketModule || !socketModule.io) {
        throw new Error('socket.io-client not available');
      }
      
      const io = socketModule.io;
      
      // Get UUID v4 function or use fallback
      const uuidv4 = await getUUIDv4();

      const userId = typeof uuidv4 === 'function' ? uuidv4() : generateId();

      const newSocket = io(getMultiplayerServerUrl(), {
        auth: {
          username,
          userId,
        },
      });

      setSocket(newSocket as any);

    // Connection events
    newSocket.on('connect', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      newSocket.emit('user:join', { username, userId });
    });

    newSocket.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      dispatch({ type: 'CLEAR_CURRENT_USER' });
    });

    // User events
    newSocket.on('user:authenticated', (user: User) => {
      dispatch({ type: 'SET_CURRENT_USER', payload: user });
      dispatch({ type: 'ADD_ONLINE_USER', payload: user });
    });

    newSocket.on('user:list', (users: User[]) => {
      dispatch({ type: 'SET_ONLINE_USERS', payload: users });
    });

    newSocket.on('user:joined', (user: User) => {
      dispatch({ type: 'ADD_ONLINE_USER', payload: user });
    });

    newSocket.on('user:left', (leftUserId: string) => {
      dispatch({ type: 'REMOVE_ONLINE_USER', payload: leftUserId });
    });

    newSocket.on('user:presence', (presence: UserPresence) => {
      dispatch({ type: 'UPDATE_USER_PRESENCE', payload: presence });
    });

    // Room events
    newSocket.on('room:list', (rooms: MultiplayerRoom[]) => {
      dispatch({ type: 'SET_ROOMS', payload: rooms.map(normalizeRoom) });
    });

    newSocket.on('room:created', (room: MultiplayerRoom) => {
      dispatch({ type: 'UPSERT_ROOM', payload: normalizeRoom(room) });
    });

    newSocket.on('room:updated', (room: MultiplayerRoom) => {
      const normalizedRoom = normalizeRoom(room);
      dispatch({ type: 'UPSERT_ROOM', payload: normalizedRoom });
      const activeUserId = multiplayerState.currentUser?.id;
      if (!activeUserId) {
        return;
      }
      if (normalizedRoom.participants.some(user => user.id === activeUserId)) {
        dispatch({ type: 'SET_CURRENT_ROOM', payload: normalizedRoom.id });
      } else if (normalizedRoom.spectators.some(user => user.id === activeUserId)) {
        dispatch({ type: 'SET_SPECTATING_ROOM', payload: normalizedRoom.id });
      }
    });

    newSocket.on('room:closed', (roomId: string) => {
      dispatch({ type: 'REMOVE_ROOM', payload: roomId });
    });

    newSocket.on('repo:updated', (update: SharedRepositoryUpdate) => {
      dispatch({
        type: 'UPDATE_SHARED_REPOSITORY',
        payload: {
          ...update,
          updatedAt: asDate(update.updatedAt),
          ...(update.change ? { change: { ...update.change, timestamp: asDate(update.change.timestamp) } } : {}),
        },
      });
    });

    // Challenge events
    newSocket.on('challenge:received', (challenge: Challenge) => {
      const normalizedChallenge = normalizeChallenge(challenge);
      dispatch({ type: 'ADD_CHALLENGE', payload: normalizedChallenge });
      dispatch({ type: 'ADD_NOTIFICATION', payload: {
        id: generateId(),
        userId: multiplayerState.currentUser?.id || '',
        type: 'challenge',
        title: 'New Challenge',
        message: `${normalizedChallenge.challenger.username} has challenged you!`,
        read: false,
        createdAt: new Date(),
        actionUrl: `/challenge/${normalizedChallenge.id}`,
      }});
    });

    newSocket.on('challenge:accepted', (challenge: Challenge) => {
      dispatch({ type: 'UPDATE_CHALLENGE', payload: normalizeChallenge(challenge) });
    });

    newSocket.on('challenge:completed', (challenge: Challenge) => {
      dispatch({ type: 'UPDATE_CHALLENGE', payload: normalizeChallenge(challenge) });
    });

    newSocket.on('challenge:cancelled', (challenge: Challenge) => {
      dispatch({ type: 'UPDATE_CHALLENGE', payload: normalizeChallenge(challenge) });
    });

    newSocket.on('challenge:result', (result: ChallengeResult) => {
      dispatch({ type: 'ADD_CHALLENGE_RESULT', payload: normalizeChallengeResult(result) });
    });

    // Collaboration events
    newSocket.on('collaboration:created', (collaboration: LiveCollaboration) => {
      dispatch({ type: 'ADD_COLLABORATION', payload: normalizeCollaboration(collaboration) });
    });

    newSocket.on('collaboration:update', (collaboration: LiveCollaboration) => {
      dispatch({ type: 'UPDATE_COLLABORATION', payload: normalizeCollaboration(collaboration) });
    });

    // Chat events
    newSocket.on('chat:message', (message: ChatMessage) => {
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: normalizeChatMessage(message) });
    });

    // Leaderboard events
    newSocket.on('leaderboard:update', (leaderboard: LeaderboardEntry[]) => {
      dispatch({ type: 'UPDATE_LEADERBOARD', payload: leaderboard });
    });

    // Error handling
    newSocket.on('error', (error: string) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    });

    } catch (error: any) {
      console.error('Failed to connect to multiplayer server:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: 'Multiplayer features require socket.io-client. Please install dependencies: npm install socket.io-client uuid' 
      });
    }
  }, [socket, multiplayerState.currentUser]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    }
  }, [socket]);

  const updateUserPresence = useCallback((presence: Partial<UserPresence>) => {
    if (socket && multiplayerState.currentUser) {
      const fullPresence: UserPresence = {
        userId: multiplayerState.currentUser.id,
        status: presence.status || 'online',
        currentActivity: presence.currentActivity || 'Playing Git Quest',
        location: presence.location || 'terminal',
        lastSeen: new Date(),
        isAvailable: presence.isAvailable !== false,
      };
      
      socket.emit('user:presence', fullPresence);
      dispatch({ type: 'UPDATE_USER_PRESENCE', payload: fullPresence });
    }
  }, [socket, multiplayerState.currentUser]);

  const createRoom = useCallback((name: string) => {
    if (socket && multiplayerState.currentUser) {
      const room: MultiplayerRoom = {
        id: generateId(),
        name,
        ownerId: multiplayerState.currentUser.id,
        participants: [multiplayerState.currentUser],
        spectators: [],
        activeChallengeIds: [],
        collaborationIds: [],
        sharedRepository: createEmptySharedRepository(),
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      socket.emit('room:create', room);
      dispatch({ type: 'UPSERT_ROOM', payload: room });
      dispatch({ type: 'SET_CURRENT_ROOM', payload: room.id });
    }
  }, [socket, multiplayerState.currentUser]);

  const joinRoom = useCallback((roomId: string) => {
    if (socket) {
      socket.emit('room:join', roomId);
      dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });
    }
  }, [socket]);

  const leaveRoom = useCallback((roomId: string) => {
    if (socket) {
      socket.emit('room:leave', roomId);
      dispatch({ type: 'CLEAR_CURRENT_ROOM' });
      dispatch({ type: 'CLEAR_SPECTATING_ROOM' });
    }
  }, [socket]);

  const spectateRoom = useCallback((roomId: string) => {
    if (socket) {
      socket.emit('room:spectate', roomId);
      dispatch({ type: 'SET_SPECTATING_ROOM', payload: roomId });
    }
  }, [socket]);

  const stopSpectating = useCallback((roomId: string) => {
    if (socket) {
      socket.emit('room:stop-spectating', roomId);
      dispatch({ type: 'CLEAR_SPECTATING_ROOM' });
    }
  }, [socket]);

  const updateSharedRepository = useCallback((
    target: { roomId?: string; collaborationId?: string },
    repository: GitRepository,
    change?: LiveChange
  ) => {
    if (socket && multiplayerState.currentUser) {
      const update: SharedRepositoryUpdate = {
        ...target,
        repository,
        updatedBy: multiplayerState.currentUser.id,
        updatedAt: new Date(),
        ...(change ? { change } : {}),
      };

      socket.emit('repo:update', update);
      dispatch({ type: 'UPDATE_SHARED_REPOSITORY', payload: update });
    }
  }, [socket, multiplayerState.currentUser]);

  const createChallenge = useCallback((challengedUser: User, type: string, difficulty: string, roomId?: string) => {
    if (socket && multiplayerState.currentUser) {
      const challenge: Challenge = {
        id: generateId(),
        challenger: multiplayerState.currentUser,
        challenged: challengedUser,
        type: type as any,
        difficulty: difficulty as any,
        status: 'pending',
        visibility: roomId ? 'room' : 'private',
        ...(roomId ? { roomId } : {}),
        objectives: [],
        createdAt: new Date(),
      };

      socket.emit('challenge:create', challenge);
      dispatch({ type: 'ADD_CHALLENGE', payload: challenge });
    }
  }, [socket, multiplayerState.currentUser]);

  const acceptChallenge = useCallback((challengeId: string) => {
    if (socket) {
      socket.emit('challenge:accept', challengeId);
    }
  }, [socket]);

  const declineChallenge = useCallback((challengeId: string) => {
    if (socket) {
      socket.emit('challenge:decline', challengeId);
      dispatch({ type: 'REMOVE_CHALLENGE', payload: challengeId });
    }
  }, [socket]);

  const completeChallenge = useCallback((challengeId: string, score: ChallengeScore) => {
    if (socket) {
      socket.emit('challenge:complete', challengeId, score);
    }
  }, [socket]);

  const createCollaboration = useCallback((participants: User[], roomId?: string) => {
    if (socket && multiplayerState.currentUser) {
      const collaboration: LiveCollaboration = {
        id: generateId(),
        ...(roomId ? { roomId } : {}),
        participants: [multiplayerState.currentUser, ...participants],
        spectators: [],
        sharedRepository: createEmptySharedRepository(),
        activeUser: multiplayerState.currentUser.id,
        cursorPosition: { userId: multiplayerState.currentUser.id, x: 0, y: 0, timestamp: new Date() },
        liveChanges: [],
        voiceChat: false,
        screenShare: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      socket.emit('collaboration:create', collaboration);
      dispatch({ type: 'ADD_COLLABORATION', payload: collaboration });
    }
  }, [socket, multiplayerState.currentUser]);

  const joinCollaboration = useCallback((collaborationId: string) => {
    if (socket && multiplayerState.currentUser) {
      socket.emit('collaboration:join', collaborationId, multiplayerState.currentUser);
    }
  }, [socket, multiplayerState.currentUser]);

  const leaveCollaboration = useCallback((collaborationId: string) => {
    if (socket && multiplayerState.currentUser) {
      socket.emit('collaboration:leave', collaborationId, multiplayerState.currentUser.id);
    }
  }, [socket, multiplayerState.currentUser]);

  const sendLiveChange = useCallback((collaborationId: string, change: LiveChange) => {
    if (socket) {
      socket.emit('collaboration:change', collaborationId, change);
    }
  }, [socket]);

  const sendMessage = useCallback((message: string, type: string = 'text') => {
    if (socket && multiplayerState.currentUser) {
      const chatMessage: ChatMessage = {
        id: generateId(),
        userId: multiplayerState.currentUser.id,
        username: multiplayerState.currentUser.username,
        message,
        timestamp: new Date(),
        type: type as any,
      };

      socket.emit('chat:message', chatMessage);
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: chatMessage });
    }
  }, [socket, multiplayerState.currentUser]);

  const getOnlineUsers = useCallback(() => {
    return multiplayerState.onlineUsers;
  }, [multiplayerState.onlineUsers]);

  const getRooms = useCallback(() => {
    return multiplayerState.rooms;
  }, [multiplayerState.rooms]);

  const getActiveChallenges = useCallback(() => {
    return multiplayerState.activeChallenges;
  }, [multiplayerState.activeChallenges]);

  const getChallengeResults = useCallback(() => {
    return multiplayerState.challengeResults;
  }, [multiplayerState.challengeResults]);

  const getNotifications = useCallback(() => {
    return multiplayerState.notifications;
  }, [multiplayerState.notifications]);

  const markNotificationRead = useCallback((notificationId: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notificationId });
  }, []);

  // Memoize context value
  const contextValue = useMemo(() => ({
    multiplayerState,
    dispatch,
    connect,
    disconnect,
    updateUserPresence,
    createRoom,
    joinRoom,
    leaveRoom,
    spectateRoom,
    stopSpectating,
    updateSharedRepository,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    completeChallenge,
    createCollaboration,
    joinCollaboration,
    leaveCollaboration,
    sendLiveChange,
    sendMessage,
    getOnlineUsers,
    getRooms,
    getActiveChallenges,
    getChallengeResults,
    getNotifications,
    markNotificationRead,
  }), [
    multiplayerState,
    connect,
    disconnect,
    updateUserPresence,
    createRoom,
    joinRoom,
    leaveRoom,
    spectateRoom,
    stopSpectating,
    updateSharedRepository,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    completeChallenge,
    createCollaboration,
    joinCollaboration,
    leaveCollaboration,
    sendLiveChange,
    sendMessage,
    getOnlineUsers,
    getRooms,
    getActiveChallenges,
    getChallengeResults,
    getNotifications,
    markNotificationRead,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <MultiplayerContext.Provider value={contextValue}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
}
