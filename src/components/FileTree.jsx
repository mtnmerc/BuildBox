import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Github, RefreshCw, GitBranch } from 'lucide-react';
import { pullRepo } from '../firebase';

const FileTree = ({ onFileSelect, selectedFile, files, onFilesLoaded, repoUrl, setRepoUrl }) => {
  const [tree, setTree] = useState({});
  const [expandedDirs, setExpandedDirs] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (files && files.length > 0) {
      setTree(buildTree(files));
    } else {
      setTree({});
    }
  }, [files]);

  const buildTree = (fileList) => {
    const fileTree = {};
    fileList.forEach(file => {
      let currentLevel = fileTree;
      const pathParts = file.path.split('/');
      pathParts.forEach((part, index) => {
        if (index === pathParts.length - 1) {
          currentLevel[part] = file;
        } else {
          if (!currentLevel[part]) {
            currentLevel[part] = {};
          }
          currentLevel = currentLevel[part];
        }
      });
    });
    return fileTree;
  };

  const toggleDir = (dir) => {
    setExpandedDirs(prev => ({ ...prev, [dir]: !prev[dir] }));
  };

  const handleLoadRepo = async () => {
    setIsLoading(true);
    try {
      const owner = repoUrl.split('/')[3];
      const repo = repoUrl.split('/')[4];
      if (!owner || !repo) {
        alert('Invalid GitHub URL. Please use the format https://github.com/owner/repo');
        setIsLoading(false);
        return;
      }
      
      const result = await pullRepo({ owner, repo });
      if (result.data.success) {
        onFilesLoaded(result.data.files);
      } else {
        console.error('Failed to load repo:', result.data.error);
        alert('Failed to load repository. Check the URL and ensure it is a public repository.');
      }
    } catch (error) {
      console.error('Error loading repository:', error);
      alert('An error occurred while loading the repository.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTree = (node, path = '') => {
    return Object.entries(node).map(([name, content]) => {
      const currentPath = path ? `${path}/${name}` : name;
      if (content.path) { // It's a file
        return (
          <div 
            key={currentPath}
            onClick={() => onFileSelect(content)}
            className={`flex items-center space-x-2 p-1 rounded-md cursor-pointer text-sm ${
              selectedFile && selectedFile.path === content.path 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <File size={16} className="text-gray-400" />
            <span>{name}</span>
          </div>
        );
      } else { // It's a directory
        const isExpanded = expandedDirs[currentPath];
        return (
          <div key={currentPath}>
            <div 
              onClick={() => toggleDir(currentPath)}
              className="flex items-center space-x-2 p-1 rounded-md cursor-pointer text-sm text-gray-200 hover:bg-gray-700"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Folder size={16} className="text-yellow-500" />
              <span>{name}</span>
            </div>
            {isExpanded && (
              <div className="pl-4 border-l border-gray-700 ml-2">
                {renderTree(content, currentPath)}
              </div>
            )}
          </div>
        );
      }
    });
  };

  return (
    <div className="w-64 bg-gray-800 text-white p-3 flex flex-col h-full border-r border-gray-700">
      <div className="mb-4">
        <label htmlFor="repoUrl" className="text-xs font-bold text-gray-400 block mb-1">
          GitHub Repository URL
        </label>
        <div className="flex items-center bg-gray-900 rounded-md">
          <GitBranch size={16} className="text-gray-500 mx-2" />
          <input
            type="text"
            id="repoUrl"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="bg-transparent w-full p-2 text-sm text-gray-200 focus:outline-none"
            placeholder="e.g., https://github.com/owner/repo"
          />
        </div>
      </div>
      <button
        onClick={handleLoadRepo}
        disabled={isLoading}
        className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md mb-4 text-sm disabled:bg-indigo-400"
      >
        {isLoading ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <RefreshCw size={16} />
        )}
        <span>{isLoading ? 'Loading...' : 'Load Repo'}</span>
      </button>

      <div className="flex-1 overflow-y-auto">
        {Object.keys(tree).length > 0 ? renderTree(tree) : (
          <p className="text-gray-500 text-sm">No repository loaded.</p>
        )}
      </div>
    </div>
  );
};

export default FileTree; 