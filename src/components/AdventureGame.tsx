import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileCode2,
  Gamepad2,
  Keyboard,
  LockKeyhole,
  Monitor,
  Play,
  Power,
  Radar,
  RotateCcw,
  Sparkles,
  Terminal,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { useTerminal } from '../contexts/TerminalContext';
import { getStoryChapter } from '../data/storyChapters';
import { useChiptuneMusic } from '../hooks/useChiptuneMusic';
import { LevelManager } from '../utils/levelManager';
import AchievementToast from './AchievementToast';

type Direction = 'up' | 'down' | 'left' | 'right';

interface AdventureGameProps {
  view: 'home' | 'game';
  onStartGame: () => void;
  onOpenClassic: () => void;
  onGoHome: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface DataShard extends Position {
  id: number;
  label: string;
}

interface SavedAdventureState {
  chapterId: number;
  player: Position;
  direction: Direction;
  hasMetNova: boolean;
  collectedShards: number[];
  dialogue: string | null;
  notice: string;
  terminalOpen: boolean;
  terminalInput: string;
  showCommandHelp: boolean;
  missionComplete: boolean;
  hasStarted: boolean;
}

const ADVENTURE_STORAGE_KEY = 'git-quest-adventure-state';
const DEFAULT_NOTICE = 'Find NOVA and press E to interact.';

const COLS = 16;
const ROWS = 9;
const START_POSITION: Position = { x: 8, y: 7 };
const NOVA_POSITION: Position = { x: 8, y: 5 };
const TERMINAL_POSITION: Position = { x: 13, y: 2 };

const DATA_SHARDS: DataShard[] = [
  { id: 1, x: 3, y: 2, label: 'origin.log' },
  { id: 2, x: 11, y: 6, label: 'timeline.dat' },
  { id: 3, x: 4, y: 7, label: 'memory.txt' },
];

const isNear = (a: Position, b: Position) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 1;

const positionStyle = (position: Position) => ({
  left: `${((position.x + 0.5) / COLS) * 100}%`,
  top: `${((position.y + 0.5) / ROWS) * 100}%`,
});

const loadAdventureState = (): SavedAdventureState | null => {
  try {
    const saved = window.localStorage.getItem(ADVENTURE_STORAGE_KEY);
    if (!saved) return null;
    const raw = JSON.parse(saved) as Partial<SavedAdventureState>;
    const player = raw.player;
    const direction = raw.direction;

    return {
      player:
        player && Number.isFinite(player.x) && Number.isFinite(player.y)
          ? {
              x: Math.max(1, Math.min(COLS - 2, player.x)),
              y: Math.max(1, Math.min(ROWS - 2, player.y)),
            }
          : START_POSITION,
      direction: ['up', 'down', 'left', 'right'].includes(direction ?? '')
        ? (direction as Direction)
        : 'up',
      chapterId: Number.isInteger(raw.chapterId) && Number(raw.chapterId) >= 1 && Number(raw.chapterId) <= 5
        ? Number(raw.chapterId)
        : 1,
      hasMetNova: Boolean(raw.hasMetNova),
      collectedShards: Array.isArray(raw.collectedShards)
        ? raw.collectedShards.filter((id) => DATA_SHARDS.some((shard) => shard.id === id))
        : [],
      dialogue: typeof raw.dialogue === 'string' ? raw.dialogue : null,
      notice: typeof raw.notice === 'string' ? raw.notice : DEFAULT_NOTICE,
      terminalOpen: Boolean(raw.terminalOpen),
      terminalInput: typeof raw.terminalInput === 'string' ? raw.terminalInput : '',
      showCommandHelp: Boolean(raw.showCommandHelp),
      missionComplete: Boolean(raw.missionComplete),
      hasStarted: Boolean(raw.hasStarted),
    };
  } catch {
    return null;
  }
};

function AdventureGame({ view, onStartGame, onOpenClassic, onGoHome }: AdventureGameProps) {
  const { gameState, startLevel, completeLevel, resetProgress } = useGame();
  const { terminalState, executeCommand, resetTerminal } = useTerminal();
  const { enabled: musicEnabled, playing: musicPlaying, start: startMusic, toggle: toggleMusic } = useChiptuneMusic();
  const [savedAdventure] = useState(loadAdventureState);
  const [chapterId, setChapterId] = useState(savedAdventure?.chapterId ?? 1);
  const [player, setPlayer] = useState<Position>(savedAdventure?.player ?? START_POSITION);
  const [direction, setDirection] = useState<Direction>(savedAdventure?.direction ?? 'up');
  const [hasMetNova, setHasMetNova] = useState(savedAdventure?.hasMetNova ?? false);
  const [collectedShards, setCollectedShards] = useState<number[]>(savedAdventure?.collectedShards ?? []);
  const [dialogue, setDialogue] = useState<string | null>(savedAdventure?.dialogue ?? null);
  const [notice, setNotice] = useState(savedAdventure?.notice ?? DEFAULT_NOTICE);
  const [terminalOpen, setTerminalOpen] = useState(savedAdventure?.terminalOpen ?? false);
  const [terminalInput, setTerminalInput] = useState(savedAdventure?.terminalInput ?? '');
  const [showCommandHelp, setShowCommandHelp] = useState(savedAdventure?.showCommandHelp ?? false);
  const [missionComplete, setMissionComplete] = useState(savedAdventure?.missionComplete ?? false);
  const [hasStarted, setHasStarted] = useState(savedAdventure?.hasStarted ?? view === 'game');
  const levelManager = useMemo(() => new LevelManager(), []);

  const repo = terminalState.currentRepo;
  const currentLevel = gameState.levels.find((level) => level.id === chapterId) ?? gameState.levels[0];
  const chapter = getStoryChapter(chapterId);
  const nextLevel = gameState.levels.find((level) => level.id === chapterId + 1);
  const hasName = Boolean(repo.config.userName);
  const hasEmail = Boolean(repo.config.userEmail);
  const hasRunStatus = terminalState.history.some(
    (entry) => entry.success && entry.command.trim().toLowerCase() === 'git status'
  );
  const allShardsCollected = collectedShards.length === DATA_SHARDS.length;

  useEffect(() => {
    const state: SavedAdventureState = {
      chapterId,
      player,
      direction,
      hasMetNova,
      collectedShards,
      dialogue,
      notice,
      terminalOpen,
      terminalInput,
      showCommandHelp,
      missionComplete,
      hasStarted,
    };

    try {
      window.localStorage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Continue without persistence when storage is unavailable.
    }
  }, [
    chapterId,
    collectedShards,
    dialogue,
    direction,
    hasMetNova,
    hasStarted,
    missionComplete,
    notice,
    player,
    showCommandHelp,
    terminalInput,
    terminalOpen,
  ]);

  const objectiveStatuses = useMemo(
    () => currentLevel
      ? levelManager.getObjectiveStatuses(currentLevel, repo, terminalState.history)
      : [],
    [currentLevel, levelManager, repo, terminalState.history]
  );
  const completedObjectiveCount = objectiveStatuses.filter((objective) => objective.completed).length;
  const currentObjectiveIndex = Math.max(
    0,
    objectiveStatuses.findIndex((objective) => !objective.completed)
  );

  const currentStep = useMemo(() => {
    if (chapterId === 1) {
      if (!hasMetNova) {
        return {
          number: 1,
          total: 6,
          title: 'Find the archive guardian',
          detail: 'Move beside NOVA and press E to learn what happened here.',
          commands: [] as string[],
          why: 'NOVA is the archive intelligence and your guide through the damaged timeline.',
        };
      }
      if (!repo.initialized) {
        return {
          number: 2,
          total: 6,
          title: 'Power the timeline core',
          detail: 'Reach the terminal in the upper-right corner and initialize the archive.',
          commands: chapter.guides[0]?.commands ?? ['git init'],
          why: chapter.guides[0]?.why ?? '',
        };
      }
      if (!allShardsCollected) {
        return {
          number: 3,
          total: 6,
          title: `Recover the data shards (${collectedShards.length}/3)`,
          detail: 'The restored power revealed unstable files. Move beside each shard and press E.',
          commands: [] as string[],
          why: 'Files in a project exist before Git can decide whether to track them.',
        };
      }
      if (!hasName) {
        return {
          number: 4,
          total: 6,
          title: 'Register your Timekeeper name',
          detail: 'Return to the terminal and identify who will create this timeline’s history.',
          commands: chapter.guides[1]?.commands ?? [],
          why: chapter.guides[1]?.why ?? '',
        };
      }
      if (!hasEmail) {
        return {
          number: 5,
          total: 6,
          title: 'Link your archive signal',
          detail: 'Add an email identity to complete your Timekeeper profile.',
          commands: chapter.guides[2]?.commands ?? [],
          why: chapter.guides[2]?.why ?? '',
        };
      }
      if (!hasRunStatus) {
        return {
          number: 6,
          total: 6,
          title: 'Scan the restored archive',
          detail: 'Run a status scan to see the repository from Git’s point of view.',
          commands: chapter.guides[3]?.commands ?? [],
          why: chapter.guides[3]?.why ?? '',
        };
      }
      return {
        number: 6,
        total: 6,
        title: 'Timeline stabilized',
        detail: 'The archive remembers its origin again.',
        commands: [] as string[],
        why: chapter.completionSummary,
      };
    }

    const objective = objectiveStatuses[currentObjectiveIndex];
    const guide = chapter.guides[currentObjectiveIndex];
    return {
      number: Math.min(currentObjectiveIndex + 1, Math.max(1, objectiveStatuses.length)),
      total: Math.max(1, objectiveStatuses.length),
      title: objective?.objective ?? 'Timeline stabilized',
      detail: objective?.completed
        ? 'All chapter objectives are complete.'
        : `Complete this operation inside ${chapter.sector}.`,
      commands: guide?.commands ?? [],
      why: guide?.why ?? currentLevel?.story ?? '',
    };
  }, [
    allShardsCollected,
    chapter,
    chapterId,
    collectedShards.length,
    currentLevel?.story,
    currentObjectiveIndex,
    hasEmail,
    hasMetNova,
    hasName,
    hasRunStatus,
    objectiveStatuses,
    repo.initialized,
  ]);

  const nearestInteraction = useMemo(() => {
    if (isNear(player, NOVA_POSITION)) {
      return { label: 'Talk to NOVA', type: 'nova' as const };
    }
    if (isNear(player, TERMINAL_POSITION)) {
      return { label: 'Use archive terminal', type: 'terminal' as const };
    }
    const shard = DATA_SHARDS.find(
      (item) => chapterId === 1 && !collectedShards.includes(item.id) && repo.initialized && isNear(player, item)
    );
    if (shard) {
      return { label: `Recover ${shard.label}`, type: 'shard' as const, shard };
    }
    return null;
  }, [chapterId, collectedShards, player, repo.initialized]);

  const beginMission = useCallback(() => {
    void startMusic();
    const firstLevel = gameState.levels.find((level) => level.id === 1);
    if (firstLevel) {
      resetProgress();
      startLevel(1);
      resetTerminal(firstLevel.initialRepo);
    }
    setChapterId(1);
    setPlayer(START_POSITION);
    setDirection('up');
    setHasMetNova(false);
    setCollectedShards([]);
    setDialogue(null);
    setTerminalOpen(false);
    setTerminalInput('');
    setMissionComplete(false);
    setNotice(DEFAULT_NOTICE);
    setHasStarted(true);
    onStartGame();
  }, [gameState.levels, onStartGame, resetProgress, resetTerminal, startLevel, startMusic]);

  const resumeMission = useCallback(() => {
    void startMusic();
    startLevel(chapterId);
    setHasStarted(true);
    onStartGame();
  }, [chapterId, onStartGame, startLevel, startMusic]);

  const advanceChapter = useCallback(() => {
    if (!nextLevel) return;

    const nextRepo = {
      ...nextLevel.initialRepo,
      config: {
        ...nextLevel.initialRepo.config,
        ...repo.config,
      },
    };

    startLevel(nextLevel.id);
    resetTerminal(nextRepo);
    setChapterId(nextLevel.id);
    setPlayer(START_POSITION);
    setDirection('up');
    setHasMetNova(true);
    setCollectedShards([]);
    setTerminalOpen(false);
    setTerminalInput('');
    setShowCommandHelp(false);
    setMissionComplete(false);
    setDialogue(`NOVA // ${nextLevel.story}`);
    setNotice(`Chapter ${String(nextLevel.id).padStart(2, '0')} online. Consult NOVA or enter the archive terminal.`);
  }, [nextLevel, repo.config, resetTerminal, startLevel]);

  const movePlayer = useCallback(
    (nextDirection: Direction) => {
      if (view !== 'game' || terminalOpen || dialogue || missionComplete) return;

      setDirection(nextDirection);
      setPlayer((current) => {
        const delta = {
          up: { x: 0, y: -1 },
          down: { x: 0, y: 1 },
          left: { x: -1, y: 0 },
          right: { x: 1, y: 0 },
        }[nextDirection];
        return {
          x: Math.max(1, Math.min(COLS - 2, current.x + delta.x)),
          y: Math.max(1, Math.min(ROWS - 2, current.y + delta.y)),
        };
      });
    },
    [dialogue, missionComplete, terminalOpen, view]
  );

  const interact = useCallback(() => {
    if (view !== 'game' || terminalOpen || missionComplete) return;
    if (dialogue) {
      setDialogue(null);
      return;
    }

    if (!nearestInteraction) {
      setNotice('Nothing to interact with here. Follow the pulsing mission marker.');
      return;
    }

    if (nearestInteraction.type === 'nova') {
      setHasMetNova(true);
      setDialogue(
        chapterId === 1
          ? repo.initialized
            ? 'NOVA // The core is awake. Recover the three data shards, then register your identity at the terminal.'
            : 'NOVA // Timekeeper, this archive has no origin point. Reach the terminal and run git init. That command will give this timeline a memory.'
          : `NOVA // ${currentLevel?.story ?? chapter.completionSummary}`
      );
      setNotice(chapterId === 1 ? 'Mission updated: reach the archive terminal.' : `Mission briefing loaded for ${chapter.sector}.`);
      return;
    }

    if (nearestInteraction.type === 'terminal') {
      if (chapterId === 1 && repo.initialized && !allShardsCollected) {
        setDialogue('NOVA // The core is online, but three data shards remain unstable. Recover them before continuing.');
        return;
      }
      setTerminalOpen(true);
      setShowCommandHelp(false);
      setNotice('Archive terminal connected.');
      return;
    }

    const shard = nearestInteraction.shard;
    setCollectedShards((current) => [...current, shard.id]);
    setDialogue(`DATA RECOVERED // ${shard.label} is stable and ready to be tracked.`);
    setNotice(`Recovered ${shard.label}. ${collectedShards.length + 1}/3 shards secured.`);
  }, [allShardsCollected, chapter.completionSummary, chapter.sector, chapterId, collectedShards.length, currentLevel?.story, dialogue, missionComplete, nearestInteraction, repo.initialized, terminalOpen, view]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (view !== 'game') return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      const key = event.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') {
        event.preventDefault();
        movePlayer('up');
      } else if (key === 's' || key === 'arrowdown') {
        event.preventDefault();
        movePlayer('down');
      } else if (key === 'a' || key === 'arrowleft') {
        event.preventDefault();
        movePlayer('left');
      } else if (key === 'd' || key === 'arrowright') {
        event.preventDefault();
        movePlayer('right');
      } else if (key === 'e' || key === 'enter') {
        event.preventDefault();
        interact();
      } else if (key === 'escape') {
        setDialogue(null);
        setTerminalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interact, movePlayer, view]);

  useEffect(() => {
    if (chapterId === 1 && repo.initialized && terminalOpen && !allShardsCollected) {
      setTerminalOpen(false);
      setDialogue('SYSTEM // Repository initialized. Archive power restored. Three data shards have appeared in the chamber.');
      setNotice('Core online. Recover all three glowing data shards.');
    }
  }, [allShardsCollected, chapterId, repo.initialized, terminalOpen]);

  useEffect(() => {
    const levelIsComplete = currentLevel
      ? levelManager.checkLevelCompletion(currentLevel, repo, terminalState.history)
      : false;
    const storyRequirementsComplete = chapterId === 1
      ? levelIsComplete && allShardsCollected
      : levelIsComplete;

    if (hasStarted && storyRequirementsComplete && !missionComplete) {
      const timer = window.setTimeout(() => {
        setTerminalOpen(false);
        setMissionComplete(true);
        completeLevel(chapterId);
      }, 500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [allShardsCollected, chapterId, completeLevel, currentLevel, hasStarted, levelManager, missionComplete, repo, terminalState.history]);

  const submitCommand = async (event: FormEvent) => {
    event.preventDefault();
    const command = terminalInput.trim();
    if (!command || terminalState.isProcessing) return;
    await executeCommand(command);
    setTerminalInput('');
    setShowCommandHelp(false);
  };

  const latestHistory = terminalState.history.slice(-5);
  const stability = chapterId === 1
    ? [repo.initialized, allShardsCollected, hasName, hasEmail, hasRunStatus].filter(Boolean).length * 20
    : currentLevel
      ? levelManager.getCompletionPercentage(currentLevel, repo, terminalState.history)
      : 0;

  if (view === 'home') {
    return (
      <main className="quest-title-screen">
        <div className="quest-stars" aria-hidden="true" />
        <div className="quest-title-grid" aria-hidden="true" />
        <div className="quest-title-content">
          <div className="quest-title-kicker"><Sparkles size={14} /> CHRONO ARCHIVE // SIGNAL FOUND</div>
          <div className="quest-logo-mark" aria-hidden="true">
            <span className="quest-logo-branch" />
            <span className="quest-logo-node quest-logo-node-a" />
            <span className="quest-logo-node quest-logo-node-b" />
            <span className="quest-logo-node quest-logo-node-c" />
          </div>
          <h1 className="quest-title-logo">GIT<br /><span>QUEST</span></h1>
          <p className="quest-title-subtitle">SAVE THE TIMELINE</p>
          <p className="quest-title-copy">
            History has fractured. Enter the Chrono Archive, recover its lost files, and master the commands that hold reality together.
          </p>
          <div className="quest-title-actions">
            <button
              className="quest-pixel-button quest-pixel-button-primary"
              onClick={hasStarted ? resumeMission : beginMission}
            >
              <Play size={18} fill="currentColor" /> {hasStarted ? 'Continue story mode' : 'Begin story mode'}
            </button>
            {hasStarted && (
              <button className="quest-pixel-button" onClick={beginMission}>
                <RotateCcw size={18} /> New story
              </button>
            )}
            <button className="quest-pixel-button" onClick={onOpenClassic}>
              <Keyboard size={18} /> Open terminal mode
            </button>
            <button
              className="quest-pixel-button quest-music-button"
              onClick={() => void toggleMusic()}
              aria-pressed={musicEnabled}
            >
              {musicEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              Music {musicEnabled ? 'on' : 'off'}
            </button>
          </div>
          <div className="quest-title-meta">
            <span><Gamepad2 size={14} /> Story-driven Git adventure</span>
            <span>5 chapters // One complete timeline</span>
          </div>
        </div>
        <div className="quest-scanline" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className={`quest-game-shell ${repo.initialized ? 'quest-powered' : 'quest-unpowered'} ${stability === 100 ? 'quest-stable' : ''}`}>
      <header className="quest-hud">
        <button className="quest-icon-button" onClick={onGoHome} aria-label="Return to home page">
          <ArrowLeft size={18} />
        </button>
        <div className="quest-hud-mission">
          <span>CHAPTER {String(chapterId).padStart(2, '0')} / {gameState.levels.length}</span>
          <strong>{currentLevel?.title.toUpperCase() ?? 'SAVE THE TIMELINE'}</strong>
        </div>
        <div className="quest-stability">
          <div className="quest-stability-label"><Radar size={14} /> Timeline stability <strong>{stability}%</strong></div>
          <div className="quest-meter"><span style={{ width: `${stability}%` }} /></div>
        </div>
        <div className="quest-hud-shards">
          <FileCode2 size={15} />
          {chapterId === 1
            ? `${collectedShards.length}/3`
            : `${completedObjectiveCount}/${objectiveStatuses.length}`}
        </div>
        <button
          className={`quest-hud-music ${musicPlaying ? 'is-playing' : ''}`}
          onClick={() => void toggleMusic()}
          aria-label={musicEnabled ? 'Mute background music' : 'Play background music'}
          aria-pressed={musicEnabled}
        >
          {musicEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </header>

      <section className="quest-world-wrap" aria-label="Chrono Archive game world">
        <div className="quest-room">
          <div className="quest-room-floor" aria-hidden="true" />
          <div className="quest-wall quest-wall-top" aria-hidden="true" />
          <div className="quest-wall quest-wall-left" aria-hidden="true" />
          <div className="quest-wall quest-wall-right" aria-hidden="true" />
          <div className="quest-wall quest-wall-bottom" aria-hidden="true" />

          <div className="quest-reactor" aria-label={repo.initialized ? 'Timeline core online' : 'Timeline core offline'}>
            <span className="quest-reactor-ring" />
            <Power size={25} />
            <small>{repo.initialized ? 'CORE ONLINE' : 'NO ORIGIN'}</small>
          </div>

          <button
            className={`quest-world-entity quest-terminal-station ${isNear(player, TERMINAL_POSITION) ? 'is-near' : ''}`}
            style={positionStyle(TERMINAL_POSITION)}
            onClick={() => {
              if (isNear(player, TERMINAL_POSITION)) interact();
              else setNotice('Move beside the archive terminal to use it.');
            }}
            aria-label="Archive terminal"
          >
            <Monitor size={28} />
            <span>ARCHIVE_01</span>
            <i className={repo.initialized ? 'online' : ''} />
          </button>

          <button
            className={`quest-world-entity quest-nova ${isNear(player, NOVA_POSITION) ? 'is-near' : ''}`}
            style={positionStyle(NOVA_POSITION)}
            onClick={() => {
              if (isNear(player, NOVA_POSITION)) interact();
              else setNotice('Move beside NOVA to talk.');
            }}
            aria-label="NOVA, archive guardian"
          >
            <span className="quest-nova-body"><Bot size={25} /></span>
            <span className="quest-nova-name">NOVA</span>
          </button>

          {chapterId === 1 && DATA_SHARDS.map((shard) => {
            const collected = collectedShards.includes(shard.id);
            return repo.initialized ? (
              <button
                key={shard.id}
                className={`quest-world-entity quest-data-shard ${collected ? 'is-collected' : ''} ${isNear(player, shard) ? 'is-near' : ''}`}
                style={positionStyle(shard)}
                onClick={() => {
                  if (!collected && isNear(player, shard)) interact();
                  else if (!collected) setNotice(`Move beside ${shard.label} to recover it.`);
                }}
                aria-label={`${collected ? 'Recovered' : 'Unstable'} data shard ${shard.label}`}
              >
                {collected ? <Check size={19} /> : <FileCode2 size={23} />}
                <span>{shard.label}</span>
              </button>
            ) : null;
          })}

          <div
            className={`quest-player quest-facing-${direction}`}
            style={positionStyle(player)}
            aria-label="Timekeeper player character"
          >
            <span className="quest-player-head" />
            <span className="quest-player-body" />
            <span className="quest-player-shadow" />
          </div>

          {nearestInteraction && !dialogue && !terminalOpen && (
            <div className="quest-interact-prompt">
              <kbd>E</kbd> {nearestInteraction.label}
            </div>
          )}

          <div className="quest-room-label">{chapter.roomLabel}</div>
          <div className="quest-scanline" aria-hidden="true" />
        </div>

        <aside className="quest-mission-card">
          <div className="quest-mission-step">MISSION STEP {currentStep.number} / {currentStep.total}</div>
          <h2>{currentStep.title}</h2>
          <p>{currentStep.detail}</p>
          {currentStep.commands[0] && (
            <button
              className="quest-command-preview"
              onClick={() => {
                setTerminalInput(currentStep.commands[0] ?? '');
                setShowCommandHelp(true);
              }}
            >
              <Terminal size={15} /> <code>{currentStep.commands[0]}</code>
            </button>
          )}
          <div className="quest-notice"><Zap size={13} /> {notice}</div>
        </aside>

        <div className="quest-controls" aria-label="Movement controls">
          <button onClick={() => movePlayer('up')} aria-label="Move up"><ChevronUp /></button>
          <button onClick={() => movePlayer('left')} aria-label="Move left"><ChevronLeft /></button>
          <button onClick={interact} className="quest-control-action" aria-label="Interact">E</button>
          <button onClick={() => movePlayer('right')} aria-label="Move right"><ChevronRight /></button>
          <button onClick={() => movePlayer('down')} aria-label="Move down"><ChevronDown /></button>
        </div>
      </section>

      <div className="quest-key-legend">
        <span><kbd>WASD</kbd> or <kbd>ARROWS</kbd> move</span>
        <span><kbd>E</kbd> interact</span>
        <span><kbd>ESC</kbd> close</span>
      </div>

      {dialogue && (
        <div className="quest-dialogue-layer" onClick={() => setDialogue(null)}>
          <div className="quest-dialogue" onClick={(event) => event.stopPropagation()}>
            <div className="quest-dialogue-avatar"><Bot size={32} /></div>
            <div>
              <span className="quest-dialogue-speaker">INCOMING TRANSMISSION</span>
              <p>{dialogue}</p>
              <button onClick={() => setDialogue(null)}>Continue <span>↵</span></button>
            </div>
          </div>
        </div>
      )}

      {terminalOpen && (
        <div className="quest-terminal-layer">
          <section className="quest-terminal-modal" aria-label="Archive terminal">
            <header>
              <div><Monitor size={17} /> ARCHIVE_01 <span>// SECURE LINK</span></div>
              <button onClick={() => setTerminalOpen(false)} aria-label="Close terminal"><X /></button>
            </header>
            <div className="quest-terminal-content">
              <div className="quest-terminal-task">
                <span>ACTIVE OBJECTIVE</span>
                <h3>{currentStep.title}</h3>
                <p>{currentStep.detail}</p>
                <button onClick={() => setShowCommandHelp((current) => !current)}>
                  {showCommandHelp ? 'Hide explanation' : 'Explain this command'}
                </button>
              </div>

              {showCommandHelp && (
                <div className="quest-command-help">
                  <div><Sparkles size={17} /> <strong>WHY THIS MATTERS</strong></div>
                  <p>{currentStep.why}</p>
                  {currentStep.commands.length > 0 && (
                    <div className="quest-command-sequence">
                      {currentStep.commands.map((command, index) => (
                        <button key={command} onClick={() => setTerminalInput(command)}>
                          <span>{index + 1}</span> {command}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="quest-terminal-history">
                {latestHistory.length === 0 ? (
                  <div className="quest-terminal-welcome">
                    <span>CHRONO OS v1.4.2</span>
                    <p>Archive terminal ready. Commands alter the state of this world.</p>
                  </div>
                ) : (
                  latestHistory.map((entry, index) => (
                    <div key={`${entry.timestamp.toString()}-${index}`} className="quest-terminal-entry">
                      <div><span>timekeeper@archive:$</span> {entry.command}</div>
                      {entry.output && <pre className={entry.success ? '' : 'is-error'}>{entry.output}</pre>}
                      {entry.feedback && <p>{entry.feedback}</p>}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={submitCommand} className="quest-terminal-form">
                <span>timekeeper@archive:$</span>
                <input
                  autoFocus
                  value={terminalInput}
                  onChange={(event) => setTerminalInput(event.target.value)}
                  placeholder={currentStep.commands[0] ?? 'Enter a Git command'}
                  disabled={terminalState.isProcessing}
                  aria-label="Git command"
                />
                <button disabled={!terminalInput.trim() || terminalState.isProcessing}>
                  {terminalState.isProcessing ? 'RUNNING…' : 'RUN'}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      {missionComplete && (
        <div className="quest-complete-layer">
          <section className="quest-complete-card">
            <div className="quest-complete-icon"><Sparkles size={35} /></div>
            <span className="quest-complete-kicker">
              {nextLevel ? `CHAPTER ${String(chapterId).padStart(2, '0')} COMPLETE` : 'TIMELINE RESTORED'}
            </span>
            <h2>{chapter.completionTitle}</h2>
            <p>{chapter.completionSummary}</p>
            <div className="quest-complete-recap">
              <span><Check /> {currentLevel?.title}</span>
              <span><Check /> {objectiveStatuses.length} objectives cleared</span>
              <span><Check /> {stability}% stability</span>
            </div>
            <div className="quest-complete-actions">
              {nextLevel ? (
                <button className="quest-pixel-button quest-pixel-button-primary" onClick={advanceChapter}>
                  Begin chapter {String(nextLevel.id).padStart(2, '0')} <ChevronRight size={16} />
                </button>
              ) : (
                <>
                  <button className="quest-pixel-button quest-pixel-button-primary" onClick={onGoHome}>
                    Return to title
                  </button>
                  <button className="quest-pixel-button" onClick={beginMission}>
                    <RotateCcw size={16} /> Replay full story
                  </button>
                </>
              )}
            </div>
            <small>
              {nextLevel
                ? `NEXT // CHAPTER ${String(nextLevel.id).padStart(2, '0')} — ${nextLevel.title.toUpperCase()}`
                : 'CAMPAIGN COMPLETE // ALL FIVE CHAPTERS RESTORED'}
            </small>
          </section>
        </div>
      )}

      {chapterId === 1 && !repo.initialized && hasMetNova && (
        <div className="quest-power-warning"><LockKeyhole size={14} /> ARCHIVE POWER OFFLINE</div>
      )}
      <AchievementToast />
    </main>
  );
}

export default AdventureGame;
