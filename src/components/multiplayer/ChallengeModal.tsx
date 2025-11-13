import React, { memo, useState, useCallback } from 'react';
import { useMultiplayer } from '../../contexts/MultiplayerContext';
import { User } from '../../types/multiplayer';
import { 
  X, 
  Target, 
  Zap, 
  Users, 
  Crown, 
  Clock,
  Trophy,
  Star
} from 'lucide-react';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengedUser: User;
  className?: string;
}

const ChallengeModal: React.FC<ChallengeModalProps> = memo(function ChallengeModal({
  isOpen,
  onClose,
  challengedUser,
  className = ''
}) {
  const { createChallenge } = useMultiplayer();
  const [selectedType, setSelectedType] = useState<string>('speed');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('beginner');

  const challengeTypes = [
    {
      id: 'speed',
      name: 'Speed Challenge',
      description: 'Complete Git tasks as fast as possible',
      icon: Zap,
      color: 'text-terminal-primary',
      objectives: [
        'Complete 10 Git commands in under 2 minutes',
        'Create and merge 5 branches as fast as possible',
        'Make 20 commits with meaningful messages'
      ]
    },
    {
      id: 'accuracy',
      name: 'Accuracy Challenge',
      description: 'Execute Git commands with perfect precision',
      icon: Target,
      color: 'text-terminal-secondary',
      objectives: [
        'Execute Git workflow with zero errors',
        'Write perfect commit messages',
        'Implement complex branching strategy'
      ]
    },
    {
      id: 'collaboration',
      name: 'Collaboration Challenge',
      description: 'Work together on complex Git workflows',
      icon: Users,
      color: 'text-terminal-warning',
      objectives: [
        'Resolve complex merge conflicts together',
        'Develop feature across multiple branches',
        'Review and improve Git practices'
      ]
    },
    {
      id: 'mentoring',
      name: 'Mentoring Challenge',
      description: 'Guide and teach Git concepts',
      icon: Crown,
      color: 'text-terminal-primary',
      objectives: [
        'Guide beginner through Git basics',
        'Help resolve Git conflicts',
        'Teach advanced Git concepts'
      ]
    }
  ];

  const difficulties = [
    {
      id: 'beginner',
      name: 'Beginner',
      description: 'Perfect for learning the basics',
      color: 'text-terminal-primary',
      timeLimit: 10
    },
    {
      id: 'intermediate',
      name: 'Intermediate',
      description: 'For those with some Git experience',
      color: 'text-terminal-warning',
      timeLimit: 5
    },
    {
      id: 'advanced',
      name: 'Advanced',
      description: 'For Git experts and power users',
      color: 'text-terminal-error',
      timeLimit: 3
    }
  ];

  const handleCreateChallenge = useCallback(() => {
    createChallenge(challengedUser, selectedType, selectedDifficulty);
    onClose();
  }, [challengedUser, selectedType, selectedDifficulty, createChallenge, onClose]);

  const selectedChallengeType = challengeTypes.find(t => t.id === selectedType);
  const selectedDifficultyInfo = difficulties.find(d => d.id === selectedDifficulty);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-terminal-bg border-2 border-terminal-primary rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-terminal-primary bg-terminal-bg">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6 text-terminal-primary" />
            <h2 className="text-xl font-pixel text-terminal-primary">Create Challenge</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-terminal-secondary hover:text-terminal-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Challenged User */}
          <div className="flex items-center space-x-3 p-3 bg-terminal-primary bg-opacity-10 rounded border border-terminal-primary">
            <div className="w-10 h-10 bg-terminal-primary bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-terminal-primary font-mono text-sm">
                {challengedUser.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-terminal-primary font-mono">{challengedUser.username}</div>
              <div className="text-xs text-terminal-secondary">
                Level {challengedUser.currentLevel} • {challengedUser.experience} XP
              </div>
            </div>
          </div>

          {/* Challenge Type Selection */}
          <div>
            <h3 className="text-terminal-primary font-mono mb-3">Challenge Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {challengeTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded border transition-all text-left ${
                      selectedType === type.id
                        ? 'border-terminal-primary bg-terminal-primary bg-opacity-20'
                        : 'border-terminal-secondary hover:border-terminal-primary hover:bg-terminal-secondary hover:bg-opacity-10'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Icon className={`w-5 h-5 ${type.color}`} />
                      <span className="text-terminal-text font-mono">{type.name}</span>
                    </div>
                    <div className="text-xs text-terminal-secondary">{type.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div>
            <h3 className="text-terminal-primary font-mono mb-3">Difficulty</h3>
            <div className="grid grid-cols-3 gap-3">
              {difficulties.map((difficulty) => (
                <button
                  key={difficulty.id}
                  onClick={() => setSelectedDifficulty(difficulty.id)}
                  className={`p-3 rounded border transition-all text-center ${
                    selectedDifficulty === difficulty.id
                      ? 'border-terminal-primary bg-terminal-primary bg-opacity-20'
                      : 'border-terminal-secondary hover:border-terminal-primary hover:bg-terminal-secondary hover:bg-opacity-10'
                    }`}
                >
                  <div className={`font-mono mb-1 ${difficulty.color}`}>{difficulty.name}</div>
                  <div className="text-xs text-terminal-secondary">{difficulty.description}</div>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    <Clock className="w-3 h-3 text-terminal-secondary" />
                    <span className="text-xs text-terminal-secondary">{difficulty.timeLimit} min</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Challenge Details */}
          {selectedChallengeType && (
            <div className="p-4 bg-black border border-terminal-primary rounded">
              <h4 className="text-terminal-primary font-mono mb-2">Challenge Details</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <selectedChallengeType.icon className={`w-4 h-4 ${selectedChallengeType.color}`} />
                  <span className="text-terminal-text">{selectedChallengeType.name}</span>
                </div>
                <div className="text-sm text-terminal-secondary">
                  {selectedChallengeType.description}
                </div>
                <div className="text-xs text-terminal-secondary">
                  <strong>Objectives:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {selectedChallengeType.objectives.map((objective, index) => (
                      <li key={index}>{objective}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Rewards */}
          <div className="p-4 bg-terminal-bg border border-terminal-secondary rounded">
            <h4 className="text-terminal-primary font-mono mb-2">Rewards</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center space-y-1">
                <Trophy className="w-5 h-5 text-terminal-warning" />
                <span className="text-xs text-terminal-secondary">Winner</span>
                <span className="text-sm text-terminal-warning font-mono">+100 XP</span>
              </div>
              <div className="flex flex-col items-center space-y-1">
                <Star className="w-5 h-5 text-terminal-primary" />
                <span className="text-xs text-terminal-secondary">Participation</span>
                <span className="text-sm text-terminal-primary font-mono">+50 XP</span>
              </div>
              <div className="flex flex-col items-center space-y-1">
                <Target className="w-5 h-5 text-terminal-secondary" />
                <span className="text-xs text-terminal-secondary">Achievement</span>
                <span className="text-sm text-terminal-secondary font-mono">+1 Badge</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t-2 border-terminal-primary bg-terminal-bg">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-terminal-secondary text-terminal-secondary rounded hover:bg-terminal-secondary hover:bg-opacity-10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateChallenge}
            className="px-6 py-2 bg-terminal-primary text-black rounded border border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-80 transition-all"
          >
            Create Challenge
          </button>
        </div>
      </div>
    </div>
  );
});

export default ChallengeModal;

