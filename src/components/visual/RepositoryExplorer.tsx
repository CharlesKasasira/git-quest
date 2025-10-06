import React, { memo, useMemo, useCallback, useState } from 'react';
import { GitFile, GitRepository } from '../types/game';
import { 
  FileText, 
  Folder, 
  FolderOpen, 
  GitBranch, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Minus,
  Eye,
  Search
} from 'lucide-react';

interface RepositoryExplorerProps {
  repository: GitRepository;
  onFileSelect?: (file: GitFile) => void;
  className?: string;
}

interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  file?: GitFile;
  expanded?: boolean;
  path: string;
}

const RepositoryExplorer: React.FC<RepositoryExplorerProps> = memo(function RepositoryExplorer({
  repository,
  onFileSelect,
  className = ''
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null);

  // Build file tree structure
  const fileTree = useMemo((): FileTreeNode[] => {
    const tree: FileTreeNode[] = [];
    const pathMap: Record<string, FileTreeNode> = {};

    // Initialize root
    const root: FileTreeNode = {
      name: 'Repository',
      type: 'folder',
      children: [],
      path: '/',
      expanded: expandedFolders.has('/')
    };
    tree.push(root);
    pathMap['/'] = root;

    // Process files
    repository.files.forEach(file => {
      const pathParts = file.name.split('/');
      let currentPath = '/';
      let parentNode = root;

      pathParts.forEach((part, index) => {
        const newPath = currentPath === '/' ? `/${part}` : `${currentPath}/${part}`;
        
        if (index === pathParts.length - 1) {
          // This is a file
          const fileNode: FileTreeNode = {
            name: part,
            type: 'file',
            file,
            path: newPath
          };
          parentNode.children!.push(fileNode);
        } else {
          // This is a folder
          if (!pathMap[newPath]) {
            const folderNode: FileTreeNode = {
              name: part,
              type: 'folder',
              children: [],
              path: newPath,
              expanded: expandedFolders.has(newPath)
            };
            parentNode.children!.push(folderNode);
            pathMap[newPath] = folderNode;
          }
          parentNode = pathMap[newPath];
        }
        
        currentPath = newPath;
      });
    });

    return tree;
  }, [repository.files, expandedFolders]);

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!searchTerm) return fileTree;

    const filterTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.reduce((acc, node) => {
        if (node.type === 'file') {
          if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            acc.push(node);
          }
        } else {
          const filteredChildren = filterTree(node.children || []);
          if (filteredChildren.length > 0 || node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            acc.push({
              ...node,
              children: filteredChildren
            });
          }
        }
        return acc;
      }, [] as FileTreeNode[]);
    };

    return filterTree(fileTree);
  }, [fileTree, searchTerm]);

  const handleFolderToggle = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const handleFileClick = useCallback((file: GitFile) => {
    setSelectedFile(file);
    onFileSelect?.(file);
  }, [onFileSelect]);

  const getFileIcon = useCallback((file: GitFile) => {
    if (file.modified && !file.staged) return <AlertCircle className="w-4 h-4 text-terminal-warning" />;
    if (file.staged) return <CheckCircle className="w-4 h-4 text-terminal-primary" />;
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
  }, []);

  const getFolderIcon = useCallback((node: FileTreeNode) => {
    return node.expanded ? 
      <FolderOpen className="w-4 h-4 text-terminal-secondary" /> : 
      <Folder className="w-4 h-4 text-terminal-secondary" />;
  }, []);

  const renderTreeNode = useCallback((node: FileTreeNode, depth = 0) => {
    const indent = depth * 20;
    
    if (node.type === 'file' && node.file) {
      return (
        <div
          key={node.path}
          className={`flex items-center space-x-2 p-2 cursor-pointer hover:bg-terminal-secondary hover:bg-opacity-10 transition-colors ${
            selectedFile?.name === node.file.name ? 'bg-terminal-primary bg-opacity-20' : ''
          }`}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => handleFileClick(node.file!)}
        >
          {getFileIcon(node.file)}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-terminal-text truncate">{node.name}</div>
            <div className={`text-xs ${getFileStatusColor(node.file)}`}>
              {getFileStatus(node.file)}
            </div>
          </div>
          <Eye className="w-3 h-3 text-terminal-secondary" />
        </div>
      );
    }

    return (
      <div key={node.path}>
        <div
          className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-terminal-secondary hover:bg-opacity-10 transition-colors"
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => handleFolderToggle(node.path)}
        >
          {getFolderIcon(node)}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-terminal-text">{node.name}</div>
            <div className="text-xs text-terminal-secondary">
              {node.children?.length || 0} item{(node.children?.length || 0) !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        {node.expanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [selectedFile, handleFileClick, handleFolderToggle, getFileIcon, getFileStatus, getFileStatusColor, getFolderIcon]);

  return (
    <div className={`repository-explorer ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-mono text-terminal-primary mb-2">Repository Explorer</h3>
        <div className="text-sm text-terminal-secondary">
          {repository.files.length} file{repository.files.length !== 1 ? 's' : ''} • Branch: {repository.currentBranch}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-terminal-secondary" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent border border-terminal-secondary rounded text-terminal-text placeholder-terminal-secondary focus:border-terminal-primary focus:outline-none"
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="bg-black border border-terminal-primary rounded p-4 max-h-96 overflow-y-auto">
        {filteredTree.length === 0 ? (
          <div className="text-terminal-secondary text-sm italic">
            {searchTerm ? 'No files match your search' : 'No files in repository'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTree.map(node => renderTreeNode(node))}
          </div>
        )}
      </div>

      {/* File Statistics */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-3 bg-terminal-bg border border-terminal-primary rounded">
          <h4 className="text-terminal-primary font-mono mb-2">File Status</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-terminal-text">Total files:</span>
              <span className="text-terminal-secondary">{repository.files.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-terminal-text">Modified:</span>
              <span className="text-terminal-warning">
                {repository.files.filter(f => f.modified && !f.staged).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-terminal-text">Staged:</span>
              <span className="text-terminal-primary">
                {repository.files.filter(f => f.staged).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-terminal-text">Untracked:</span>
              <span className="text-terminal-secondary">
                {repository.files.filter(f => !f.staged && !f.modified).length}
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-terminal-bg border border-terminal-primary rounded">
          <h4 className="text-terminal-primary font-mono mb-2">Repository Info</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-terminal-text">Initialized:</span>
              <span className={repository.initialized ? 'text-terminal-primary' : 'text-terminal-error'}>
                {repository.initialized ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-terminal-text">Current branch:</span>
              <span className="text-terminal-secondary">{repository.currentBranch}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-terminal-text">Commits:</span>
              <span className="text-terminal-secondary">{repository.commits.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-terminal-text">Branches:</span>
              <span className="text-terminal-secondary">{repository.branches.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-3 h-3 text-terminal-primary" />
          <span className="text-terminal-text">Staged</span>
        </div>
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-3 h-3 text-terminal-warning" />
          <span className="text-terminal-text">Modified</span>
        </div>
        <div className="flex items-center space-x-2">
          <FileText className="w-3 h-3 text-terminal-secondary" />
          <span className="text-terminal-text">Untracked</span>
        </div>
        <div className="flex items-center space-x-2">
          <Folder className="w-3 h-3 text-terminal-secondary" />
          <span className="text-terminal-text">Folder</span>
        </div>
      </div>
    </div>
  );
});

export default RepositoryExplorer;
