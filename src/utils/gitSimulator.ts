import { GitRepository, GitCommit, GitFile, GitBranch } from '../types/game';

interface CommandResult {
  output: string;
  success: boolean;
  newRepo?: GitRepository;
}

export class GitSimulator {
  private generateCommitHash(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  private getCurrentTimestamp(): Date {
    return new Date();
  }

  private createCommit(message: string, files: string[], author: string): GitCommit {
    return {
      hash: this.generateCommitHash(),
      message,
      author,
      timestamp: this.getCurrentTimestamp(),
      files,
    };
  }

  private formatFileList(files: GitFile[]): string {
    if (files.length === 0) {
      return 'nothing to commit, working tree clean';
    }

    const untracked = files.filter(f => !f.staged && f.modified);
    const staged = files.filter(f => f.staged);
    const modified = files.filter(f => !f.staged && f.modified);

    let output = '';
    
    if (staged.length > 0) {
      output += '\nChanges to be committed:\n';
      staged.forEach(f => {
        output += `  new file:   ${f.name}\n`;
      });
    }

    if (modified.length > 0) {
      output += '\nChanges not staged for commit:\n';
      modified.forEach(f => {
        output += `  modified:   ${f.name}\n`;
      });
    }

    if (untracked.length > 0) {
      output += '\nUntracked files:\n';
      untracked.forEach(f => {
        output += `  ${f.name}\n`;
      });
    }

    return output;
  }

  // Enhanced command recognition
  private isGitCommand(command: string): boolean {
    const gitCommands = [
      'init', 'config', 'status', 'add', 'commit', 'log', 'branch', 'checkout', 'merge',
      'revert', 'reset', 'tag', 'push', 'pull', 'fetch', 'clone', 'remote', 'stash',
      'rebase', 'cherry-pick', 'blame', 'diff', 'show', 'help', 'version', '--help',
      '--version', 'switch', 'restore', 'stash', 'clean', 'mv', 'rm', 'bisect',
      'reflog', 'worktree', 'submodule', 'notes', 'replace', 'gc', 'fsck', 'prune'
    ];
    return gitCommands.includes(command.toLowerCase());
  }

  executeCommand(command: string, args: string[], repo: GitRepository): CommandResult {
    // Handle direct Git commands (e.g., "git init")
    if (command.toLowerCase() === 'git') {
      return this.handleGitCommand(args, repo);
    }
    
    // Handle commands that start with git (e.g., "gitinit" -> "git init")
    if (command.toLowerCase().startsWith('git')) {
      const gitCommand = command.toLowerCase().replace('git', '').trim();
      if (gitCommand) {
        return this.handleGitCommand([gitCommand, ...args], repo);
      }
    }

    // Check if it's a recognized Git command
    if (this.isGitCommand(command)) {
      return this.handleGitCommand([command, ...args], repo);
    }

    // Handle common shell commands
    switch (command.toLowerCase()) {
      case 'ls':
      case 'dir':
        return this.handleLsCommand(repo);
      case 'pwd':
        return this.handlePwdCommand(repo);
      case 'clear':
        return {
          output: '\n'.repeat(50), // Clear screen effect
          success: true,
        };
      case 'help':
        return this.handleHelpCommand();
      case 'echo':
        return {
          output: args.join(' '),
          success: true,
        };
      default:
        return {
          output: `Command not found: ${command}. Type 'help' for available commands or 'git --help' for Git commands.`,
          success: false,
        };
    }
  }

  private handleGitCommand(args: string[], repo: GitRepository): CommandResult {
    if (args.length === 0) {
      return {
        output: 'usage: git [--version] [--help] [-C <path>] [-c <name>=<value>]\n           [--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]\n           [-p | --paginate | -P | --no-pager] [--no-replace-objects] [--bare]\n           [--git-dir=<path>] [--work-tree=<path>] [--namespace=<name>]\n           <command> [<args>]\n\nThese are common Git commands used in various situations:\n\nstart a working area (see also: git help tutorial)\n   clone     Clone a repository into a new directory\n   init      Create an empty Git repository or reinitialize an existing one\n\nwork on the current change (see also: git help everyday)\n   add       Add file contents to the index\n   mv        Move or rename a file, a directory, or a symlink\n   reset     Reset current HEAD to the specified state\n   rm        Remove files from the working tree and from the index\n\nexamine the history and state (see also: git help revisions)\n   bisect    Use binary search to find the commit that introduced a bug\n   grep      Print lines matching a pattern\n   log       Show commit logs\n   show      Show various types of objects\n   status    Show the working tree status\n\ngrow, mark and tweak your common history\n   branch    List, create, or delete branches\n   checkout  Switch branches or restore working tree files\n   commit    Record changes to the repository\n   diff      Show changes between commits, commit and working tree, etc\n   merge     Join two or more development histories together\n   rebase    Reapply commits on top of another base tip\n   tag       Create, list, delete or verify a tag object signed with GPG',
        success: true,
      };
    }

    const subcommand = args[0].toLowerCase();
    const subArgs = args.slice(1);

    switch (subcommand) {
      case 'init':
        return this.gitInit(repo);
      case 'config':
        return this.gitConfig(subArgs, repo);
      case 'status':
        return this.gitStatus(repo);
      case 'add':
        return this.gitAdd(subArgs, repo);
      case 'commit':
        return this.gitCommit(subArgs, repo);
      case 'log':
        return this.gitLog(repo);
      case 'branch':
        return this.gitBranch(subArgs, repo);
      case 'checkout':
        return this.gitCheckout(subArgs, repo);
      case 'merge':
        return this.gitMerge(subArgs, repo);
      case 'revert':
        return this.gitRevert(subArgs, repo);
      case 'reset':
        return this.gitReset(subArgs, repo);
      case 'tag':
        return this.gitTag(subArgs, repo);
      case 'push':
        return this.gitPush(subArgs, repo);
      case 'pull':
        return this.gitPull(subArgs, repo);
      case 'fetch':
        return this.gitFetch(subArgs, repo);
      case 'clone':
        return this.gitClone(subArgs, repo);
      case 'remote':
        return this.gitRemote(subArgs, repo);
      case 'stash':
        return this.gitStash(subArgs, repo);
      case 'rebase':
        return this.gitRebase(subArgs, repo);
      case 'cherry-pick':
        return this.gitCherryPick(subArgs, repo);
      case 'blame':
        return this.gitBlame(subArgs, repo);
      case 'diff':
        return this.gitDiff(subArgs, repo);
      case 'show':
        return this.gitShow(subArgs, repo);
      case 'help':
        return this.gitHelp(subArgs);
      case '--help':
        return this.gitHelp(subArgs);
      case 'version':
      case '--version':
        return {
          output: 'git version 2.39.0',
          success: true,
        };
      case 'switch':
        return this.gitSwitch(subArgs, repo);
      case 'restore':
        return this.gitRestore(subArgs, repo);
      case 'clean':
        return this.gitClean(subArgs, repo);
      case 'mv':
        return this.gitMv(subArgs, repo);
      case 'rm':
        return this.gitRm(subArgs, repo);
      case 'bisect':
        return this.gitBisect(subArgs, repo);
      case 'reflog':
        return this.gitReflog(repo);
      case 'worktree':
        return this.gitWorktree(subArgs, repo);
      case 'submodule':
        return this.gitSubmodule(subArgs, repo);
      case 'notes':
        return this.gitNotes(subArgs, repo);
      case 'replace':
        return this.gitReplace(subArgs, repo);
      case 'gc':
        return this.gitGc(repo);
      case 'fsck':
        return this.gitFsck(repo);
      case 'prune':
        return this.gitPrune(repo);
      default:
        return {
          output: `git: '${subcommand}' is not a git command. See 'git --help'.\n\nThe most similar command is\n\tgit ${this.findSimilarCommand(subcommand)}`,
          success: false,
        };
    }
  }

  private findSimilarCommand(command: string): string {
    const commands = ['init', 'config', 'status', 'add', 'commit', 'log', 'branch', 'checkout', 'merge'];
    // Simple similarity check - in a real implementation, you'd use a proper algorithm
    return commands.find(cmd => cmd.startsWith(command) || command.startsWith(cmd)) || 'help';
  }

  // New Git command implementations
  private gitPull(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'Already up to date.',
      success: true,
      newRepo: repo,
    };
  }

  private gitFetch(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'From origin\n * [new branch]     main     -> origin/main',
      success: true,
      newRepo: repo,
    };
  }

  private gitClone(args: string[], repo: GitRepository): CommandResult {
    return {
      output: 'Cloning into \'timeline-project\'...\nremote: Counting objects: 100, done.\nremote: Compressing objects: 100% (100/100), done.\nremote: Total 100 (delta 0), reused 0 (delta 0), pack-reused 100\nReceiving objects: 100% (100/100), done.\nResolving deltas: 100% (0/0), done.',
      success: true,
      newRepo: repo,
    };
  }

  private gitRemote(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'origin\thttps://github.com/timeline/universe.git (fetch)\norigin\thttps://github.com/timeline/universe.git (push)',
      success: true,
    };
  }

  private gitStash(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'Saved working directory and index state WIP on main: abc1234 Initial commit',
      success: true,
      newRepo: repo,
    };
  }

  private gitRebase(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'Current branch main is up to date.',
      success: true,
      newRepo: repo,
    };
  }

  private gitCherryPick(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: '[main abc1234] Cherry-pick commit',
      success: true,
      newRepo: repo,
    };
  }

  private gitBlame(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'abc1234 (Timekeeper 2024-01-01 12:00:00 +0000 1) Timeline entry: Reality stabilization initiated...',
      success: true,
    };
  }

  private gitDiff(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'diff --git a/timeline.txt b/timeline.txt\nindex abc1234..def5678 100644\n--- a/timeline.txt\n+++ b/timeline.txt\n@@ -1,1 +1,1 @@\n-Timeline entry: Reality stabilization initiated...\n+Timeline entry: Reality stabilization completed!',
      success: true,
    };
  }

  private gitShow(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'commit abc1234\nAuthor: Timekeeper <timekeeper@universe.com>\nDate:   Mon Jan 1 12:00:00 2024 +0000\n\n    Initial timeline entry\n\ndiff --git a/timeline.txt b/timeline.txt\nnew file mode 100644\nindex 0000000..abc1234\n--- /dev/null\n+++ b/timeline.txt\n@@ -0,0 +1 @@\n+Timeline entry: Reality stabilization initiated...',
      success: true,
    };
  }

  private gitHelp(args: string[]): CommandResult {
    return {
      output: 'usage: git [--version] [--help] [-C <path>] [-c <name>=<value>]\n           [--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]\n           [-p | --paginate | -P | --no-pager] [--no-replace-objects] [--bare]\n           [--git-dir=<path>] [--work-tree=<path>] [--namespace=<name>]\n           <command> [<args>]\n\nThese are common Git commands used in various situations:\n\nstart a working area (see also: git help tutorial)\n   clone     Clone a repository into a new directory\n   init      Create an empty Git repository or reinitialize an existing one\n\nwork on the current change (see also: git help everyday)\n   add       Add file contents to the index\n   mv        Move or rename a file, a directory, or a symlink\n   reset     Reset current HEAD to the specified state\n   rm        Remove files from the working tree and from the index\n\nexamine the history and state (see also: git help revisions)\n   bisect    Use binary search to find the commit that introduced a bug\n   grep      Print lines matching a pattern\n   log       Show commit logs\n   show      Show various types of objects\n   status    Show the working tree status\n\ngrow, mark and tweak your common history\n   branch    List, create, or delete branches\n   checkout  Switch branches or restore working tree files\n   commit    Record changes to the repository\n   diff      Show changes between commits, commit and working tree, etc\n   merge     Join two or more development histories together\n   rebase    Reapply commits on top of another base tip\n   tag       Create, list, delete or verify a tag object signed with GPG',
      success: true,
    };
  }

  private gitSwitch(args: string[], repo: GitRepository): CommandResult {
    return this.gitCheckout(args, repo);
  }

  private gitRestore(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'Restored timeline.txt',
      success: true,
      newRepo: repo,
    };
  }

  private gitClean(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'Would remove virus.txt\n\nNote: This is a dry run. Use -f to force removal.',
      success: true,
      newRepo: repo,
    };
  }

  private gitMv(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'Renamed timeline.txt to timeline-backup.txt',
      success: true,
      newRepo: repo,
    };
  }

  private gitRm(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'rm \'virus.txt\'',
      success: true,
      newRepo: repo,
    };
  }

  private gitBisect(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'Bisecting: 0 revisions left to test after this (roughly 0 steps)',
      success: true,
      newRepo: repo,
    };
  }

  private gitReflog(repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'abc1234 HEAD@{0}: commit: Initial timeline entry\nabc1234 HEAD@{1}: checkout: moving from feature-fix to main',
      success: true,
    };
  }

  private gitWorktree(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: '/timeline-project  abc1234 [main]',
      success: true,
    };
  }

  private gitSubmodule(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'No submodules found.',
      success: true,
    };
  }

  private gitNotes(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'No notes found.',
      success: true,
    };
  }

  private gitReplace(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'No replacements found.',
      success: true,
    };
  }

  private gitGc(repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'Enumerating objects: 3, done.\nCounting objects: 100% (3/3), done.\nDelta compression using up to 8 threads.\nCompressing objects: 100% (2/2), done.\nWriting objects: 100% (3/3), done.\nTotal 3 (delta 0), reused 0 (delta 0), pack-reused 3',
      success: true,
      newRepo: repo,
    };
  }

  private gitFsck(repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'Checking object directories: 100% (256/256), done.\nChecking objects: 100% (3/3), done.',
      success: true,
    };
  }

  private gitPrune(repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }
    return {
      output: 'No unreferenced objects found.',
      success: true,
      newRepo: repo,
    };
  }

  // Original Git command implementations
  private gitInit(repo: GitRepository): CommandResult {
    if (repo.initialized) {
      return {
        output: 'Reinitialized existing Git repository in /timeline-project/.git/',
        success: true,
        newRepo: repo,
      };
    }

    const newRepo: GitRepository = {
      ...repo,
      initialized: true,
      branches: [{ name: 'main', commits: [], current: true }],
      currentBranch: 'main',
    };

    return {
      output: 'Initialized empty Git repository in /timeline-project/.git/',
      success: true,
      newRepo,
    };
  }

  private gitConfig(args: string[], repo: GitRepository): CommandResult {
    if (args.length < 2) {
      return {
        output: 'usage: git config [<options>] <name> [<value>]',
        success: false,
      };
    }

    const [flag, key, value] = args;
    
    if (flag !== '--global') {
      return {
        output: 'For this tutorial, please use --global flag',
        success: false,
      };
    }

    const newRepo = { ...repo };

    if (key === 'user.name' && value) {
      newRepo.config.userName = value.replace(/"/g, '');
      return {
        output: '',
        success: true,
        newRepo,
      };
    }

    if (key === 'user.email' && value) {
      newRepo.config.userEmail = value.replace(/"/g, '');
      return {
        output: '',
        success: true,
        newRepo,
      };
    }

    return {
      output: `Unknown config key: ${key}`,
      success: false,
    };
  }

  private gitStatus(repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    let output = `On branch ${repo.currentBranch}\n`;
    
    if (repo.commits.length === 0) {
      output += '\nNo commits yet\n';
    }

    output += this.formatFileList(repo.files);

    return {
      output,
      success: true,
    };
  }

  private gitAdd(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    if (args.length === 0) {
      return {
        output: 'Nothing specified, nothing added.',
        success: false,
      };
    }

    const filename = args[0];
    const newRepo = { ...repo };
    
    // Find or create the file
    let fileIndex = newRepo.files.findIndex(f => f.name === filename);
    
    if (fileIndex === -1) {
      // Create new file if it doesn't exist
      newRepo.files.push({
        name: filename,
        content: `Timeline entry: Reality stabilization initiated...`,
        staged: true,
        modified: false,
      });
    } else {
      // Stage existing file
      newRepo.files[fileIndex] = {
        ...newRepo.files[fileIndex],
        staged: true,
      };
    }

    return {
      output: '',
      success: true,
      newRepo,
    };
  }

  private gitCommit(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    const stagedFiles = repo.files.filter(f => f.staged);
    if (stagedFiles.length === 0) {
      return {
        output: 'nothing to commit, working tree clean',
        success: false,
      };
    }

    if (!repo.config.userName || !repo.config.userEmail) {
      return {
        output: 'Please tell me who you are.\n\nRun\n\n  git config --global user.email "you@example.com"\n  git config --global user.name "Your Name"',
        success: false,
      };
    }

    const messageIndex = args.indexOf('-m');
    if (messageIndex === -1 || messageIndex + 1 >= args.length) {
      return {
        output: 'Aborting commit due to empty commit message.',
        success: false,
      };
    }

    const message = args[messageIndex + 1].replace(/"/g, '');
    const author = `${repo.config.userName} <${repo.config.userEmail}>`;
    
    const commit = this.createCommit(
      message,
      stagedFiles.map(f => f.name),
      author
    );

    const newRepo = { ...repo };
    newRepo.commits.push(commit);
    
    // Update current branch
    const branchIndex = newRepo.branches.findIndex(b => b.name === repo.currentBranch);
    if (branchIndex !== -1) {
      newRepo.branches[branchIndex].commits.push(commit);
    }

    // Unstage files
    newRepo.files = newRepo.files.map(f => ({
      ...f,
      staged: false,
      modified: false,
    }));

    return {
      output: `[${repo.currentBranch} ${commit.hash}] ${message}\n ${stagedFiles.length} file${stagedFiles.length > 1 ? 's' : ''} changed`,
      success: true,
      newRepo,
    };
  }

  private gitLog(repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    if (repo.commits.length === 0) {
      return {
        output: 'fatal: your current branch \'main\' does not have any commits yet',
        success: false,
      };
    }

    let output = '';
    repo.commits.slice().reverse().forEach(commit => {
      output += `commit ${commit.hash}\n`;
      output += `Author: ${commit.author}\n`;
      output += `Date: ${commit.timestamp.toDateString()}\n\n`;
      output += `    ${commit.message}\n\n`;
    });

    return {
      output: output.trim(),
      success: true,
    };
  }

  private gitBranch(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    if (args.length === 0) {
      // List branches
      let output = '';
      repo.branches.forEach(branch => {
        const marker = branch.current ? '* ' : '  ';
        output += `${marker}${branch.name}\n`;
      });
      return {
        output: output.trim(),
        success: true,
      };
    }

    const branchName = args[0];
    const newRepo = { ...repo };

    // Check if branch already exists
    if (newRepo.branches.find(b => b.name === branchName)) {
      return {
        output: `fatal: A branch named '${branchName}' already exists.`,
        success: false,
      };
    }

    // Create new branch
    newRepo.branches.push({
      name: branchName,
      commits: [...repo.commits],
      current: false,
    });

    return {
      output: '',
      success: true,
      newRepo,
    };
  }

  private gitCheckout(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    if (args.length === 0) {
      return {
        output: 'usage: git checkout <branch>',
        success: false,
      };
    }

    const branchName = args[0];
    const branch = repo.branches.find(b => b.name === branchName);

    if (!branch) {
      return {
        output: `error: pathspec '${branchName}' did not match any file(s) known to git`,
        success: false,
      };
    }

    const newRepo = { ...repo };
    
    // Update current branch status
    newRepo.branches = newRepo.branches.map(b => ({
      ...b,
      current: b.name === branchName,
    }));

    newRepo.currentBranch = branchName;

    return {
      output: `Switched to branch '${branchName}'`,
      success: true,
      newRepo,
    };
  }

  private gitMerge(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    if (args.length === 0) {
      return {
        output: 'usage: git merge <branch>',
        success: false,
      };
    }

    const branchName = args[0];
    const branch = repo.branches.find(b => b.name === branchName);

    if (!branch) {
      return {
        output: `merge: ${branchName} - not something we can merge`,
        success: false,
      };
    }

    if (branch.current) {
      return {
        output: `Already on '${branchName}'`,
        success: false,
      };
    }

    // Simple merge simulation
    const newRepo = { ...repo };
    const currentBranch = newRepo.branches.find(b => b.current);
    
    if (currentBranch) {
      // Add commits from merged branch
      const newCommits = branch.commits.filter(
        bc => !currentBranch.commits.find(cc => cc.hash === bc.hash)
      );
      
      currentBranch.commits.push(...newCommits);
      newRepo.commits.push(...newCommits);
    }

    return {
      output: `Merge made by the 'recursive' strategy.\n 1 file changed, 1 insertion(+)`,
      success: true,
      newRepo,
    };
  }

  private gitRevert(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    if (args.length === 0) {
      return {
        output: 'usage: git revert <commit>',
        success: false,
      };
    }

    const commitHash = args[0];
    const commit = repo.commits.find(c => c.hash === commitHash);

    if (!commit) {
      return {
        output: `fatal: bad object ${commitHash}`,
        success: false,
      };
    }

    const newRepo = { ...repo };
    const revertCommit = this.createCommit(
      `Revert "${commit.message}"`,
      commit.files,
      `${repo.config.userName} <${repo.config.userEmail}>`
    );

    newRepo.commits.push(revertCommit);

    return {
      output: `[${repo.currentBranch} ${revertCommit.hash}] Revert "${commit.message}"`,
      success: true,
      newRepo,
    };
  }

  private gitReset(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    // Simple reset simulation - just message for now
    return {
      output: 'HEAD is now at previous commit',
      success: true,
      newRepo: repo,
    };
  }

  private gitTag(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    if (args.length === 0) {
      return {
        output: '', // No tags to list
        success: true,
      };
    }

    const tagName = args[0];
    return {
      output: `Created tag '${tagName}'`,
      success: true,
      newRepo: repo,
    };
  }

  private gitPush(args: string[], repo: GitRepository): CommandResult {
    if (!repo.initialized) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        success: false,
      };
    }

    return {
      output: 'Everything up-to-date\n\n🌟 Timeline successfully pushed to universal repository! 🌟',
      success: true,
      newRepo: repo,
    };
  }

  // Shell command handlers
  private handleLsCommand(repo: GitRepository): CommandResult {
    let output = '';
    if (repo.files.length > 0) {
      output += repo.files.map(f => f.name).join('  ') + '\n';
    } else {
      output += 'No files found.\n';
    }
    return {
      output,
      success: true,
    };
  }

  private handlePwdCommand(repo: GitRepository): CommandResult {
    return {
      output: repo.workingDirectory,
      success: true,
    };
  }

  private handleHelpCommand(): CommandResult {
    return {
      output: `Available commands:
  git [command]     - Git version control commands
  ls, dir          - List files
  pwd              - Show current directory
  clear            - Clear screen
  echo [text]      - Display text
  help             - Show this help

Git commands: init, config, status, add, commit, log, branch, checkout, merge, revert, reset, tag, push, pull, fetch, clone, remote, stash, rebase, cherry-pick, blame, diff, show, help, version, switch, restore, clean, mv, rm, bisect, reflog, worktree, submodule, notes, replace, gc, fsck, prune

Type 'git --help' for detailed Git command information.`,
      success: true,
    };
  }
} 