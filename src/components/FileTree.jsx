import React, { useState } from 'react';
import { Folder, File, Github, Search, Plus, ChevronRight, ChevronDown, FileText, Code, Settings, Package, Image, Database } from 'lucide-react';
import { pullRepo } from '../firebase';

const FileTree = ({ onFileSelect, selectedFile, files, onFilesLoaded, repoUrl, setRepoUrl }) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRepoInput, setShowRepoInput] = useState(false);
  const [tempRepoUrl, setTempRepoUrl] = useState(repoUrl);

  const handleFolderToggle = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleLoadRepo = async () => {
    if (!tempRepoUrl.trim()) return;
    setIsLoading(true);
    try {
      const result = await pullRepo({ repoUrl: tempRepoUrl });
      // Support both result.success and result.data.success for compatibility
      const success = result.data?.success ?? result.success;
      const files = result.data?.files ?? result.files;
      const error = result.data?.error ?? result.error;
      if (success) {
        onFilesLoaded(files);
        setRepoUrl(tempRepoUrl);
        setShowRepoInput(false);
      } else {
        alert('Failed to load repository: ' + (error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Load Repo Error:', error);
      alert('Failed to load repository: ' + (error.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'js':
      case 'jsx':
        return <Code size={16} className="text-yellow-500" />;
      case 'ts':
      case 'tsx':
        return <Code size={16} className="text-blue-500" />;
      case 'html':
        return <FileText size={16} className="text-orange-500" />;
      case 'css':
      case 'scss':
      case 'sass':
        return <FileText size={16} className="text-pink-500" />;
      case 'json':
        return <FileText size={16} className="text-green-500" />;
      case 'md':
        return <FileText size={16} className="text-gray-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <Image size={16} className="text-purple-500" />;
      case 'sql':
      case 'db':
        return <Database size={16} className="text-blue-600" />;
      case 'py':
        return <Code size={16} className="text-green-600" />;
      case 'java':
        return <Code size={16} className="text-red-500" />;
      case 'cpp':
      case 'c':
        return <Code size={16} className="text-blue-700" />;
      case 'go':
        return <Code size={16} className="text-cyan-500" />;
      case 'rs':
        return <Code size={16} className="text-orange-600" />;
      case 'php':
        return <Code size={16} className="text-purple-600" />;
      case 'rb':
        return <Code size={16} className="text-red-600" />;
      case 'swift':
        return <Code size={16} className="text-orange-500" />;
      case 'kt':
        return <Code size={16} className="text-purple-500" />;
      default:
        return <File size={16} className="text-gray-400" />;
    }
  };

  const getFolderIcon = (isExpanded) => {
    return isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />;
  };

  const organizeFiles = (files) => {
    const folders = {};
    const rootFiles = [];

    files.forEach(file => {
      const pathParts = file.path.split('/');
      if (pathParts.length === 1) {
        rootFiles.push(file);
      } else {
        const folderName = pathParts[0];
        if (!folders[folderName]) {
          folders[folderName] = [];
        }
        folders[folderName].push({
          ...file,
          relativePath: pathParts.slice(1).join('/')
        });
      }
    });

    return { folders, rootFiles };
  };

  const filterFiles = (files) => {
    if (!searchTerm) return files;
    return files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const { folders, rootFiles } = organizeFiles(filterFiles(files));

  const renderFile = (file, depth = 0) => {
    const isSelected = selectedFile && selectedFile.path === file.path;
    
    return (
      <div
        key={file.path}
        className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-700 transition-colors ${
          isSelected ? 'bg-blue-600 text-white' : 'text-gray-300'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onFileSelect(file)}
      >
        {getFileIcon(file.name)}
        <span className="ml-2 text-sm truncate">{file.name}</span>
        {file.isModified && (
          <div className="ml-auto w-2 h-2 bg-yellow-500 rounded-full"></div>
        )}
      </div>
    );
  };

  const renderFolder = (folderName, folderFiles, depth = 0) => {
    const folderPath = depth === 0 ? folderName : `${folderName}`;
    const isExpanded = expandedFolders.has(folderPath);
    
    // Group files by subfolders
    const subFolders = {};
    const directFiles = [];
    
    folderFiles.forEach(file => {
      const pathParts = file.relativePath.split('/');
      if (pathParts.length === 1) {
        directFiles.push(file);
      } else {
        const subFolderName = pathParts[0];
        if (!subFolders[subFolderName]) {
          subFolders[subFolderName] = [];
        }
        subFolders[subFolderName].push({
          ...file,
          relativePath: pathParts.slice(1).join('/')
        });
      }
    });

    return (
      <div key={folderPath}>
        <div
          className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-700 transition-colors text-gray-300"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFolderToggle(folderPath)}
        >
          {getFolderIcon(isExpanded)}
          <Folder size={16} className="ml-1 text-blue-400" />
          <span className="ml-2 text-sm font-medium">{folderName}</span>
          <span className="ml-auto text-xs text-gray-500">
            {folderFiles.length}
          </span>
        </div>
        
        {isExpanded && (
          <div>
            {/* Render subfolders */}
            {Object.entries(subFolders).map(([subFolderName, subFolderFiles]) =>
              renderFolder(subFolderName, subFolderFiles, depth + 1)
            )}
            
            {/* Render direct files */}
            {directFiles.map(file => renderFile(file, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Files</h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowRepoInput(!showRepoInput)}
              className="p-1 hover:bg-gray-700 rounded"
              title="Load Repository"
            >
              <Github size={14} />
            </button>
            <button
              className="p-1 hover:bg-gray-700 rounded"
              title="New File"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Repository Input */}
        {showRepoInput && (
          <div className="mb-3 p-2 bg-gray-700 rounded">
            <input
              type="text"
              value={tempRepoUrl}
              onChange={(e) => setTempRepoUrl(e.target.value)}
              placeholder="Enter GitHub repo URL"
              className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400"
            />
            <div className="flex space-x-1 mt-2">
              <button
                onClick={handleLoadRepo}
                disabled={isLoading}
                className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
              >
                {isLoading ? 'Loading...' : 'Load'}
              </button>
              <button
                onClick={() => setShowRepoInput(false)}
                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <Folder size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files loaded</p>
            <button
              onClick={() => setShowRepoInput(true)}
              className="mt-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
            >
              Load Repository
            </button>
          </div>
        ) : (
          <div className="py-1">
            {/* Root Files */}
            {rootFiles.map(file => renderFile(file))}
            
            {/* Folders */}
            {Object.entries(folders).map(([folderName, folderFiles]) =>
              renderFolder(folderName, folderFiles)
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>{files.length} files</span>
          <span>{selectedFile ? selectedFile.name : 'No selection'}</span>
        </div>
      </div>
    </div>
  );
};

export default FileTree; 