import React, { memo, useMemo, useCallback, useState } from 'react';
import { GitFile } from '../types/game';
import { FileText, Plus, Minus, Edit3, Eye } from 'lucide-react';

interface DiffViewerProps {
  files: GitFile[];
  selectedFile?: GitFile;
  onFileSelect?: (file: GitFile) => void;
  className?: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'header';
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
}

const DiffViewer: React.FC<DiffViewerProps> = memo(function DiffViewer({
  files,
  selectedFile,
  onFileSelect,
  className = ''
}) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('split');

  // Generate diff content for selected file
  const diffContent = useMemo((): DiffLine[] => {
    if (!selectedFile) return [];

    const lines: DiffLine[] = [];
    
    // Add file header
    lines.push({
      type: 'header',
      content: `diff --git a/${selectedFile.name} b/${selectedFile.name}`
    });

    // Simulate file changes based on file state
    if (selectedFile.modified) {
      lines.push({
        type: 'context',
        content: `index 0000000..1234567 100644`
      });
      lines.push({
        type: 'context',
        content: `--- a/${selectedFile.name}`
      });
      lines.push({
        type: 'context',
        content: `+++ b/${selectedFile.name}`
      });
      lines.push({
        type: 'context',
        content: `@@ -1,3 +1,4 @@`
      });
      
      // Original content
      lines.push({
        type: 'context',
        content: ` ${selectedFile.content}`,
        oldLineNumber: 1,
        newLineNumber: 1
      });
      
      // Modified content
      lines.push({
        type: 'added',
        content: `+${selectedFile.content} (modified)`,
        newLineNumber: 2
      });
    } else if (selectedFile.staged) {
      lines.push({
        type: 'context',
        content: `index 0000000..1234567 100644`
      });
      lines.push({
        type: 'context',
        content: `--- /dev/null`
      });
      lines.push({
        type: 'context',
        content: `+++ b/${selectedFile.name}`
      });
      lines.push({
        type: 'context',
        content: `@@ -0,0 +1,1 @@`
      });
      lines.push({
        type: 'added',
        content: `+${selectedFile.content}`,
        newLineNumber: 1
      });
    } else {
      lines.push({
        type: 'context',
        content: `No changes to display`
      });
    }

    return lines;
  }, [selectedFile]);

  const handleFileClick = useCallback((file: GitFile) => {
    onFileSelect?.(file);
  }, [onFileSelect]);

  const getFileIcon = useCallback((file: GitFile) => {
    if (file.modified && !file.staged) return <Edit3 className="w-4 h-4 text-terminal-warning" />;
    if (file.staged) return <Plus className="w-4 h-4 text-terminal-primary" />;
    return <FileText className="w-4 h-4 text-terminal-secondary" />;
  }, []);

  const getFileStatus = useCallback((file: GitFile): string => {
    if (file.staged) return 'Staged';
    if (file.modified) return 'Modified';
    return 'Untracked';
  }, []);

  const getFileStatusColor = useCallback((file: GitFile): string => {
    if (file.staged) return 'text-terminal-primary';
    if (file.modified) return 'text-terminal-warning';
    return 'text-terminal-secondary';
  }, [file]);

  const getDiffLineColor = useCallback((line: DiffLine): string => {
    switch (line.type) {
      case 'added': return 'text-terminal-primary bg-terminal-primary bg-opacity-10';
      case 'removed': return 'text-terminal-error bg-terminal-error bg-opacity-10';
      case 'header': return 'text-terminal-secondary bg-terminal-bg';
      case 'context': return 'text-terminal-text';
      default: return 'text-terminal-text';
    }
  }, []);

  const getDiffLineIcon = useCallback((line: DiffLine) => {
    switch (line.type) {
      case 'added': return <Plus className="w-3 h-3 text-terminal-primary" />;
      case 'removed': return <Minus className="w-3 h-3 text-terminal-error" />;
      default: return null;
    }
  }, []);

  return (
    <div className={`diff-viewer ${className}`}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-mono text-terminal-primary">File Changes</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-xs rounded border transition-all ${
                viewMode === 'split'
                  ? 'border-terminal-primary text-terminal-primary bg-terminal-primary bg-opacity-20'
                  : 'border-terminal-secondary text-terminal-secondary hover:border-terminal-primary'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1 text-xs rounded border transition-all ${
                viewMode === 'unified'
                  ? 'border-terminal-primary text-terminal-primary bg-terminal-primary bg-opacity-20'
                  : 'border-terminal-secondary text-terminal-secondary hover:border-terminal-primary'
              }`}
            >
              Unified
            </button>
          </div>
        </div>
        <div className="text-sm text-terminal-secondary">
          View and compare file changes
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* File List */}
        <div className="bg-black border border-terminal-primary rounded p-4">
          <h4 className="text-terminal-primary font-mono mb-3">Files</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.length === 0 ? (
              <div className="text-terminal-secondary text-sm italic">
                No files to display
              </div>
            ) : (
              files.map((file, index) => (
                <div
                  key={`file-${index}`}
                  className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-all ${
                    selectedFile?.name === file.name
                      ? 'bg-terminal-primary bg-opacity-20 border border-terminal-primary'
                      : 'hover:bg-terminal-secondary hover:bg-opacity-10'
                  }`}
                  onClick={() => handleFileClick(file)}
                >
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-terminal-text truncate">{file.name}</div>
                    <div className={`text-xs ${getFileStatusColor(file)}`}>
                      {getFileStatus(file)}
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-terminal-secondary" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Diff Content */}
        <div className="bg-black border border-terminal-primary rounded p-4">
          <h4 className="text-terminal-primary font-mono mb-3">Changes</h4>
          <div className="max-h-64 overflow-y-auto">
            {!selectedFile ? (
              <div className="text-terminal-secondary text-sm italic">
                Select a file to view changes
              </div>
            ) : (
              <div className="font-mono text-xs">
                {diffContent.map((line, index) => (
                  <div
                    key={`diff-line-${index}`}
                    className={`flex items-start space-x-2 p-1 ${getDiffLineColor(line)}`}
                  >
                    <div className="flex items-center space-x-1 min-w-0 flex-shrink-0">
                      {getDiffLineIcon(line)}
                      {line.oldLineNumber && (
                        <span className="text-terminal-secondary text-xs w-8 text-right">
                          {line.oldLineNumber}
                        </span>
                      )}
                      {line.newLineNumber && (
                        <span className="text-terminal-secondary text-xs w-8 text-right">
                          {line.newLineNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="whitespace-pre-wrap break-words">
                        {line.content}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diff Statistics */}
      {selectedFile && (
        <div className="mt-4 p-3 bg-terminal-bg border border-terminal-primary rounded">
          <h4 className="text-terminal-primary font-mono mb-2">Statistics</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-terminal-primary font-mono">
                {diffContent.filter(line => line.type === 'added').length}
              </div>
              <div className="text-terminal-secondary text-xs">Additions</div>
            </div>
            <div className="text-center">
              <div className="text-terminal-error font-mono">
                {diffContent.filter(line => line.type === 'removed').length}
              </div>
              <div className="text-terminal-secondary text-xs">Deletions</div>
            </div>
            <div className="text-center">
              <div className="text-terminal-secondary font-mono">
                {diffContent.filter(line => line.type === 'context').length}
              </div>
              <div className="text-terminal-secondary text-xs">Context</div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <Plus className="w-3 h-3 text-terminal-primary" />
          <span className="text-terminal-text">Added lines</span>
        </div>
        <div className="flex items-center space-x-2">
          <Minus className="w-3 h-3 text-terminal-error" />
          <span className="text-terminal-text">Removed lines</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-terminal-secondary rounded"></div>
          <span className="text-terminal-text">Context lines</span>
        </div>
      </div>
    </div>
  );
});

export default DiffViewer;
