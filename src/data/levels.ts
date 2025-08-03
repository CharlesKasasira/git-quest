import { Level, GitRepository } from '../types/game';

const createInitialRepo = (initialized = false): GitRepository => ({
  initialized,
  files: [],
  branches: initialized ? [{ name: 'main', commits: [], current: true }] : [],
  currentBranch: initialized ? 'main' : '',
  commits: [],
  config: {},
  workingDirectory: '/timeline-project',
});

export const levelsData: Level[] = [
  {
    id: 1,
    title: "Initialize the Timeline",
    story: "The universe has lost memory of project origins. Reality itself is fragmenting without a proper foundation. As a Timekeeper Developer, you must create the very fabric of version control to begin restoring order.",
    objectives: [
      "Initialize a new Git repository with `git init`",
      "Configure your identity with `git config --global user.name \"Your Name\"`",
      "Configure your email with `git config --global user.email \"your.email@example.com\"`",
      "Check the repository status with `git status`"
    ],
    expectedCommands: ["git init", "git config", "git status"],
    initialRepo: createInitialRepo(false),
    hints: {
      "git init": "This command creates a new Git repository in the current directory. It's the first step to start tracking changes.",
      "git config": "Use this to set your identity. Git needs to know who you are for every commit. Use --global flag to set it system-wide.",
      "git status": "Shows the current state of your repository - which files are tracked, modified, or staged."
    },
    completed: false,
    unlocked: true,
  },
  {
    id: 2,
    title: "Secure the Source",
    story: "Chaotic changes are flying around the repository like temporal anomalies. Files are appearing and disappearing without warning. You must capture these changes and secure them in the timeline before they're lost forever.",
    objectives: [
      "Create a new file called `timeline.txt` with some content",
      "Add the file to staging with `git add timeline.txt`",
      "Commit your changes with `git commit -m \"Initial timeline entry\"`",
      "View the commit history with `git log`"
    ],
    expectedCommands: ["git add", "git commit", "git log"],
    initialRepo: {
      ...createInitialRepo(true),
      files: [
        { name: 'timeline.txt', content: 'Timeline entry: Reality stabilization initiated...', staged: false, modified: false }
      ],
    },
    hints: {
      "git add": "Stages files for commit. Think of it as preparing files to be 'photographed' in a commit snapshot.",
      "git commit": "Creates a snapshot of your staged changes. Always include a meaningful message with -m flag.",
      "git log": "Shows the history of commits. Each commit is a point in time you can return to."
    },
    completed: false,
    unlocked: false,
  },
  {
    id: 3,
    title: "The Forked Realities",
    story: "Two parallel timelines have developed independently, each containing crucial fixes for the temporal crisis. You must navigate between these realities and merge them without causing a paradox that could tear the universe apart.",
    objectives: [
      "Create a new branch called `feature-fix` with `git branch feature-fix`",
      "Switch to the new branch with `git checkout feature-fix`",
      "Make changes and commit them to the feature branch",
      "Switch back to main and merge the feature branch with `git merge feature-fix`",
      "Resolve any merge conflicts that arise"
    ],
    expectedCommands: ["git branch", "git checkout", "git merge"],
    initialRepo: {
      ...createInitialRepo(true),
      files: [
        { name: 'timeline.txt', content: 'Timeline entry: Reality stabilization initiated...', staged: false, modified: false },
        { name: 'config.txt', content: 'System configuration: stable', staged: false, modified: false }
      ],
      commits: [
        {
          hash: 'abc123',
          message: 'Initial timeline entry',
          author: 'Timekeeper',
          timestamp: new Date(),
          files: ['timeline.txt']
        }
      ],
    },
    hints: {
      "git branch": "Creates a new branch. Branches let you work on features independently without affecting the main timeline.",
      "git checkout": "Switches between branches. You can also use 'git switch' in newer Git versions.",
      "git merge": "Combines changes from one branch into another. This is how separate timelines become unified."
    },
    completed: false,
    unlocked: false,
  },
  {
    id: 4,
    title: "Undo the Doomsday Commit",
    story: "A malicious commit has corrupted the timeline, introducing chaos that threatens to cascade through all of history. You must carefully undo this damage without losing the good changes that came before and after.",
    objectives: [
      "Identify the problematic commit using `git log`",
      "Revert the bad commit with `git revert <commit-hash>`",
      "Alternatively, use `git reset` to undo changes (be careful!)",
      "Verify the timeline is restored with `git status` and `git log`"
    ],
    expectedCommands: ["git revert", "git reset", "git log"],
    initialRepo: {
      ...createInitialRepo(true),
      files: [
        { name: 'timeline.txt', content: 'Timeline entry: Reality stabilization initiated...', staged: false, modified: false },
        { name: 'virus.txt', content: 'CHAOS VIRUS: CORRUPTING TIMELINE...', staged: false, modified: false }
      ],
      commits: [
        {
          hash: 'abc123',
          message: 'Initial timeline entry',
          author: 'Timekeeper',
          timestamp: new Date(),
          files: ['timeline.txt']
        },
        {
          hash: 'def456',
          message: 'Add configuration',
          author: 'Timekeeper',
          timestamp: new Date(),
          files: ['config.txt']
        },
        {
          hash: 'danger789',
          message: 'DOOMSDAY COMMIT - DO NOT TRUST',
          author: 'Chaos Agent',
          timestamp: new Date(),
          files: ['virus.txt']
        }
      ],
    },
    hints: {
      "git revert": "Creates a new commit that undoes the changes from a previous commit. Safer than reset for public repositories.",
      "git reset": "Moves the current branch to a different commit. Can be dangerous as it rewrites history.",
      "git log": "Use this to identify commit hashes. Look for suspicious commits that need to be undone."
    },
    completed: false,
    unlocked: false,
  },
  {
    id: 5,
    title: "Merge the Final Timeline",
    story: "All the fixes exist across multiple branches scattered through time and space. This is the final convergence - you must merge all timelines into one stable reality and seal it with a release tag to prevent future corruption.",
    objectives: [
      "Merge all remaining feature branches into main",
      "Resolve any final conflicts that arise",
      "Create a release tag with `git tag v1.0.0`",
      "Clean up merged branches with `git branch -d <branch-name>`",
      "Push the final timeline to establish it as the true reality"
    ],
    expectedCommands: ["git merge", "git tag", "git branch", "git push"],
    initialRepo: {
      ...createInitialRepo(true),
      files: [
        { name: 'timeline.txt', content: 'Timeline entry: Reality stabilization initiated...', staged: false, modified: false },
        { name: 'config.txt', content: 'System configuration: stable', staged: false, modified: false },
        { name: 'security.txt', content: 'Security protocols: active', staged: false, modified: false }
      ],
      branches: [
        { name: 'main', commits: [], current: true },
        { name: 'feature-security', commits: [], current: false },
        { name: 'hotfix-stability', commits: [], current: false }
      ],
      commits: [
        {
          hash: 'abc123',
          message: 'Initial timeline entry',
          author: 'Timekeeper',
          timestamp: new Date(),
          files: ['timeline.txt']
        },
        {
          hash: 'def456',
          message: 'Add configuration',
          author: 'Timekeeper',
          timestamp: new Date(),
          files: ['config.txt']
        }
      ],
    },
    hints: {
      "git merge": "Combine different branches. Each branch might contain different pieces of the solution.",
      "git tag": "Creates a named reference to a specific commit. Tags are perfect for marking releases.",
      "git branch -d": "Deletes a branch after it's been merged. Keeps your timeline clean and organized.",
      "git push": "In a real scenario, this would upload your changes to a remote repository."
    },
    completed: false,
    unlocked: false,
  },
]; 