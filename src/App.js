import React, { useState, useEffect } from 'react';
import { Github, Download, Upload, Settings, Smartphone } from 'lucide-react';
import FileTree from './components/FileTree';
import VSCodeEditor from './components/VSCodeEditor';
import Preview from './components/Preview';
import ConversationalAgent from './components/ConversationalAgent';
import { pushChanges } from './firebase';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [repoUrl, setRepoUrl] = useState('https://github.com/mtnmerc/BuilderBox');
  const [layout, setLayout] = useState('editor'); // editor, preview, split
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleFileSave = (updatedFile) => {
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.path === updatedFile.path ? updatedFile : file
      )
    );
    setSelectedFile(updatedFile);
  };

  const handleFileContentChange = (content) => {
    if (selectedFile) {
      setSelectedFile(prev => ({ ...prev, content, isModified: true }));
    }
  };

  const handleCreateFile = (newFile) => {
    setFiles(prevFiles => [...prevFiles, newFile]);
    setSelectedFile(newFile);
  };

  const handlePushToGitHub = async () => {
    try {
      const modifiedFiles = files.filter(file => file.isModified);
      if (modifiedFiles.length === 0) {
        alert('No changes to push');
        return;
      }

      const owner = repoUrl.split('/')[3];
      const repo = repoUrl.split('/')[4];

      const result = await pushChanges({
        repo: `${owner}/${repo}`,
        files: modifiedFiles,
        commitMessage: `BuilderBox: Update ${modifiedFiles.length} file(s)`
      });

      if (result.data.success) {
        alert('Changes pushed to GitHub successfully!');
        setFiles(prevFiles => 
          prevFiles.map(file => ({ ...file, isModified: false }))
        );
      } else {
        alert('Failed to push changes: ' + result.data.error);
      }
    } catch (error) {
      console.error('Push Error:', error);
      alert('Failed to push changes to GitHub');
    }
  };

  const getLayoutClass = () => {
    switch (layout) {
      case 'preview':
        return 'grid-cols-1';
      case 'split':
        return 'grid-cols-2';
      default:
        return 'grid-cols-1 lg:grid-cols-2';
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">📦</div>
          <h1 className="text-xl font-bold text-white">BuilderBox</h1>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
            Personal Dev Environment
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Layout Controls */}
          <div className="flex items-center space-x-1 bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setLayout('editor')}
              className={`px-3 py-1 rounded text-xs font-medium ${
                layout === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setLayout('preview')}
              className={`px-3 py-1 rounded text-xs font-medium ${
                layout === 'preview' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setLayout('split')}
              className={`px-3 py-1 rounded text-xs font-medium ${
                layout === 'split' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Split
            </button>
          </div>

          {/* GitHub Actions */}
          <button
            onClick={handlePushToGitHub}
            className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Push to GitHub</span>
          </button>

          {/* Mobile Indicator */}
          {isMobile && (
            <div className="flex items-center space-x-1 text-yellow-400">
              <Smartphone size={16} />
              <span className="text-xs">Mobile</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        <FileTree 
          onFileSelect={handleFileSelect} 
          selectedFile={selectedFile}
          files={files}
          onFilesLoaded={setFiles}
          repoUrl={repoUrl}
          setRepoUrl={setRepoUrl}
        />

        {/* Editor and Preview Area */}
        <div className={`flex-1 grid ${getLayoutClass()} gap-0`}>
          {/* Code Editor */}
          {(layout === 'editor' || layout === 'split') && (
            <div className="flex flex-col">
              <VSCodeEditor
                file={selectedFile}
                onSave={handleFileSave}
                onContentChange={handleFileContentChange}
              />
            </div>
          )}

          {/* Live Preview */}
          {(layout === 'preview' || layout === 'split') && (
            <Preview 
              files={files} 
              selectedFile={selectedFile}
            />
          )}
        </div>
      </div>

      {/* AI Agent */}
      <ConversationalAgent 
        selectedFile={selectedFile} 
        files={files}
        onCreateFile={handleCreateFile}
        onUpdateFile={handleFileSave}
      />
    </div>
  );
}

export default App; 