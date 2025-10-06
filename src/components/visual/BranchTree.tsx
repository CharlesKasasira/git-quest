import React, { memo, useMemo, useCallback, useState } from 'react';
import { GitBranch, GitCommit } from '../types/game';
import { GitBranch as GitBranchIcon, GitMerge, GitCommit as GitCommitIcon } from 'lucide-react';

interface BranchTreeProps {
  branches: GitBranch[];
  currentBranch: string;
  onBranchSelect?: (branch: GitBranch) => void;
  className?: string;
}

interface BranchNode {
  branch: GitBranch;
  x: number;
  y: number;
  isCurrent: boolean;
  hasCommits: boolean;
  lastCommit?: GitCommit;
}

interface BranchConnection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  branch: string;
  isCurrent: boolean;
}

const BranchTree: React.FC<BranchTreeProps> = memo(function BranchTree({
  branches,
  currentBranch,
  onBranchSelect,
  className = ''
}) {
  const [hoveredBranch, setHoveredBranch] = useState<string | null>(null);

  // Calculate branch positions and connections
  const { nodes, connections } = useMemo(() => {
    const nodes: BranchNode[] = [];
    const connections: BranchConnection[] = [];
    
    const branchSpacing = 120;
    const startX = 50;
    const startY = 50;
    const verticalSpacing = 80;

    // Create branch nodes
    branches.forEach((branch, index) => {
      const isCurrent = branch.name === currentBranch;
      const lastCommit = branch.commits[branch.commits.length - 1];
      
      const node: BranchNode = {
        branch,
        x: startX + (index * branchSpacing),
        y: startY,
        isCurrent,
        hasCommits: branch.commits.length > 0,
        lastCommit
      };
      
      nodes.push(node);

      // Create connections between branches (simplified)
      if (index > 0) {
        const prevBranch = branches[index - 1];
        connections.push({
          from: { x: startX + ((index - 1) * branchSpacing), y: startY },
          to: { x: startX + (index * branchSpacing), y: startY },
          branch: branch.name,
          isCurrent
        });
      }
    });

    return { nodes, connections };
  }, [branches, currentBranch]);

  const handleBranchClick = useCallback((branch: GitBranch) => {
    onBranchSelect?.(branch);
  }, [onBranchSelect]);

  const handleBranchHover = useCallback((branchName: string | null) => {
    setHoveredBranch(branchName);
  }, []);

  const formatCommitMessage = useCallback((message: string): string => {
    return message.length > 25 ? message.substring(0, 25) + '...' : message;
  }, []);

  const formatTimestamp = useCallback((date: Date): string => {
    return date.toLocaleDateString();
  }, []);

  return (
    <div className={`branch-tree ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-mono text-terminal-primary mb-2">Branch Tree</h3>
        <div className="text-sm text-terminal-secondary">
          {branches.length} branch{branches.length !== 1 ? 'es' : ''} • Current: {currentBranch}
        </div>
      </div>

      <div className="relative bg-black border border-terminal-primary rounded p-4 overflow-auto">
        <svg
          width="100%"
          height={Math.max(200, branches.length * 100 + 100)}
          className="branch-tree-svg"
          viewBox={`0 0 ${Math.max(400, branches.length * 120 + 100)} ${Math.max(200, branches.length * 100 + 100)}`}
        >
          {/* Branch connections */}
          {connections.map((connection, index) => (
            <line
              key={`connection-${index}`}
              x1={connection.from.x}
              y1={connection.from.y}
              x2={connection.to.x}
              y2={connection.to.y}
              stroke={connection.isCurrent ? '#00ff41' : '#00d4aa'}
              strokeWidth="2"
              strokeDasharray={connection.isCurrent ? '0' : '5,5'}
            />
          ))}

          {/* Branch nodes */}
          {nodes.map((node) => (
            <g key={node.branch.name}>
              {/* Branch circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r="20"
                fill={node.isCurrent ? '#00ff41' : '#00d4aa'}
                stroke={hoveredBranch === node.branch.name ? '#ffffff' : '#333333'}
                strokeWidth={hoveredBranch === node.branch.name ? '3' : '2'}
                className="cursor-pointer transition-all duration-200 hover:r-24"
                onClick={() => handleBranchClick(node.branch)}
                onMouseEnter={() => handleBranchHover(node.branch.name)}
                onMouseLeave={() => handleBranchHover(null)}
              />
              
              {/* Branch icon */}
              <text
                x={node.x}
                y={node.y + 6}
                textAnchor="middle"
                className="text-white font-bold"
                fontSize="16"
              >
                {node.isCurrent ? '●' : '○'}
              </text>
              
              {/* Branch name */}
              <text
                x={node.x}
                y={node.y - 30}
                textAnchor="middle"
                className={`text-sm font-mono ${
                  node.isCurrent ? 'fill-terminal-primary' : 'fill-terminal-text'
                }`}
              >
                {node.branch.name}
              </text>

              {/* Commit count */}
              <text
                x={node.x}
                y={node.y + 35}
                textAnchor="middle"
                className="text-xs fill-terminal-secondary"
              >
                {node.branch.commits.length} commit{node.branch.commits.length !== 1 ? 's' : ''}
              </text>
            </g>
          ))}
        </svg>

        {/* Branch details tooltip */}
        {hoveredBranch && (
          <div className="absolute top-2 right-2 bg-terminal-bg border border-terminal-primary rounded p-3 max-w-xs">
            {(() => {
              const branch = branches.find(b => b.name === hoveredBranch);
              if (!branch) return null;
              
              return (
                <div className="text-xs">
                  <div className="text-terminal-primary font-mono mb-1">{branch.name}</div>
                  <div className="text-terminal-text mb-2">
                    {branch.commits.length} commit{branch.commits.length !== 1 ? 's' : ''}
                  </div>
                  {branch.lastCommit && (
                    <div>
                      <div className="text-terminal-secondary mb-1">Last commit:</div>
                      <div className="text-terminal-text text-xs">
                        {formatCommitMessage(branch.lastCommit.message)}
                      </div>
                      <div className="text-terminal-secondary text-xs">
                        {formatTimestamp(branch.lastCommit.timestamp)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Branch list */}
      <div className="mt-4 space-y-2">
        {branches.map((branch) => (
          <div
            key={branch.name}
            className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-all ${
              branch.name === currentBranch
                ? 'border-terminal-primary bg-terminal-primary bg-opacity-20'
                : 'border-terminal-secondary bg-terminal-secondary bg-opacity-10 hover:bg-opacity-20'
            }`}
            onClick={() => handleBranchClick(branch)}
          >
            <div className="flex items-center space-x-3">
              {branch.name === currentBranch ? (
                <GitBranchIcon className="w-5 h-5 text-terminal-primary" />
              ) : (
                <GitBranchIcon className="w-5 h-5 text-terminal-secondary" />
              )}
              <div>
                <div className={`font-mono ${
                  branch.name === currentBranch ? 'text-terminal-primary' : 'text-terminal-text'
                }`}>
                  {branch.name}
                </div>
                <div className="text-xs text-terminal-secondary">
                  {branch.commits.length} commit{branch.commits.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {branch.commits.length > 0 && (
                <div className="flex items-center space-x-1 text-xs text-terminal-secondary">
                  <GitCommitIcon className="w-3 h-3" />
                  <span>{branch.commits.length}</span>
                </div>
              )}
              {branch.name === currentBranch && (
                <div className="w-2 h-2 rounded-full bg-terminal-primary"></div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Branch operations info */}
      <div className="mt-4 p-3 bg-terminal-bg border border-terminal-primary rounded">
        <h4 className="text-terminal-primary font-mono mb-2">Branch Operations</h4>
        <div className="text-xs text-terminal-secondary space-y-1">
          <div>• <code className="text-terminal-primary">git branch</code> - List branches</div>
          <div>• <code className="text-terminal-primary">git branch &lt;name&gt;</code> - Create branch</div>
          <div>• <code className="text-terminal-primary">git checkout &lt;name&gt;</code> - Switch branch</div>
          <div>• <code className="text-terminal-primary">git merge &lt;name&gt;</code> - Merge branch</div>
        </div>
      </div>
    </div>
  );
});

export default BranchTree;
