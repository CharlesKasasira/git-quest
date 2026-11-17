export interface StoryObjectiveGuide {
  commands: string[];
  why: string;
}

export interface StoryChapter {
  id: number;
  sector: string;
  roomLabel: string;
  completionTitle: string;
  completionSummary: string;
  guides: StoryObjectiveGuide[];
}

export const storyChapters: StoryChapter[] = [
  {
    id: 1,
    sector: 'ORIGIN CHAMBER',
    roomLabel: 'CHRONO ARCHIVE // ORIGIN CHAMBER',
    completionTitle: 'ORIGIN REMEMBERED',
    completionSummary:
      'You gave the archive a repository, recovered its files, registered an author, and inspected its state.',
    guides: [
      {
        commands: ['git init'],
        why: 'git init creates the hidden repository where Git can begin recording history.',
      },
      {
        commands: ['git config --global user.name "Timekeeper"'],
        why: 'Git records an author on every commit, so collaborators know who made each change.',
      },
      {
        commands: ['git config --global user.email "timekeeper@gitquest.dev"'],
        why: 'Git combines your name and email to identify the author of future commits.',
      },
      {
        commands: ['git status'],
        why: 'git status is the safest navigation tool: it reports what changed and what Git expects next.',
      },
    ],
  },
  {
    id: 2,
    sector: 'SOURCE VAULT',
    roomLabel: 'CHRONO ARCHIVE // SOURCE VAULT',
    completionTitle: 'SOURCE SECURED',
    completionSummary:
      'You captured a loose file, staged it deliberately, committed a stable snapshot, and verified its place in history.',
    guides: [
      {
        commands: ['echo "Reality stabilization initiated" > timeline.txt'],
        why: 'A working file is raw history. Git can see it, but it is not part of a snapshot until you stage and commit it.',
      },
      {
        commands: ['git add timeline.txt'],
        why: 'git add moves the chosen file into the staging area—the exact contents of the next snapshot.',
      },
      {
        commands: ['git commit -m "Initial timeline entry"'],
        why: 'A commit turns staged changes into a durable, named point in project history.',
      },
      {
        commands: ['git log'],
        why: 'git log lets you verify the commit and inspect the timeline you have created.',
      },
    ],
  },
  {
    id: 3,
    sector: 'FORK NEXUS',
    roomLabel: 'CHRONO ARCHIVE // FORK NEXUS',
    completionTitle: 'REALITIES REJOINED',
    completionSummary:
      'You isolated work on a branch, recorded its repair, returned to main, and merged both histories without losing either path.',
    guides: [
      {
        commands: ['git branch feature-fix'],
        why: 'A branch creates a safe parallel line of work without disturbing the main timeline.',
      },
      {
        commands: ['git checkout feature-fix'],
        why: 'Checking out a branch moves your working context to that branch so new commits belong to it.',
      },
      {
        commands: [
          'echo "Parallel reality repaired" >> timeline.txt',
          'git add timeline.txt',
          'git commit -m "Repair parallel reality"',
        ],
        why: 'The repair needs its own commit on feature-fix before it can be merged back into main.',
      },
      {
        commands: ['git checkout main', 'git merge feature-fix'],
        why: 'Return to the destination branch first, then merge the feature branch into it.',
      },
      {
        commands: ['git status'],
        why: 'A final status check confirms there are no unresolved files after the merge.',
      },
    ],
  },
  {
    id: 4,
    sector: 'DOOMSDAY VAULT',
    roomLabel: 'CHRONO ARCHIVE // DOOMSDAY VAULT',
    completionTitle: 'CORRUPTION REVERSED',
    completionSummary:
      'You inspected the evidence, identified the malicious commit, and reversed it without erasing the valid history around it.',
    guides: [
      {
        commands: ['git log'],
        why: 'Inspect history before changing it. The log reveals the suspicious commit and its hash.',
      },
      {
        commands: ['git revert danger789'],
        why: 'git revert safely creates a new commit that undoes the malicious change while preserving the audit trail.',
      },
      {
        commands: ['git revert danger789'],
        why: 'Revert is safer than rewriting shared history with reset, so it is the preferred repair here.',
      },
      {
        commands: ['git status', 'git log'],
        why: 'Verify both the clean working state and the new repair commit before leaving the vault.',
      },
    ],
  },
  {
    id: 5,
    sector: 'CONVERGENCE GATE',
    roomLabel: 'CHRONO ARCHIVE // CONVERGENCE GATE',
    completionTitle: 'TIMELINE WHOLE',
    completionSummary:
      'You converged the final branches, sealed the release with a tag, and pushed the restored timeline into the universal archive.',
    guides: [
      {
        commands: ['git merge feature-security', 'git merge hotfix-stability'],
        why: 'Merging brings the remaining repairs into main so the release contains every recovered timeline.',
      },
      {
        commands: ['git status'],
        why: 'Confirm the convergence is clean before sealing the release.',
      },
      {
        commands: ['git tag v1.0.0'],
        why: 'A tag gives this exact restored commit a permanent release name.',
      },
      {
        commands: ['git branch -d feature-security', 'git branch -d hotfix-stability'],
        why: 'Removing merged branches leaves the final timeline easy to navigate.',
      },
      {
        commands: ['git push'],
        why: 'The simulated push publishes the restored timeline to the universal archive.',
      },
    ],
  },
];

export const getStoryChapter = (levelId: number): StoryChapter =>
  storyChapters.find((chapter) => chapter.id === levelId) ?? storyChapters[0]!;
