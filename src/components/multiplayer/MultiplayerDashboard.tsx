import React, { memo, useState, useCallback, useMemo } from 'react';
import { useMultiplayer } from '../../contexts/MultiplayerContext';
import { User, Challenge, LiveCollaboration } from '../../types/multiplayer';
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
  Zap
} from 'lucide-react';

interface MultiplayerDashboardProps {
  className?: string;
}

const MultiplayerDashboard: React.FC<MultiplayerDashboardProps> = memo(function MultiplayerDashboard({
  className = ''
}) {
  const { 
    multiplayerState, 
    createChallenge, 
    createCollaboration,
    sendMessage,
    getOnlineUsers,
    getActiveChallenges,
    getNotifications
  } = useMultiplayer();
  
  const [activeTab, setActiveTab] = useState<'users' | 'challenges' | 'collaborations' | 'chat' | 'leaderboard'>('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [chatMessage, setChatMessage] = useState('');

  const onlineUsers = useMemo(() => getOnlineUsers(), [getOnlineUsers]);
  const activeChallenges = useMemo(() => getActiveChallenges(), [getActiveChallenges]);
  const notifications = useMemo(() => getNotifications(), [getNotifications]);

  const handleUserSelect = useCallback((user: User) => {
    setSelectedUser(user);
  }, []);

  const handleCreateChallenge = useCallback((user: User, type: string, difficulty: string) => {
    createChallenge(user, type, difficulty);
    setSelectedUser(null);
  }, [createChallenge]);

  const handleCreateCollaboration = useCallback((users: User[]) => {
    createCollaboration(users);
  }, [createCollaboration]);

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
          <div className="flex items-center space-x-1 text-sm text-terminal-secondary">
            <div className="w-2 h-2 bg-terminal-primary rounded-full animate-pulse"></div>
            <span>{onlineUsers.length} online</span>
          </div>
          <button className="p-2 text-terminal-secondary hover:text-terminal-primary transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-terminal-primary bg-terminal-bg">
        {[
          { id: 'users', label: 'Online Users', icon: Users },
          { id: 'challenges', label: 'Challenges', icon: Target },
          { id: 'collaborations', label: 'Collaborations', icon: Users2 },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
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

