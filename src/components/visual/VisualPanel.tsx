import React, { memo, useState, useCallback, useMemo } from 'react';
import { useTerminal } from '../../contexts/TerminalContext';
import { useGame } from '../../contexts/GameContext';
import CommitGraph from './CommitGraph';
import FileStateVisualizer from './FileStateVisualizer';
import BranchTree from './BranchTree';
import DiffViewer from './DiffViewer';
import RepositoryExplorer from './RepositoryExplorer';
import VersionControlIntro from '../education/VersionControlIntro';
import { 
  GitBranch, 
  FileText, 
  GitCommit, 
  Eye, 
  BookOpen,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { GitFile } from '../../types/game';

interface VisualPanelProps {
  className?: string;
}

type VisualMode = 
  | 'intro' 
  | 'commit-graph' 
  | 'file-states' 
  | 'branch-tree' 
  | 'diff-viewer' 
  | 'repo-explorer'
  | 'all';

const VisualPanel: React.FC<VisualPanelProps> = memo(function VisualPanel({
  className = ''
}) {
  const { terminalState } = useTerminal();
  const { currentLevel } = useGame();
  const [activeMode, setActiveMode] = useState<VisualMode>('intro');
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const latestCommand = terminalState.history[terminalState.history.length - 1];
  const latestVisualChanges = latestCommand?.visualChanges ?? [];
  const highlightedFiles = useMemo(
    () =>
      latestVisualChanges
        .filter((change) => change.area === 'files' || change.area === 'staging')
        .flatMap((change) => change.names ?? []),
    [latestVisualChanges]
  );
  const highlightedBranches = useMemo(
    () =>
      latestVisualChanges
        .filter((change) => change.area === 'branches')
        .flatMap((change) => change.names ?? []),
    [latestVisualChanges]
  );
  const highlightedCommits = useMemo(
    () =>
      latestVisualChanges
        .filter((change) => change.area === 'commits')
        .flatMap((change) => change.names ?? []),
    [latestVisualChanges]
  );

  const visualModes = [
    { id: 'intro', label: 'Introduction', icon: BookOpen, description: 'Learn version control basics' },
    { id: 'commit-graph', label: 'Commit Graph', icon: GitCommit, description: 'Visualize commit history' },
    { id: 'file-states', label: 'File States', icon: FileText, description: 'Understand Git workflow' },
    { id: 'branch-tree', label: 'Branch Tree', icon: GitBranch, description: 'Explore branch relationships' },
    { id: 'diff-viewer', label: 'Diff Viewer', icon: Eye, description: 'Compare file changes' },
    { id: 'repo-explorer', label: 'Repository', icon: FileText, description: 'Browse project files' }
  ];

  const handleModeChange = useCallback((mode: VisualMode) => {
    setActiveMode(mode);
  }, []);

  const handleFileSelect = useCallback((file: GitFile) => {
    setSelectedFile(file);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const renderVisualContent = useCallback(() => {
    switch (activeMode) {
      case 'intro':
        return (
          <VersionControlIntro 
            onComplete={() => setActiveMode('commit-graph')}
          />
        );
      
      case 'commit-graph':
        return (
          <CommitGraph
            commits={terminalState.currentRepo.commits}
            branches={terminalState.currentRepo.branches}
            currentBranch={terminalState.currentRepo.currentBranch}
            selectedCommit={highlightedCommits[highlightedCommits.length - 1]}
            onCommitSelect={(commit) => console.log('Selected commit:', commit)}
          />
        );
      
      case 'file-states':
        return (
          <FileStateVisualizer
            repository={terminalState.currentRepo}
            highlightedFiles={highlightedFiles}
            onFileSelect={handleFileSelect}
          />
        );
      
      case 'branch-tree':
        return (
          <BranchTree
            branches={terminalState.currentRepo.branches}
            currentBranch={terminalState.currentRepo.currentBranch}
            highlightedBranches={highlightedBranches}
            onBranchSelect={(branch) => console.log('Selected branch:', branch)}
          />
        );
      
      case 'diff-viewer':
        return (
          <DiffViewer
            files={terminalState.currentRepo.files}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
          />
        );
      
      case 'repo-explorer':
        return (
          <RepositoryExplorer
            repository={terminalState.currentRepo}
            highlightedFiles={highlightedFiles}
            onFileSelect={handleFileSelect}
          />
        );
      
      case 'all':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <CommitGraph
                commits={terminalState.currentRepo.commits}
                branches={terminalState.currentRepo.branches}
                currentBranch={terminalState.currentRepo.currentBranch}
                selectedCommit={highlightedCommits[highlightedCommits.length - 1]}
                onCommitSelect={(commit) => console.log('Selected commit:', commit)}
              />
              <FileStateVisualizer
                repository={terminalState.currentRepo}
                highlightedFiles={highlightedFiles}
                onFileSelect={handleFileSelect}
              />
            </div>
            <div className="space-y-6">
              <BranchTree
                branches={terminalState.currentRepo.branches}
                currentBranch={terminalState.currentRepo.currentBranch}
                highlightedBranches={highlightedBranches}
                onBranchSelect={(branch) => console.log('Selected branch:', branch)}
              />
              <DiffViewer
                files={terminalState.currentRepo.files}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  }, [activeMode, terminalState.currentRepo, selectedFile, handleFileSelect, highlightedFiles, highlightedBranches, highlightedCommits]);

  const currentMode = visualModes.find(mode => mode.id === activeMode);

  return (
    <div className={`visual-panel ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-terminal-primary bg-terminal-bg">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-pixel text-terminal-primary">Visual Learning</h2>
          {currentMode && (
            <div className="flex items-center space-x-2">
              <currentMode.icon className="w-5 h-5 text-terminal-secondary" />
              <span className="text-terminal-secondary">{currentMode.label}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-terminal-secondary hover:text-terminal-primary transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="p-4 border-b border-terminal-primary bg-terminal-bg">
        <div className="flex flex-wrap gap-2">
          {visualModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode.id as VisualMode)}
              className={`flex items-center space-x-2 px-3 py-2 rounded border transition-all ${
                activeMode === mode.id
                  ? 'border-terminal-primary text-terminal-primary bg-terminal-primary bg-opacity-20'
                  : 'border-terminal-secondary text-terminal-secondary hover:border-terminal-primary hover:text-terminal-primary'
              }`}
            >
              <mode.icon className="w-4 h-4" />
              <span className="text-sm">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`p-6 ${isFullscreen ? 'h-full overflow-y-auto' : 'max-h-96 overflow-y-auto'}`}>
        {latestVisualChanges.length > 0 && (
          <div className="mb-4 border border-terminal-secondary bg-black rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-terminal-primary font-mono">Last Command Visual Sync</h3>
              <span className="text-terminal-secondary text-xs font-mono">
                {latestCommand?.command}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {latestVisualChanges.map((change, index) => (
                <div key={`${change.area}-${index}`} className="border border-terminal-secondary border-opacity-40 rounded p-2">
                  <div className="text-xs uppercase text-terminal-secondary mb-1">
                    {change.area}
                  </div>
                  <div className="text-sm text-terminal-primary">{change.label}</div>
                  <div className="text-xs text-terminal-text mt-1">{change.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {renderVisualContent()}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-terminal-primary bg-terminal-bg">
        <div className="flex items-center justify-between text-sm text-terminal-secondary">
          <div>
            {currentLevel && (
              <span>Level {currentLevel.id}: {currentLevel.title}</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>Repository: {terminalState.currentRepo.initialized ? 'Initialized' : 'Not initialized'}</span>
            <span>Branch: {terminalState.currentRepo.currentBranch || 'None'}</span>
            <span>Files: {terminalState.currentRepo.files.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VisualPanel;
