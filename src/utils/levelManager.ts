import {
  GitRepository,
  Level,
  LevelCompletionCriterion,
  TerminalCommand,
} from '../types/game';

export interface ObjectiveStatus {
  objective: string;
  completed: boolean;
}

interface CompletionContext {
  repo: GitRepository;
  successfulCommands: string[];
}

type CompletionPredicate = (context: CompletionContext) => boolean;

const hasSuccessfulCommand = (context: CompletionContext, command: string): boolean =>
  context.successfulCommands.some((successfulCommand) => successfulCommand.includes(command));

const completionPredicates: Record<LevelCompletionCriterion, CompletionPredicate> = {
  gitInitRun: (context) => hasSuccessfulCommand(context, 'git init'),
  gitUserNameConfigured: (context) =>
    hasSuccessfulCommand(context, 'git config') &&
    context.successfulCommands.some((command) => command.includes('user.name')),
  gitUserEmailConfigured: (context) =>
    hasSuccessfulCommand(context, 'git config') &&
    context.successfulCommands.some((command) => command.includes('user.email')),
  gitStatusRun: (context) => hasSuccessfulCommand(context, 'git status'),
  gitAddRun: (context) => hasSuccessfulCommand(context, 'git add'),
  gitCommitRun: (context) => hasSuccessfulCommand(context, 'git commit'),
  gitLogRun: (context) => hasSuccessfulCommand(context, 'git log'),
  gitBranchRun: (context) => hasSuccessfulCommand(context, 'git branch'),
  gitCheckoutRun: (context) => hasSuccessfulCommand(context, 'git checkout'),
  gitMergeRun: (context) => hasSuccessfulCommand(context, 'git merge'),
  gitRevertRun: (context) => hasSuccessfulCommand(context, 'git revert'),
  gitResetRun: (context) => hasSuccessfulCommand(context, 'git reset'),
  gitRevertOrResetRun: (context) =>
    completionPredicates.gitRevertRun(context) || completionPredicates.gitResetRun(context),
  gitTagRun: (context) => hasSuccessfulCommand(context, 'git tag'),
  gitPushRun: (context) => hasSuccessfulCommand(context, 'git push'),
  repositoryInitialized: (context) => context.repo.initialized,
  userNameConfigured: (context) => Boolean(context.repo.config.userName),
  userEmailConfigured: (context) => Boolean(context.repo.config.userEmail),
  userIdentityConfigured: (context) =>
    Boolean(context.repo.config.userName) && Boolean(context.repo.config.userEmail),
  hasFiles: (context) => context.repo.files.length > 0,
  hasTimelineFile: (context) => context.repo.files.some((file) => file.name === 'timeline.txt'),
  hasCommits: (context) => context.repo.commits.length > 0,
  hasMultipleBranches: (context) => context.repo.branches.length > 1,
  hasAtLeastTwoCommits: (context) => context.repo.commits.length >= 2,
  hasAtLeastThreeCommits: (context) => context.repo.commits.length >= 3,
  currentBranchFeatureFix: (context) => context.repo.currentBranch === 'feature-fix',
  currentBranchMain: (context) =>
    context.repo.branches.some((branch) => branch.name === 'main' && branch.current),
  noConflictFiles: (context) => !context.repo.files.some((file) => file.name.includes('conflict')),
  noActiveVirusFile: (context) =>
    !context.repo.files.some((file) => file.name.includes('virus') && !file.staged),
  noVirusFile: (context) => !context.repo.files.some((file) => file.name.includes('virus')),
  branchCountAtMostTwo: (context) => context.repo.branches.length <= 2,
};

export class LevelManager {
  private createContext(repo: GitRepository, commandHistory: TerminalCommand[]): CompletionContext {
    return {
      repo,
      successfulCommands: commandHistory
        .filter((command) => command.success)
        .map((command) => command.command.toLowerCase()),
    };
  }

  private objectiveAt(level: Level, index: number): string {
    return level.objectives[index] ?? `Objective ${index + 1}`;
  }

  private criteriaCompleted(
    criteria: LevelCompletionCriterion[],
    context: CompletionContext
  ): boolean {
    return criteria.every((criterion) => completionPredicates[criterion](context));
  }

  checkLevelCompletion(level: Level, repo: GitRepository, commandHistory: TerminalCommand[]): boolean {
    const context = this.createContext(repo, commandHistory);
    return this.criteriaCompleted(level.completionCriteria, context);
  }

  getCompletionPercentage(level: Level, repo: GitRepository, commandHistory: TerminalCommand[]): number {
    const context = this.createContext(repo, commandHistory);
    const criteria = level.progressCriteria;

    if (criteria.length === 0) {
      return 0;
    }

    const completedCount = criteria.filter((criterion) => completionPredicates[criterion](context)).length;
    return Math.min(Math.round((completedCount / criteria.length) * 100), 100);
  }

  getObjectiveStatuses(level: Level, repo: GitRepository, commandHistory: TerminalCommand[]): ObjectiveStatus[] {
    const context = this.createContext(repo, commandHistory);

    return level.objectives.map((objective, index) => {
      const criteria = level.objectiveCriteria[index] ?? [];
      return {
        objective: objective || this.objectiveAt(level, index),
        completed: criteria.length > 0 && this.criteriaCompleted(criteria, context),
      };
    });
  }
}
