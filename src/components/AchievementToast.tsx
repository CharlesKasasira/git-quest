import { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

function AchievementToast() {
  const { gameState, clearLastUnlockedAchievement } = useGame();
  const [visible, setVisible] = useState(false);

  const achievement = useMemo(
    () =>
      gameState.achievements.find(
        (item) => item.id === gameState.lastUnlockedAchievementId
      ),
    [gameState.achievements, gameState.lastUnlockedAchievementId]
  );

  useEffect(() => {
    if (!achievement) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      clearLastUnlockedAchievement();
    }, 3800);

    return () => window.clearTimeout(hideTimer);
  }, [achievement, clearLastUnlockedAchievement]);

  if (!achievement || !visible) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 animate-pulse">
      <div className="bg-black border-2 border-terminal-warning rounded-lg p-4 min-w-72 shadow-lg shadow-terminal-warning/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-terminal-warning/20 border border-terminal-warning flex items-center justify-center">
            <Trophy className="w-5 h-5 text-terminal-warning" />
          </div>
          <div>
            <p className="text-xs text-terminal-secondary">Achievement Unlocked</p>
            <p className="text-terminal-warning font-mono text-sm">
              {achievement.icon} {achievement.title}
            </p>
            <p className="text-xs text-terminal-text mt-0.5">{achievement.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AchievementToast;
