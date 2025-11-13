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
  SocketEvents
} from '../types/multiplayer';

interface MultiplayerContextType {
  multiplayerState: MultiplayerState;
  dispatch: React.Dispatch<MultiplayerAction>;
  // Connection methods
  connect: (username: string) => void;
  disconnect: () => void;
  // User methods
  updateUserPresence: (presence: Partial<UserPresence>) => void;
  // Challenge methods
  createChallenge: (challengedUser: User, type: string, difficulty: string) => void;
  acceptChallenge: (challengeId: string) => void;
  declineChallenge: (challengeId: string) => void;
  completeChallenge: (challengeId: string, score: ChallengeScore) => void;
  // Collaboration methods
  createCollaboration: (participants: User[]) => void;
  joinCollaboration: (collaborationId: string) => void;
  leaveCollaboration: (collaborationId: string) => void;
  sendLiveChange: (collaborationId: string, change: LiveChange) => void;
  // Chat methods
  sendMessage: (message: string, type?: string) => void;
  // Utility methods
  getOnlineUsers: () => User[];
  getActiveChallenges: () => Challenge[];
  getNotifications: () => Notification[];
  markNotificationRead: (notificationId: string) => void;
}

type MultiplayerAction =
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'ADD_ONLINE_USER'; payload: User }
  | { type: 'REMOVE_ONLINE_USER'; payload: string }
  | { type: 'UPDATE_USER_PRESENCE'; payload: UserPresence }
  | { type: 'ADD_CHALLENGE'; payload: Challenge }
  | { type: 'UPDATE_CHALLENGE'; payload: Challenge }
  | { type: 'REMOVE_CHALLENGE'; payload: string }
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
  activeChallenges: [],
  liveCollaborations: [],
  globalLeaderboard: [],
  userPresence: [],
  chatMessages: [],
  notifications: [],
  currentUser: undefined,
  isConnected: false,
};

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

    case 'ADD_CHALLENGE':
      return {
        ...state,
        activeChallenges: [...state.activeChallenges, action.payload],
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

    case 'ADD_COLLABORATION':
      return {
        ...state,
        liveCollaborations: [...state.liveCollaborations, action.payload],
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

      const newSocket = io('ws://localhost:3001', {
        auth: {
          username,
          userId: typeof uuidv4 === 'function' ? uuidv4() : generateId(),
        },
      });

      setSocket(newSocket as any);

    // Connection events
    newSocket.on('connect', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
    });

    newSocket.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    });

    // User events
    newSocket.on('user:join', (user: User) => {
      dispatch({ type: 'ADD_ONLINE_USER', payload: user });
    });

    newSocket.on('user:leave', (userId: string) => {
      dispatch({ type: 'REMOVE_ONLINE_USER', payload: userId });
    });

    newSocket.on('user:presence', (presence: UserPresence) => {
      dispatch({ type: 'UPDATE_USER_PRESENCE', payload: presence });
    });

    // Challenge events
    newSocket.on('challenge:received', (challenge: Challenge) => {
      dispatch({ type: 'ADD_CHALLENGE', payload: challenge });
      dispatch({ type: 'ADD_NOTIFICATION', payload: {
        id: generateId(),
        userId: multiplayerState.currentUser?.id || '',
        type: 'challenge',
        title: 'New Challenge',
        message: `${challenge.challenger.username} has challenged you!`,
        read: false,
        createdAt: new Date(),
        actionUrl: `/challenge/${challenge.id}`,
      }});
    });

    newSocket.on('challenge:accepted', (challenge: Challenge) => {
      dispatch({ type: 'UPDATE_CHALLENGE', payload: challenge });
    });

    newSocket.on('challenge:completed', (challenge: Challenge) => {
      dispatch({ type: 'UPDATE_CHALLENGE', payload: challenge });
    });

    // Collaboration events
    newSocket.on('collaboration:created', (collaboration: LiveCollaboration) => {
      dispatch({ type: 'ADD_COLLABORATION', payload: collaboration });
    });

    newSocket.on('collaboration:update', (collaboration: LiveCollaboration) => {
      dispatch({ type: 'UPDATE_COLLABORATION', payload: collaboration });
    });

    // Chat events
    newSocket.on('chat:message', (message: ChatMessage) => {
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message });
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

  const createChallenge = useCallback((challengedUser: User, type: string, difficulty: string) => {
    if (socket && multiplayerState.currentUser) {
      const challenge: Challenge = {
        id: generateId(),
        challenger: multiplayerState.currentUser,
        challenged: challengedUser,
        type: type as any,
        difficulty: difficulty as any,
        status: 'pending',
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

  const createCollaboration = useCallback((participants: User[]) => {
    if (socket && multiplayerState.currentUser) {
      const collaboration: LiveCollaboration = {
        id: generateId(),
        participants: [multiplayerState.currentUser, ...participants],
        sharedRepository: {
          initialized: false,
          files: [],
          branches: [],
          currentBranch: '',
          commits: [],
          config: {},
          workingDirectory: '/shared-project',
        },
        activeUser: multiplayerState.currentUser.id,
        cursorPosition: { userId: multiplayerState.currentUser.id, x: 0, y: 0, timestamp: new Date() },
        liveChanges: [],
        voiceChat: false,
        screenShare: false,
        createdAt: new Date(),
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

  const getActiveChallenges = useCallback(() => {
    return multiplayerState.activeChallenges;
  }, [multiplayerState.activeChallenges]);

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
    getActiveChallenges,
    getNotifications,
    markNotificationRead,
  }), [
    multiplayerState,
    connect,
    disconnect,
    updateUserPresence,
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
    getActiveChallenges,
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
