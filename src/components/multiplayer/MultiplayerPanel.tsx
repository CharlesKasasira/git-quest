import React, { memo, useState, useCallback, useEffect } from 'react';
import { useMultiplayer } from '../../contexts/MultiplayerContext';
import MultiplayerDashboard from './MultiplayerDashboard';
import ChallengeModal from './ChallengeModal';
import { User } from '../../types/multiplayer';
import { 
  Users, 
  Wifi, 
  WifiOff, 
  Settings, 
  X,
  Plus,
  Bell,
  MessageSquare
} from 'lucide-react';

interface MultiplayerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const MultiplayerPanel: React.FC<MultiplayerPanelProps> = memo(function MultiplayerPanel({
  isOpen,
  onClose,
  className = ''
}) {
  const { 
    multiplayerState, 
    connect, 
    disconnect, 
    updateUserPresence,
    getOnlineUsers,
    getNotifications
  } = useMultiplayer();
  
  const [username, setUsername] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  // Auto-connect if username is stored
  useEffect(() => {
    const storedUsername = localStorage.getItem('git-quest-username');
    if (storedUsername && !multiplayerState.currentUser) {
      setUsername(storedUsername);
      connect(storedUsername);
    } else if (!storedUsername && !multiplayerState.currentUser) {
      setShowUsernameModal(true);
    }
  }, [connect, multiplayerState.currentUser]);

  const handleConnect = useCallback((username: string) => {
    if (username.trim()) {
      localStorage.setItem('git-quest-username', username.trim());
      connect(username.trim());
      setShowUsernameModal(false);
    }
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    localStorage.removeItem('git-quest-username');
    setUsername('');
  }, [disconnect]);

  const handleUserSelect = useCallback((user: User) => {
    setSelectedUser(user);
    setShowChallengeModal(true);
  }, []);

  const handleChallengeClose = useCallback(() => {
    setShowChallengeModal(false);
    setSelectedUser(null);
  }, []);

  const onlineUsers = getOnlineUsers();
  const notifications = getNotifications();
  const unreadNotifications = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-full max-h-[90vh] bg-terminal-bg border-2 border-terminal-primary rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-terminal-primary bg-terminal-bg">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-terminal-primary" />
            <h2 className="text-xl font-pixel text-terminal-primary">Multiplayer Hub</h2>
            <div className="flex items-center space-x-2">
              {multiplayerState.isConnected ? (
                <div className="flex items-center space-x-1 text-terminal-primary">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-mono">Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-terminal-error">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm font-mono">Disconnected</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadNotifications > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-terminal-warning" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-terminal-error rounded-full flex items-center justify-center">
                  <span className="text-xs text-black font-mono">{unreadNotifications}</span>
                </div>
              </div>
            )}
            <button className="p-2 text-terminal-secondary hover:text-terminal-primary transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-terminal-secondary hover:text-terminal-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!multiplayerState.isConnected ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <WifiOff className="w-16 h-16 text-terminal-secondary mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-mono text-terminal-primary mb-2">Not Connected</h3>
                <p className="text-terminal-secondary mb-4">
                  Connect to the multiplayer server to challenge other players
                </p>
                <button
                  onClick={() => setShowUsernameModal(true)}
                  className="px-6 py-2 bg-terminal-primary text-black rounded border border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-80 transition-all"
                >
                  Connect
                </button>
              </div>
            </div>
          ) : (
            <MultiplayerDashboard 
              onUserSelect={handleUserSelect}
              onDisconnect={handleDisconnect}
            />
          )}
        </div>

        {/* Username Modal */}
        {showUsernameModal && (
          <div className="fixed inset-0 z-60 bg-black bg-opacity-75 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-terminal-bg border-2 border-terminal-primary rounded-lg p-6">
              <h3 className="text-lg font-pixel text-terminal-primary mb-4">Enter Username</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-terminal-secondary text-sm mb-2">
                    Choose your multiplayer username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username..."
                    className="w-full px-3 py-2 bg-transparent border border-terminal-secondary rounded text-terminal-text placeholder-terminal-secondary focus:border-terminal-primary focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleConnect(username);
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowUsernameModal(false)}
                    className="px-4 py-2 border border-terminal-secondary text-terminal-secondary rounded hover:bg-terminal-secondary hover:bg-opacity-10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConnect(username)}
                    disabled={!username.trim()}
                    className="px-6 py-2 bg-terminal-primary text-black rounded border border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Challenge Modal */}
        {showChallengeModal && selectedUser && (
          <ChallengeModal
            isOpen={showChallengeModal}
            onClose={handleChallengeClose}
            challengedUser={selectedUser}
          />
        )}
      </div>
    </div>
  );
});

export default MultiplayerPanel;

