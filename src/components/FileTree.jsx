import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Github } from 'lucide-react';
import { pullRepo } from '../firebase';

const FileTree = ({ onFileSelect, selectedFile, onFilesLoaded }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [repoLoaded, setRepoLoaded] = useState(false);

  const loadRepo = async () => {
    setLoading(true);
    try {
      const result = await pullRepo({ 
        repo: 'mtnmerc/BuildBox',
        branch: 'main'
      });
      
      if (result.data.success) {
        const loadedFiles = result.data.files;
        setFiles(loadedFiles);
        setRepoLoaded(true);
        
        if (onFilesLoaded) {
          onFilesLoaded(loadedFiles);
        }
      } else {
        console.error('Failed to load repo:', result.data.error);
        alert('Failed to load repository: ' + result.data.error);
      }
    } catch (error) {
      console.error('Error loading repo:', error);
      alert('Error loading repository. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTree = (fileList, path = '') => {
    const folders = {};
    const files = [];

    fileList.forEach(file => {
      const relativePath = file.path.replace(path, '').split('/');
      if (relativePath.length === 1) {
        files.push(file);
      } else {
        const folderName = relativePath[0];
        if (!folders[folderName]) {
          folders[folderName] = [];
        }
        folders[folderName].push(file);
      }
    });

    return (
      <div className="space-y-1">
        {Object.entries(folders).map(([folderName, folderFiles]) => {
          const folderPath = path ? `${path}/${folderName}` : folderName;
          const isExpanded = expandedFolders.has(folderPath);
          
          return (
            <div key={folderPath}>
              <button
                onClick={() => toggleFolder(folderPath)}
                className="flex items-center w-full text-left px-2 py-1 hover:bg-gray-700 rounded text-sm"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Folder size={16} className="mr-2 text-blue-400" />
                <span className="truncate">{folderName}</span>
              </button>
              {isExpanded && (
                <div className="ml-4">
                  {renderFileTree(folderFiles, folderPath)}
                </div>
              )}
            </div>
          );
        })}
        
        {files.map(file => (
          <button
            key={file.path}
            onClick={() => onFileSelect(file)}
            className={`flex items-center w-full text-left px-2 py-1 hover:bg-gray-700 rounded text-sm ${
              selectedFile?.path === file.path ? 'bg-blue-600 text-white' : ''
            }`}
          >
            <File size={16} className="mr-2 text-gray-400" />
            <span className="truncate">{file.name}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 border-r border-gray-700 w-64 min-w-64 h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Files</h2>
          <Github size={20} className="text-gray-400" />
        </div>
        <button
          onClick={loadRepo}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium"
        >
          {loading ? 'Loading...' : repoLoaded ? 'Reload Repo' : 'Load Repo'}
        </button>
        {repoLoaded && (
          <div className="mt-2 text-xs text-green-400">
            ✓ Repository loaded successfully
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {files.length > 0 ? (
          renderFileTree(files)
        ) : (
          <div className="text-gray-400 text-sm text-center mt-8">
            {repoLoaded ? 'No files found' : 'Click "Load Repo" to start'}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTree; 