import React, { memo, useMemo, useCallback } from 'react';
import { GitFile, GitRepository } from '../types/game';
import { FileText, Plus, CheckCircle, AlertCircle, GitBranch } from 'lucide-react';

interface FileStateVisualizerProps {
  repository: GitRepository;
  onFileSelect?: (file: GitFile) => void;
  className?: string;
}

interface FileState {
  working: GitFile[];
  staged: GitFile[];
  committed: GitFile[];
}

const FileStateVisualizer: React.FC<FileStateVisualizerProps> = memo(function FileStateVisualizer({
  repository,
  onFileSelect,
  className = ''
}) {
  // Categorize files by their Git state
  const fileStates = useMemo((): FileState => {
    const working = repository.files.filter(file => 
      !file.staged && (file.modified || !repository.initialized)
    );
    
    const staged = repository.files.filter(file => file.staged);
    
    const committed = repository.files.filter(file => 
      !file.staged && !file.modified && repository.initialized
    );

    return { working, staged, committed };
  }, [repository]);

  const handleFileClick = useCallback((file: GitFile) => {
    onFileSelect?.(file);
  }, [onFileSelect]);

  const getFileIcon = useCallback((file: GitFile) => {
    if (file.modified && !file.staged) return <AlertCircle className="w-4 h-4 text-terminal-warning" />;
    if (file.staged) return <CheckCircle className="w-4 h-4 text-terminal-primary" />;
    return <FileText className="w-4 h-4 text-terminal-secondary" />;
  }, []);

  const getFileStatus = useCallback((file: GitFile): string => {
    if (!repository.initialized) return 'Untracked';
    if (file.staged) return 'Staged';
    if (file.modified) return 'Modified';
    return 'Committed';
  }, [repository.initialized]);

  const getFileStatusColor = useCallback((file: GitFile): string => {
    if (!repository.initialized) return 'text-terminal-warning';
    if (file.staged) return 'text-terminal-primary';
    if (file.modified) return 'text-terminal-warning';
    return 'text-terminal-secondary';
  }, [repository.initialized]);

  return (
    <div className={`file-state-visualizer ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-mono text-terminal-primary mb-2">File States</h3>
        <div className="text-sm text-terminal-secondary">
          Understanding the three states of files in Git
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Working Directory */}
        <div className="bg-black border border-terminal-warning rounded p-4">
          <div className="flex items-center space-x-2 mb-3">
            <FileText className="w-5 h-5 text-terminal-warning" />
            <h4 className="text-terminal-warning font-mono">Working Directory</h4>
          </div>
          <div className="text-xs text-terminal-secondary mb-3">
            Files you're currently working on
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {fileStates.working.length === 0 ? (
              <div className="text-terminal-secondary text-sm italic">
                No modified files
              </div>
            ) : (
              fileStates.working.map((file, index) => (
                <div
                  key={`working-${index}`}
                  className="flex items-center space-x-2 p-2 bg-terminal-warning bg-opacity-10 rounded cursor-pointer hover:bg-opacity-20 transition-colors"
                  onClick={() => handleFileClick(file)}
                >
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-terminal-text truncate">{file.name}</div>
                    <div className={`text-xs ${getFileStatusColor(file)}`}>
                      {getFileStatus(file)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Staging Area */}
        <div className="bg-black border border-terminal-primary rounded p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="w-5 h-5 text-terminal-primary" />
            <h4 className="text-terminal-primary font-mono">Staging Area</h4>
          </div>
          <div className="text-xs text-terminal-secondary mb-3">
            Files ready to be committed
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {fileStates.staged.length === 0 ? (
              <div className="text-terminal-secondary text-sm italic">
                No staged files
              </div>
            ) : (
              fileStates.staged.map((file, index) => (
                <div
                  key={`staged-${index}`}
                  className="flex items-center space-x-2 p-2 bg-terminal-primary bg-opacity-10 rounded cursor-pointer hover:bg-opacity-20 transition-colors"
                  onClick={() => handleFileClick(file)}
                >
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-terminal-text truncate">{file.name}</div>
                    <div className={`text-xs ${getFileStatusColor(file)}`}>
                      {getFileStatus(file)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Repository */}
        <div className="bg-black border border-terminal-secondary rounded p-4">
          <div className="flex items-center space-x-2 mb-3">
            <GitBranch className="w-5 h-5 text-terminal-secondary" />
            <h4 className="text-terminal-secondary font-mono">Repository</h4>
          </div>
          <div className="text-xs text-terminal-secondary mb-3">
            Committed files in the repository
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {fileStates.committed.length === 0 ? (
              <div className="text-terminal-secondary text-sm italic">
                No committed files
              </div>
            ) : (
              fileStates.committed.map((file, index) => (
                <div
                  key={`committed-${index}`}
                  className="flex items-center space-x-2 p-2 bg-terminal-secondary bg-opacity-10 rounded cursor-pointer hover:bg-opacity-20 transition-colors"
                  onClick={() => handleFileClick(file)}
                >
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-terminal-text truncate">{file.name}</div>
                    <div className={`text-xs ${getFileStatusColor(file)}`}>
                      {getFileStatus(file)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Git Workflow Explanation */}
      <div className="mt-6 p-4 bg-terminal-bg border border-terminal-primary rounded">
        <h4 className="text-terminal-primary font-mono mb-3">Git Workflow</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-terminal-warning font-mono mb-1">1. Working Directory</div>
            <div className="text-terminal-secondary text-xs">
              Make changes to your files
            </div>
          </div>
          <div className="text-center">
            <div className="text-terminal-primary font-mono mb-1">2. Staging Area</div>
            <div className="text-terminal-secondary text-xs">
              Use <code className="text-terminal-primary">git add</code> to stage files
            </div>
          </div>
          <div className="text-center">
            <div className="text-terminal-secondary font-mono mb-1">3. Repository</div>
            <div className="text-terminal-secondary text-xs">
              Use <code className="text-terminal-primary">git commit</code> to save changes
            </div>
          </div>
        </div>
      </div>

      {/* File Statistics */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-terminal-warning"></div>
          <span className="text-terminal-text">
            {fileStates.working.length} working files
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-terminal-primary"></div>
          <span className="text-terminal-text">
            {fileStates.staged.length} staged files
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-terminal-secondary"></div>
          <span className="text-terminal-text">
            {fileStates.committed.length} committed files
          </span>
        </div>
      </div>
    </div>
  );
});

export default FileStateVisualizer;
