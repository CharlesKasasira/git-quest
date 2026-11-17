import { describe, expect, it } from 'vitest';
import { levelsData } from '../../data/levels';
import { storyChapters } from '../../data/storyChapters';
import { GitRepository, TerminalCommand } from '../../types/game';
import { GitSimulator } from '../gitSimulator';
import { LevelManager } from '../levelManager';

const commandEntry = (command: string, success: boolean, output: string): TerminalCommand => ({
  command,
  args: command.trim().split(/\s+/).slice(1),
  output,
  success,
  timestamp: new Date(),
});

const runChapter = (
  simulator: GitSimulator,
  levelId: number,
  commands: string[],
  inheritedConfig: GitRepository['config']
) => {
  const level = levelsData.find((candidate) => candidate.id === levelId)!;
  let repo: GitRepository = {
    ...level.initialRepo,
    config: { ...level.initialRepo.config, ...inheritedConfig },
  };
  const history: TerminalCommand[] = [];

  commands.forEach((command) => {
    const [name = '', ...args] = command.trim().split(/\s+/);
    const result = simulator.executeCommand(name, args, repo);
    history.push(commandEntry(command, result.success, result.output));
    expect(result.success, `${command} should succeed in chapter ${levelId}`).toBe(true);
    repo = result.newRepo ?? repo;
  });

  expect(new LevelManager().checkLevelCompletion(level, repo, history)).toBe(true);
  return repo;
};

describe('story campaign', () => {
  it('defines a guide for every authored level', () => {
    expect(storyChapters.map((chapter) => chapter.id)).toEqual(levelsData.map((level) => level.id));
    storyChapters.forEach((chapter) => {
      const level = levelsData.find((candidate) => candidate.id === chapter.id)!;
      expect(chapter.guides).toHaveLength(level.objectives.length);
    });
  });

  it('can be completed from chapter one through the finale', () => {
    const simulator = new GitSimulator();
    let config: GitRepository['config'] = {};

    const chapterOne = runChapter(
      simulator,
      1,
      [
        'git init',
        'git config --global user.name Timekeeper',
        'git config --global user.email timekeeper@gitquest.dev',
        'git status',
      ],
      config
    );
    config = chapterOne.config;

    const chapterTwo = runChapter(
      simulator,
      2,
      ['git add timeline.txt', 'git commit -m Initial-timeline-entry', 'git log'],
      config
    );
    config = chapterTwo.config;

    const chapterThree = runChapter(
      simulator,
      3,
      [
        'git branch feature-fix',
        'git checkout feature-fix',
        'git add timeline.txt',
        'git commit -m Repair-parallel-reality',
        'git checkout main',
        'git merge feature-fix',
      ],
      config
    );
    config = chapterThree.config;

    const chapterFour = runChapter(
      simulator,
      4,
      ['git log', 'git revert danger789'],
      config
    );
    config = chapterFour.config;

    runChapter(
      simulator,
      5,
      ['git merge feature-security', 'git tag v1.0.0', 'git push'],
      config
    );
  });
});
