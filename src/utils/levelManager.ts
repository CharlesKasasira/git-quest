import { GitRepository, Level, TerminalCommand } from '../types/game';

export class LevelManager {
  checkLevelCompletion(level: Level, repo: GitRepository, commandHistory: TerminalCommand[]): boolean {
    switch (level.id) {
      case 1:
        return this.checkLevel1Completion(repo, commandHistory);
      case 2:
        return this.checkLevel2Completion(repo, commandHistory);
      case 3:
        return this.checkLevel3Completion(repo, commandHistory);
      case 4:
        return this.checkLevel4Completion(repo, commandHistory);
      case 5:
        return this.checkLevel5Completion(repo, commandHistory);
      default:
        return false;
    }
  }

  private checkLevel1Completion(repo: GitRepository, commandHistory: TerminalCommand[]): boolean {
    const successfulCommands = commandHistory.filter(cmd => cmd.success);
    
    // Check required commands were executed
    const hasInit = successfulCommands.some(cmd => cmd.command.includes('git init'));
    const hasUserName = successfulCommands.some(cmd => 
      cmd.command.includes('git config') && cmd.command.includes('user.name')
    );
    const hasUserEmail = successfulCommands.some(cmd => 
      cmd.command.includes('git config') && cmd.command.includes('user.email')
    );
    const hasStatus = successfulCommands.some(cmd => cmd.command.includes('git status'));

    // Check repository state
    const isInitialized = repo.initialized;
    const hasConfig = repo.config.userName && repo.config.userEmail;

    return hasInit && hasUserName && hasUserEmail && hasStatus && isInitialized && hasConfig;
  }

  private checkLevel2Completion(repo: GitRepository, commandHistory: TerminalCommand[]): boolean {
    const successfulCommands = commandHistory.filter(cmd => cmd.success);
    
    const hasAdd = successfulCommands.some(cmd => cmd.command.includes('git add'));
    const hasCommit = successfulCommands.some(cmd => cmd.command.includes('git commit'));
    const hasLog = successfulCommands.some(cmd => cmd.command.includes('git log'));

    const hasCommits = repo.commits.length > 0;
    const hasFiles = repo.files.length > 0;

    return hasAdd && hasCommit && hasLog && hasCommits && hasFiles;
  }

  private checkLevel3Completion(repo: GitRepository, commandHistory: TerminalCommand[]): boolean {
    const successfulCommands = commandHistory.filter(cmd => cmd.success);
    
    const hasBranch = successfulCommands.some(cmd => cmd.command.includes('git branch'));
    const hasCheckout = successfulCommands.some(cmd => cmd.command.includes('git checkout'));
    const hasMerge = successfulCommands.some(cmd => cmd.command.includes('git merge'));

    const hasMultipleBranches = repo.branches.length > 1;
    const hasEnoughCommits = repo.commits.length >= 2;

    return hasBranch && hasCheckout && hasMerge && hasMultipleBranches && hasEnoughCommits;
  }

  private checkLevel4Completion(repo: GitRepository, commandHistory: TerminalCommand[]): boolean {
    const successfulCommands = commandHistory.filter(cmd => cmd.success);
    
    const hasRevertOrReset = successfulCommands.some(cmd => 
      cmd.command.includes('git revert') || cmd.command.includes('git reset')
    );
    const hasLog = successfulCommands.some(cmd => cmd.command.includes('git log'));

    // Check that the "virus" file is no longer in the active files
    const hasCleanedVirus = !repo.files.some(file => 
      file.name.includes('virus') && !file.staged
    );

    return hasRevertOrReset && hasLog && hasCleanedVirus;
  }

  private checkLevel5Completion(repo: GitRepository, commandHistory: TerminalCommand[]): boolean {
    const successfulCommands = commandHistory.filter(cmd => cmd.success);
    
    const hasMerge = successfulCommands.some(cmd => cmd.command.includes('git merge'));
    const hasTag = successfulCommands.some(cmd => cmd.command.includes('git tag'));
    const hasPush = successfulCommands.some(cmd => cmd.command.includes('git push'));

    const hasMainBranch = repo.branches.some(b => b.name === 'main' && b.current);
    const hasMultipleCommits = repo.commits.length >= 3;

    return hasMerge && hasTag && hasPush && hasMainBranch && hasMultipleCommits;
  }

  getCompletionPercentage(level: Level, repo: GitRepository, commandHistory: TerminalCommand[]): number {
    switch (level.id) {
      case 1:
        return this.getLevel1Progress(repo, commandHistory);
      case 2:
        return this.getLevel2Progress(repo, commandHistory);
      case 3:
        return this.getLevel3Progress(repo, commandHistory);
      case 4:
        return this.getLevel4Progress(repo, commandHistory);
      case 5:
        return this.getLevel5Progress(repo, commandHistory);
      default:
        return 0;
    }
  }

  private getLevel1Progress(repo: GitRepository, commandHistory: TerminalCommand[]): number {
    let progress = 0;
    const successfulCommands = commandHistory.filter(cmd => cmd.success);

    if (successfulCommands.some(cmd => cmd.command.includes('git init'))) progress += 25;
    if (successfulCommands.some(cmd => cmd.command.includes('git config') && cmd.command.includes('user.name'))) progress += 25;
    if (successfulCommands.some(cmd => cmd.command.includes('git config') && cmd.command.includes('user.email'))) progress += 25;
    if (successfulCommands.some(cmd => cmd.command.includes('git status'))) progress += 25;

    return Math.min(progress, 100);
  }

  private getLevel2Progress(repo: GitRepository, commandHistory: TerminalCommand[]): number {
    let progress = 0;
    const successfulCommands = commandHistory.filter(cmd => cmd.success);

    if (repo.files.length > 0) progress += 25;
    if (successfulCommands.some(cmd => cmd.command.includes('git add'))) progress += 25;
    if (successfulCommands.some(cmd => cmd.command.includes('git commit'))) progress += 25;
    if (successfulCommands.some(cmd => cmd.command.includes('git log'))) progress += 25;

    return Math.min(progress, 100);
  }

  private getLevel3Progress(repo: GitRepository, commandHistory: TerminalCommand[]): number {
    let progress = 0;
    const successfulCommands = commandHistory.filter(cmd => cmd.success);

    if (successfulCommands.some(cmd => cmd.command.includes('git branch'))) progress += 33;
    if (successfulCommands.some(cmd => cmd.command.includes('git checkout'))) progress += 33;
    if (successfulCommands.some(cmd => cmd.command.includes('git merge'))) progress += 34;

    return Math.min(progress, 100);
  }

  private getLevel4Progress(repo: GitRepository, commandHistory: TerminalCommand[]): number {
    let progress = 0;
    const successfulCommands = commandHistory.filter(cmd => cmd.success);

    if (successfulCommands.some(cmd => cmd.command.includes('git log'))) progress += 33;
    if (successfulCommands.some(cmd => cmd.command.includes('git revert') || cmd.command.includes('git reset'))) progress += 34;
    if (!repo.files.some(file => file.name.includes('virus'))) progress += 33;

    return Math.min(progress, 100);
  }

  private getLevel5Progress(repo: GitRepository, commandHistory: TerminalCommand[]): number {
    let progress = 0;
    const successfulCommands = commandHistory.filter(cmd => cmd.success);

    if (successfulCommands.some(cmd => cmd.command.includes('git merge'))) progress += 33;
    if (successfulCommands.some(cmd => cmd.command.includes('git tag'))) progress += 33;
    if (successfulCommands.some(cmd => cmd.command.includes('git push'))) progress += 34;

    return Math.min(progress, 100);
  }
} 