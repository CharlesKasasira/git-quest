import React, { memo, useState, useCallback, useMemo } from 'react';
import { useMultiplayer } from '../../contexts/MultiplayerContext';
import { User } from '../../types/multiplayer';
import { 
  Users, 
  Trophy, 
  MessageSquare, 
  Bell, 
  Plus, 
  Play, 
  Pause, 
  Settings,
  Crown,
  Star,
  Target,
  Users2,
  Zap,
  DoorOpen,
  Eye,
  LogOut,
  GitBranch,
  ClipboardCheck
} from 'lucide-react';

interface MultiplayerDashboardProps {
  className?: string;
  onUserSelect?: (user: User) => void;
  onDisconnect?: () => void;
}

const MultiplayerDashboard: React.FC<MultiplayerDashboardProps> = memo(function MultiplayerDashboard({
  className = '',
  onUserSelect,
  onDisconnect
}) {
  const { 
    multiplayerState, 
    createRoom,
    joinRoom,
    leaveRoom,
    spectateRoom,
    stopSpectating,
    createChallenge, 
    createCollaboration,
    sendMessage,
    getRooms,
    getOnlineUsers,
    getActiveChallenges,
    getChallengeResults,
    getNotifications
  } = useMultiplayer();
  
  const [activeTab, setActiveTab] = useState<'rooms' | 'users' | 'challenges' | 'collaborations' | 'chat' | 'leaderboard' | 'results'>('rooms');
  const [chatMessage, setChatMessage] = useState('');
  const [roomName, setRoomName] = useState('');

  const rooms = useMemo(() => getRooms(), [getRooms]);
  const onlineUsers = useMemo(() => getOnlineUsers(), [getOnlineUsers]);
  const activeChallenges = useMemo(() => getActiveChallenges(), [getActiveChallenges]);
  const challengeResults = useMemo(() => getChallengeResults(), [getChallengeResults]);
  const notifications = useMemo(() => getNotifications(), [getNotifications]);
  const currentRoom = useMemo(
    () => rooms.find(room => room.id === multiplayerState.currentRoomId),
    [rooms, multiplayerState.currentRoomId]
  );
  const spectatingRoom = useMemo(
    () => rooms.find(room => room.id === multiplayerState.spectatingRoomId),
    [rooms, multiplayerState.spectatingRoomId]
  );

  const handleUserSelect = useCallback((user: User) => {
    onUserSelect?.(user);
  }, [onUserSelect]);

  const handleCreateChallenge = useCallback((user: User, type: string, difficulty: string) => {
    createChallenge(user, type, difficulty, multiplayerState.currentRoomId);
  }, [createChallenge, multiplayerState.currentRoomId]);

  const handleCreateCollaboration = useCallback((users: User[]) => {
    createCollaboration(users, multiplayerState.currentRoomId);
  }, [createCollaboration, multiplayerState.currentRoomId]);

  const handleCreateRoom = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    const fallbackName = multiplayerState.currentUser
      ? `${multiplayerState.currentUser.username}'s room`
      : 'Git room';
    createRoom(roomName.trim() || fallbackName);
    setRoomName('');
  }, [createRoom, multiplayerState.currentUser, roomName]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendMessage(chatMessage.trim());
      setChatMessage('');
    }
  }, [chatMessage, sendMessage]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'online': return 'text-terminal-primary';
      case 'busy': return 'text-terminal-warning';
      case 'away': return 'text-terminal-secondary';
      case 'in-challenge': return 'text-terminal-error';
      case 'mentoring': return 'text-terminal-primary';
      default: return 'text-terminal-secondary';
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'online': return <Play className="w-3 h-3" />;
      case 'busy': return <Pause className="w-3 h-3" />;
      case 'away': return <Pause className="w-3 h-3" />;
      case 'in-challenge': return <Target className="w-3 h-3" />;
      case 'mentoring': return <Crown className="w-3 h-3" />;
      default: return <Pause className="w-3 h-3" />;
    }
  }, []);

  return (
    <div className={`multiplayer-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-terminal-primary bg-terminal-bg">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-terminal-primary" />
          <h2 className="text-xl font-pixel text-terminal-primary">Multiplayer Hub</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          {(currentRoom || spectatingRoom) && (
            <div className="hidden md:flex items-center space-x-1 text-sm text-terminal-secondary">
              {spectatingRoom ? <Eye className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
              <span>{spectatingRoom?.name || currentRoom?.name}</span>
            </div>
          )}
          <div className="flex items-center space-x-1 text-sm text-terminal-secondary">
            <div className="w-2 h-2 bg-terminal-primary rounded-full animate-pulse"></div>
            <span>{onlineUsers.length} online</span>
          </div>
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="p-2 text-terminal-secondary hover:text-terminal-error transition-colors"
              title="Disconnect"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
          <button className="p-2 text-terminal-secondary hover:text-terminal-primary transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-terminal-primary bg-terminal-bg">
        {[
          { id: 'rooms', label: 'Rooms', icon: DoorOpen },
          { id: 'users', label: 'Online Users', icon: Users },
          { id: 'challenges', label: 'Challenges', icon: Target },
          { id: 'collaborations', label: 'Collaborations', icon: Users2 },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          { id: 'results', label: 'Results', icon: ClipboardCheck },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-terminal-primary text-terminal-primary bg-terminal-primary bg-opacity-10'
                : 'border-transparent text-terminal-secondary hover:text-terminal-primary hover:bg-terminal-secondary hover:bg-opacity-10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="text-sm font-mono">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto max-h-96">
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-mono text-terminal-primary">Rooms</h3>
              <span className="text-sm text-terminal-secondary">{rooms.length} open</span>
            </div>

            <form onSubmit={handleCreateRoom} className="flex items-center space-x-2">
              <input
                type="text"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Room name"
                className="flex-1 px-3 py-2 bg-transparent border border-terminal-secondary rounded text-terminal-text placeholder-terminal-secondary focus:border-terminal-primary focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center space-x-2 px-3 py-2 bg-terminal-primary text-black rounded border border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-80 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-mono">Create</span>
              </button>
            </form>

            {rooms.length === 0 ? (
              <div className="text-center text-terminal-secondary py-8">
                <DoorOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No rooms yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rooms.map((room) => {
                  const isParticipant = room.id === multiplayerState.currentRoomId;
                  const isSpectator = room.id === multiplayerState.spectatingRoomId;

                  return (
                    <div
                      key={room.id}
                      className={`p-4 border rounded transition-all ${
                        isParticipant || isSpectator
                          ? 'border-terminal-primary bg-terminal-primary bg-opacity-5'
                          : 'border-terminal-secondary hover:border-terminal-primary'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <DoorOpen className="w-4 h-4 text-terminal-primary" />
                            <span className="text-terminal-primary font-mono">{room.name}</span>
                          </div>
                          <div className="text-xs text-terminal-secondary mt-1">
                            {room.status} • {room.participants.length} players • {room.spectators.length} spectators
                          </div>
                        </div>
                        {(isParticipant || isSpectator) && (
                          <span className="text-xs px-2 py-1 rounded bg-terminal-primary text-black">
                            {isSpectator ? 'spectating' : 'joined'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-terminal-secondary mb-3">
                        <div className="flex items-center space-x-1">
                          <Target className="w-3 h-3" />
                          <span>{room.activeChallengeIds.length} challenges</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <GitBranch className="w-3 h-3" />
                          <span>{room.sharedRepository.commits.length} commits</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isParticipant || isSpectator ? (
                          <button
                            onClick={() => isSpectator ? stopSpectating(room.id) : leaveRoom(room.id)}
                            className="flex items-center space-x-1 px-3 py-1 border border-terminal-secondary text-terminal-secondary rounded hover:text-terminal-primary hover:border-terminal-primary transition-all"
                          >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-mono">Leave</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => joinRoom(room.id)}
                              className="flex items-center space-x-1 px-3 py-1 bg-terminal-primary text-black rounded border border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-80 transition-all"
                            >
                              <Users2 className="w-4 h-4" />
                              <span className="text-sm font-mono">Join</span>
                            </button>
                            <button
                              onClick={() => spectateRoom(room.id)}
                              className="flex items-center space-x-1 px-3 py-1 border border-terminal-secondary text-terminal-secondary rounded hover:text-terminal-primary hover:border-terminal-primary transition-all"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="text-sm font-mono">Spectate</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-terminal-primary">Online Users</h3>
              <span className="text-sm text-terminal-secondary">{onlineUsers.length} users</span>
            </div>
            
            {onlineUsers.length === 0 ? (
              <div className="text-center text-terminal-secondary py-8">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users online</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {onlineUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-3 border border-terminal-secondary rounded hover:border-terminal-primary transition-all cursor-pointer"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="w-10 h-10 bg-terminal-primary bg-opacity-20 rounded-full flex items-center justify-center">
                      <span className="text-terminal-primary font-mono text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-terminal-text font-mono truncate">{user.username}</span>
                        <div className={`flex items-center space-x-1 ${getStatusColor('online')}`}>
                          {getStatusIcon('online')}
                        </div>
                      </div>
                      <div className="text-xs text-terminal-secondary">
                        Level {user.currentLevel} • {user.experience} XP
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateChallenge(user, 'speed', 'beginner');
                        }}
                        className="p-1 text-terminal-primary hover:bg-terminal-primary hover:bg-opacity-20 rounded transition-all"
                        title="Challenge"
                      >
                        <Target className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateCollaboration([user]);
                        }}
                        className="p-1 text-terminal-secondary hover:bg-terminal-secondary hover:bg-opacity-20 rounded transition-all"
                        title="Collaborate"
                      >
                        <Users2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-terminal-primary">Active Challenges</h3>
              <button className="flex items-center space-x-2 px-3 py-1 bg-terminal-primary text-black rounded border border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-80 transition-all">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-mono">Create Challenge</span>
              </button>
            </div>
            
            {activeChallenges.length === 0 ? (
              <div className="text-center text-terminal-secondary py-8">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active challenges</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeChallenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="p-4 border border-terminal-primary rounded bg-terminal-primary bg-opacity-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-terminal-primary font-mono">{challenge.type}</span>
                        <span className="text-terminal-secondary text-sm">•</span>
                        <span className="text-terminal-secondary text-sm">{challenge.difficulty}</span>
                        <span className="text-terminal-secondary text-sm">•</span>
                        <span className="text-terminal-secondary text-sm">{challenge.visibility || 'private'}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        challenge.status === 'active' ? 'bg-terminal-primary text-black' :
                        challenge.status === 'pending' ? 'bg-terminal-warning text-black' :
                        'bg-terminal-secondary text-black'
                      }`}>
                        {challenge.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-terminal-text">
                      <span className="text-terminal-primary">{challenge.challenger.username}</span>
                      <span className="text-terminal-secondary"> vs </span>
                      <span className="text-terminal-primary">{challenge.challenged.username}</span>
                    </div>
                    
                    <div className="text-xs text-terminal-secondary mt-1">
                      Created {challenge.createdAt.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'collaborations' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-terminal-primary">Live Collaborations</h3>
              <button className="flex items-center space-x-2 px-3 py-1 bg-terminal-primary text-black rounded border border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-80 transition-all">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-mono">Start Collaboration</span>
              </button>
            </div>
            
            {multiplayerState.liveCollaborations.length === 0 ? (
              <div className="text-center text-terminal-secondary py-8">
                <Users2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active collaborations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {multiplayerState.liveCollaborations.map((collaboration) => (
                  <div
                    key={collaboration.id}
                    className="p-4 border border-terminal-secondary rounded hover:border-terminal-primary transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Users2 className="w-4 h-4 text-terminal-primary" />
                        <span className="text-terminal-primary font-mono">Collaboration</span>
                      </div>
                      <span className="text-xs text-terminal-secondary">
                        {collaboration.participants.length} participants
                      </span>
                    </div>
                    
                    <div className="text-sm text-terminal-text">
                      {collaboration.participants.map(p => p.username).join(', ')}
                    </div>
                    
                    <div className="text-xs text-terminal-secondary mt-1">
                      Started {collaboration.createdAt.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-terminal-primary">Global Chat</h3>
              <span className="text-sm text-terminal-secondary">
                {multiplayerState.chatMessages.length} messages
              </span>
            </div>
            
            <div className="bg-black border border-terminal-primary rounded p-4 max-h-64 overflow-y-auto">
              {multiplayerState.chatMessages.length === 0 ? (
                <div className="text-center text-terminal-secondary py-4">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {multiplayerState.chatMessages.map((message) => (
                    <div key={message.id} className="flex items-start space-x-2">
                      <div className="w-6 h-6 bg-terminal-primary bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-terminal-primary text-xs font-mono">
                          {message.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-terminal-primary text-sm font-mono">{message.username}</span>
                          <span className="text-terminal-secondary text-xs">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-terminal-text text-sm">{message.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-transparent border border-terminal-secondary rounded text-terminal-text placeholder-terminal-secondary focus:border-terminal-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim()}
                className="px-4 py-2 bg-terminal-primary text-black rounded border border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-terminal-primary">Global Leaderboard</h3>
              <div className="flex items-center space-x-2 text-sm text-terminal-secondary">
                <Trophy className="w-4 h-4" />
                <span>Top Players</span>
              </div>
            </div>
            
            {multiplayerState.globalLeaderboard.length === 0 ? (
              <div className="text-center text-terminal-secondary py-8">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No leaderboard data</p>
              </div>
            ) : (
              <div className="space-y-2">
                {multiplayerState.globalLeaderboard.map((entry, index) => (
                  <div
                    key={entry.user.id}
                    className="flex items-center space-x-3 p-3 border border-terminal-secondary rounded hover:border-terminal-primary transition-all"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-terminal-primary bg-opacity-20 rounded-full">
                      <span className="text-terminal-primary font-mono text-sm">
                        {index + 1}
                      </span>
                    </div>
                    
                    <div className="w-8 h-8 bg-terminal-secondary bg-opacity-20 rounded-full flex items-center justify-center">
                      <span className="text-terminal-secondary text-xs font-mono">
                        {entry.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-terminal-text font-mono">{entry.user.username}</div>
                      <div className="text-xs text-terminal-secondary">
                        Level {entry.level} • {entry.score} points
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-terminal-secondary">
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3" />
                        <span>{entry.achievements}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Zap className="w-3 h-3" />
                        <span>{Math.round(entry.winRate * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-terminal-primary">Challenge Results</h3>
              <span className="text-sm text-terminal-secondary">{challengeResults.length} completed</span>
            </div>

            {challengeResults.length === 0 ? (
              <div className="text-center text-terminal-secondary py-8">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No completed challenges</p>
              </div>
            ) : (
              <div className="space-y-3">
                {challengeResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 border border-terminal-secondary rounded hover:border-terminal-primary transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <ClipboardCheck className="w-4 h-4 text-terminal-primary" />
                        <span className="text-terminal-primary font-mono">
                          {result.winner ? `${result.winner.username} won` : 'Draw'}
                        </span>
                      </div>
                      <span className="text-xs text-terminal-secondary">
                        {result.completedAt.toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-sm text-terminal-text mb-2">{result.summary}</div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-terminal-secondary">
                      <div>{result.challenger.username}: {result.score.challenger}</div>
                      <div>{result.challenged.username}: {result.score.challenged}</div>
                      <div>{result.score.commandsExecuted} commands</div>
                      <div>{result.score.errors} errors</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="p-4 border-t border-terminal-primary bg-terminal-bg">
          <div className="flex items-center space-x-2 mb-2">
            <Bell className="w-4 h-4 text-terminal-warning" />
            <span className="text-terminal-warning font-mono text-sm">Notifications</span>
          </div>
          <div className="space-y-1">
            {notifications.slice(0, 3).map((notification) => (
              <div key={notification.id} className="text-xs text-terminal-text">
                {notification.title}: {notification.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default MultiplayerDashboard;
