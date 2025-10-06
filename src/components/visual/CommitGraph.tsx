import React, { memo, useMemo, useCallback, useState } from 'react';
import { GitCommit, GitBranch } from '../types/game';

interface CommitGraphProps {
  commits: GitCommit[];
  branches: GitBranch[];
  currentBranch: string;
  selectedCommit?: string;
  onCommitSelect?: (commit: GitCommit) => void;
  className?: string;
}

interface CommitNode {
  id: string;
  x: number;
  y: number;
  commit: GitCommit;
  branch: string;
  isMerge: boolean;
  isCurrent: boolean;
}

interface BranchLine {
  from: { x: number; y: number };
  to: { x: number; y: number };
  branch: string;
  isCurrent: boolean;
}

const CommitGraph: React.FC<CommitGraphProps> = memo(function CommitGraph({
  commits,
  branches,
  currentBranch,
  selectedCommit,
  onCommitSelect,
  className = ''
}) {
  const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);

  // Calculate commit positions and relationships
  const { nodes, lines } = useMemo(() => {
    if (commits.length === 0) return { nodes: [], lines: [] };

    const nodes: CommitNode[] = [];
    const lines: BranchLine[] = [];
    
    // Group commits by branch
    const commitsByBranch = branches.reduce((acc, branch) => {
      acc[branch.name] = branch.commits;
      return acc;
    }, {} as Record<string, GitCommit[]>);

    // Calculate positions
    const commitSpacing = 80;
    const branchSpacing = 60;
    const startX = 50;
    const startY = 50;

    let maxY = startY;
    const branchPositions: Record<string, number> = {};

    // Initialize branch positions
    branches.forEach((branch, index) => {
      branchPositions[branch.name] = startX + (index * branchSpacing);
    });

    // Process commits chronologically
    const allCommits = [...commits].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    allCommits.forEach((commit, index) => {
      const branch = branches.find(b => b.commits.some(c => c.hash === commit.hash))?.name || currentBranch;
      const isCurrent = branch === currentBranch;
      const isMerge = commit.message.toLowerCase().includes('merge');
      
      const node: CommitNode = {
        id: commit.hash,
        x: branchPositions[branch],
        y: startY + (index * commitSpacing),
        commit,
        branch,
        isMerge,
        isCurrent
      };
      
      nodes.push(node);
      maxY = Math.max(maxY, node.y);

      // Create lines between commits
      if (index > 0) {
        const prevCommit = allCommits[index - 1];
        const prevBranch = branches.find(b => b.commits.some(c => c.hash === prevCommit.hash))?.name || currentBranch;
        
        if (prevBranch === branch) {
          // Same branch - vertical line
          lines.push({
            from: { x: branchPositions[branch], y: node.y - commitSpacing },
            to: { x: branchPositions[branch], y: node.y },
            branch,
            isCurrent
          });
        } else {
          // Different branch - diagonal line
          lines.push({
            from: { x: branchPositions[prevBranch], y: node.y - commitSpacing },
            to: { x: branchPositions[branch], y: node.y },
            branch,
            isCurrent
          });
        }
      }
    });

    return { nodes, lines };
  }, [commits, branches, currentBranch]);

  const handleCommitClick = useCallback((commit: GitCommit) => {
    onCommitSelect?.(commit);
  }, [onCommitSelect]);

  const handleCommitHover = useCallback((commitId: string | null) => {
    setHoveredCommit(commitId);
  }, []);

  const formatCommitMessage = useCallback((message: string): string => {
    return message.length > 30 ? message.substring(0, 30) + '...' : message;
  }, []);

  const formatTimestamp = useCallback((date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }, []);

  return (
    <div className={`commit-graph ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-mono text-terminal-primary mb-2">Commit History</h3>
        <div className="text-sm text-terminal-secondary">
          {commits.length} commit{commits.length !== 1 ? 's' : ''} • Current branch: {currentBranch}
        </div>
      </div>

      <div className="relative bg-black border border-terminal-primary rounded p-4 overflow-auto max-h-96">
        <svg
          width="100%"
          height={Math.max(200, nodes.length * 80 + 100)}
          className="commit-graph-svg"
          viewBox={`0 0 ${Math.max(400, branches.length * 60 + 100)} ${Math.max(200, nodes.length * 80 + 100)}`}
        >
          {/* Branch lines */}
          {lines.map((line, index) => (
            <line
              key={`line-${index}`}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke={line.isCurrent ? '#00ff41' : '#00d4aa'}
              strokeWidth="2"
              strokeDasharray={line.isCurrent ? '0' : '5,5'}
            />
          ))}

          {/* Commit nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              {/* Commit circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r="12"
                fill={node.isCurrent ? '#00ff41' : node.isMerge ? '#ffb86c' : '#00d4aa'}
                stroke={selectedCommit === node.id ? '#ff5555' : hoveredCommit === node.id ? '#ffffff' : '#333333'}
                strokeWidth={selectedCommit === node.id ? '3' : hoveredCommit === node.id ? '2' : '1'}
                className="cursor-pointer transition-all duration-200 hover:r-16"
                onClick={() => handleCommitClick(node.commit)}
                onMouseEnter={() => handleCommitHover(node.id)}
                onMouseLeave={() => handleCommitHover(null)}
              />
              
              {/* Commit hash label */}
              <text
                x={node.x}
                y={node.y - 20}
                textAnchor="middle"
                className="text-xs fill-terminal-text font-mono"
              >
                {node.commit.hash.substring(0, 7)}
              </text>
            </g>
          ))}

          {/* Branch labels */}
          {branches.map((branch, index) => (
            <text
              key={branch.name}
              x={50 + (index * 60)}
              y="30"
              textAnchor="middle"
              className={`text-sm font-mono ${
                branch.name === currentBranch ? 'fill-terminal-primary' : 'fill-terminal-secondary'
              }`}
            >
              {branch.name}
            </text>
          ))}
        </svg>

        {/* Commit details tooltip */}
        {hoveredCommit && (
          <div className="absolute top-2 right-2 bg-terminal-bg border border-terminal-primary rounded p-3 max-w-xs">
            {(() => {
              const commit = commits.find(c => c.hash === hoveredCommit);
              if (!commit) return null;
              
              return (
                <div className="text-xs">
                  <div className="text-terminal-primary font-mono mb-1">{commit.hash}</div>
                  <div className="text-terminal-text mb-1">{commit.message}</div>
                  <div className="text-terminal-secondary mb-1">Author: {commit.author}</div>
                  <div className="text-terminal-secondary">{formatTimestamp(commit.timestamp)}</div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-terminal-primary"></div>
          <span className="text-terminal-text">Current branch</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-terminal-secondary"></div>
          <span className="text-terminal-text">Other branches</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-terminal-warning"></div>
          <span className="text-terminal-text">Merge commits</span>
        </div>
      </div>
    </div>
  );
});

export default CommitGraph;
