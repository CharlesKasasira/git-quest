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
import { useChiptuneMusic } from '../hooks/useChiptuneMusic';
import AchievementToast from './AchievementToast';

type Screen = 'title' | 'game';
type Direction = 'up' | 'down' | 'left' | 'right';

interface AdventureGameProps {
  onOpenClassic: () => void;
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
  screen: Screen;
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
      screen: raw.screen === 'game' ? 'game' : 'title',
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

function AdventureGame({ onOpenClassic }: AdventureGameProps) {
  const { gameState, startLevel, completeLevel } = useGame();
  const { terminalState, executeCommand, resetTerminal } = useTerminal();
  const { enabled: musicEnabled, playing: musicPlaying, start: startMusic, toggle: toggleMusic } = useChiptuneMusic();
  const [savedAdventure] = useState(loadAdventureState);
  const [screen, setScreen] = useState<Screen>(savedAdventure?.screen ?? 'title');
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
  const [hasStarted, setHasStarted] = useState(savedAdventure?.hasStarted ?? false);

  const repo = terminalState.currentRepo;
  const hasName = Boolean(repo.config.userName);
  const hasEmail = Boolean(repo.config.userEmail);
  const hasRunStatus = terminalState.history.some(
    (entry) => entry.success && entry.command.trim().toLowerCase() === 'git status'
  );
  const allShardsCollected = collectedShards.length === DATA_SHARDS.length;

  useEffect(() => {
    const state: SavedAdventureState = {
      screen,
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
    collectedShards,
    dialogue,
    direction,
    hasMetNova,
    hasStarted,
    missionComplete,
    notice,
    player,
    screen,
    showCommandHelp,
    terminalInput,
    terminalOpen,
  ]);

  const currentStep = useMemo(() => {
    if (!hasMetNova) {
      return {
        number: 1,
        title: 'Find the archive guardian',
        detail: 'Move beside NOVA and press E to learn what happened here.',
        command: null,
        why: 'NOVA is the archive intelligence and your guide through the damaged timeline.',
      };
    }
    if (!repo.initialized) {
      return {
        number: 2,
        title: 'Power the timeline core',
        detail: 'Reach the terminal in the upper-right corner and initialize the archive.',
        command: 'git init',
        why: 'git init creates the hidden repository where Git can begin recording history.',
      };
    }
    if (!allShardsCollected) {
      return {
        number: 3,
        title: `Recover the data shards (${collectedShards.length}/3)`,
        detail: 'The restored power revealed unstable files. Move beside each shard and press E.',
        command: null,
        why: 'Files in a project exist before Git can decide whether to track them.',
      };
    }
    if (!hasName) {
      return {
        number: 4,
        title: 'Register your Timekeeper name',
        detail: 'Return to the terminal and identify who will create this timeline’s history.',
        command: 'git config --global user.name "Timekeeper"',
        why: 'Git records an author on every commit, so collaborators know who made each change.',
      };
    }
    if (!hasEmail) {
      return {
        number: 5,
        title: 'Link your archive signal',
        detail: 'Add an email identity to complete your Timekeeper profile.',
        command: 'git config --global user.email "timekeeper@gitquest.dev"',
        why: 'Git uses your name and email together to identify the author of future commits.',
      };
    }
    if (!hasRunStatus) {
      return {
        number: 6,
        title: 'Scan the restored archive',
        detail: 'Run a status scan to see the repository from Git’s point of view.',
        command: 'git status',
        why: 'git status is your safest navigation tool. It reports what changed and what Git expects next.',
      };
    }
    return {
      number: 6,
      title: 'Timeline stabilized',
      detail: 'The archive remembers its origin again.',
      command: null,
      why: 'You created a repository, registered its author, and inspected its state.',
    };
  }, [allShardsCollected, collectedShards.length, hasEmail, hasMetNova, hasName, hasRunStatus, repo.initialized]);

  const nearestInteraction = useMemo(() => {
    if (isNear(player, NOVA_POSITION)) {
      return { label: 'Talk to NOVA', type: 'nova' as const };
    }
    if (isNear(player, TERMINAL_POSITION)) {
      return { label: 'Use archive terminal', type: 'terminal' as const };
    }
    const shard = DATA_SHARDS.find(
      (item) => !collectedShards.includes(item.id) && repo.initialized && isNear(player, item)
    );
    if (shard) {
      return { label: `Recover ${shard.label}`, type: 'shard' as const, shard };
    }
    return null;
  }, [collectedShards, player, repo.initialized]);

  const beginMission = useCallback(() => {
    void startMusic();
    const firstLevel = gameState.levels.find((level) => level.id === 1);
    if (firstLevel) {
      startLevel(1);
      resetTerminal(firstLevel.initialRepo);
    }
    setPlayer(START_POSITION);
    setDirection('up');
    setHasMetNova(false);
    setCollectedShards([]);
    setDialogue(null);
    setTerminalOpen(false);
    setTerminalInput('');
    setMissionComplete(false);
    setNotice(DEFAULT_NOTICE);
    setScreen('game');
    setHasStarted(true);
  }, [gameState.levels, resetTerminal, startLevel, startMusic]);

  const movePlayer = useCallback(
    (nextDirection: Direction) => {
      if (screen !== 'game' || terminalOpen || dialogue || missionComplete) return;

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
    [dialogue, missionComplete, screen, terminalOpen]
  );

  const interact = useCallback(() => {
    if (screen !== 'game' || terminalOpen || missionComplete) return;
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
        repo.initialized
          ? 'NOVA // The core is awake. Recover the three data shards, then register your identity at the terminal.'
          : 'NOVA // Timekeeper, this archive has no origin point. Reach the terminal and run git init. That command will give this timeline a memory.'
      );
      setNotice('Mission updated: reach the archive terminal.');
      return;
    }

    if (nearestInteraction.type === 'terminal') {
      if (repo.initialized && !allShardsCollected) {
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
  }, [allShardsCollected, collectedShards.length, dialogue, missionComplete, nearestInteraction, repo.initialized, screen, terminalOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (screen !== 'game') return;
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
  }, [interact, movePlayer, screen]);

  useEffect(() => {
    if (repo.initialized && terminalOpen && !allShardsCollected) {
      setTerminalOpen(false);
      setDialogue('SYSTEM // Repository initialized. Archive power restored. Three data shards have appeared in the chamber.');
      setNotice('Core online. Recover all three glowing data shards.');
    }
  }, [allShardsCollected, repo.initialized, terminalOpen]);

  useEffect(() => {
    if (
      hasStarted &&
      repo.initialized &&
      allShardsCollected &&
      hasName &&
      hasEmail &&
      hasRunStatus &&
      !missionComplete
    ) {
      const timer = window.setTimeout(() => {
        setTerminalOpen(false);
        setMissionComplete(true);
        completeLevel(1);
      }, 500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [allShardsCollected, completeLevel, hasEmail, hasName, hasRunStatus, hasStarted, missionComplete, repo.initialized]);

  const submitCommand = async (event: FormEvent) => {
    event.preventDefault();
    const command = terminalInput.trim();
    if (!command || terminalState.isProcessing) return;
    await executeCommand(command);
    setTerminalInput('');
    setShowCommandHelp(false);
  };

  const latestHistory = terminalState.history.slice(-5);
  const stability = [repo.initialized, allShardsCollected, hasName, hasEmail, hasRunStatus].filter(Boolean).length * 20;

  if (screen === 'title') {
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
            <button className="quest-pixel-button quest-pixel-button-primary" onClick={beginMission}>
              <Play size={18} fill="currentColor" /> Begin story mode
            </button>
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
            <span>Chapter 01 // Initialize the Timeline</span>
          </div>
        </div>
        <div className="quest-scanline" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className={`quest-game-shell ${repo.initialized ? 'quest-powered' : 'quest-unpowered'} ${hasRunStatus ? 'quest-stable' : ''}`}>
      <header className="quest-hud">
        <button className="quest-icon-button" onClick={() => setScreen('title')} aria-label="Return to title screen">
          <ArrowLeft size={18} />
        </button>
        <div className="quest-hud-mission">
          <span>CHAPTER 01</span>
          <strong>INITIALIZE THE TIMELINE</strong>
        </div>
        <div className="quest-stability">
          <div className="quest-stability-label"><Radar size={14} /> Timeline stability <strong>{stability}%</strong></div>
          <div className="quest-meter"><span style={{ width: `${stability}%` }} /></div>
        </div>
        <div className="quest-hud-shards"><FileCode2 size={15} /> {collectedShards.length}/3</div>
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

          {DATA_SHARDS.map((shard) => {
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

          <div className="quest-room-label">CHRONO ARCHIVE // ORIGIN CHAMBER</div>
          <div className="quest-scanline" aria-hidden="true" />
        </div>

        <aside className="quest-mission-card">
          <div className="quest-mission-step">MISSION STEP {currentStep.number} / 6</div>
          <h2>{currentStep.title}</h2>
          <p>{currentStep.detail}</p>
          {currentStep.command && (
            <button
              className="quest-command-preview"
              onClick={() => {
                setTerminalInput(currentStep.command ?? '');
                setShowCommandHelp(true);
              }}
            >
              <Terminal size={15} /> <code>{currentStep.command}</code>
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
                  {currentStep.command && (
                    <button onClick={() => setTerminalInput(currentStep.command ?? '')}>
                      Put command in terminal
                    </button>
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
                  placeholder={currentStep.command ?? 'Enter a Git command'}
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
            <span className="quest-complete-kicker">TIMELINE RESTORED</span>
            <h2>ORIGIN<br />REMEMBERED</h2>
            <p>You gave the archive a repository, recovered its files, registered an author, and inspected its state.</p>
            <div className="quest-complete-recap">
              <span><Check /> Repository initialized</span>
              <span><Check /> Identity configured</span>
              <span><Check /> Archive scanned</span>
            </div>
            <div className="quest-complete-actions">
              <button className="quest-pixel-button quest-pixel-button-primary" onClick={onOpenClassic}>
                Continue in terminal mode
              </button>
              <button className="quest-pixel-button" onClick={beginMission}>
                <RotateCcw size={16} /> Replay chapter
              </button>
            </div>
            <small>CHAPTER 02 // SECURE THE SOURCE — COMING NEXT</small>
          </section>
        </div>
      )}

      {!repo.initialized && hasMetNova && (
        <div className="quest-power-warning"><LockKeyhole size={14} /> ARCHIVE POWER OFFLINE</div>
      )}
      <AchievementToast />
    </main>
  );
}

export default AdventureGame;
