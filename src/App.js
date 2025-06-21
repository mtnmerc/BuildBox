import React, { useState, useEffect } from 'react';
import { Github, Download, Upload, Settings, Smartphone, MessageCircle, Plus, Code, FileText } from 'lucide-react';
import FileTree from './components/FileTree';
import VSCodeEditor from './components/VSCodeEditor';
import Preview from './components/Preview';
import ConversationalAgent from './components/ConversationalAgent';
import { pushChanges } from './firebase';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [repoUrl, setRepoUrl] = useState('https://github.com/mtnmerc/BuilderBox');
  const [layout, setLayout] = useState('chat'); // chat, editor, preview, split
  const [isMobile, setIsMobile] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);
  const [showAI, setShowAI] = useState(true);

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
    if (isMobile) {
      setShowFileTree(false);
      setLayout('editor');
    }
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
      case 'editor':
        return 'grid-cols-1';
      default:
        return 'grid-cols-1';
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
            AI-Powered Dev
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={() => setShowFileTree(!showFileTree)}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
            >
              <FileText size={16} />
            </button>
          )}

          {/* Layout Controls */}
          <div className="flex items-center space-x-1 bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setLayout('chat')}
              className={`px-3 py-1 rounded text-xs font-medium ${
                layout === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <MessageCircle size={14} className="inline mr-1" />
              Chat
            </button>
            <button
              onClick={() => setLayout('editor')}
              className={`px-3 py-1 rounded text-xs font-medium ${
                layout === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Code size={14} className="inline mr-1" />
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
          </div>

          {/* GitHub Actions */}
          <button
            onClick={handlePushToGitHub}
            className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Push</span>
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
        {/* File Tree Sidebar - Hidden on mobile when not active */}
        {(!isMobile || showFileTree) && (
          <div className={`${isMobile ? 'absolute z-50 h-full' : ''} w-64 bg-gray-800 text-white border-r border-gray-700`}>
            <FileTree 
              onFileSelect={handleFileSelect} 
              selectedFile={selectedFile}
              files={files}
              onFilesLoaded={setFiles}
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {layout === 'chat' && (
            <div className="flex-1">
              <ConversationalAgent 
                selectedFile={selectedFile} 
                files={files}
                onCreateFile={handleCreateFile}
                onUpdateFile={handleFileSave}
              />
            </div>
          )}

          {layout === 'editor' && (
            <div className="flex-1">
              <VSCodeEditor
                file={selectedFile}
                onSave={handleFileSave}
                onContentChange={handleFileContentChange}
              />
            </div>
          )}

          {layout === 'preview' && (
            <div className="flex-1">
              <Preview 
                files={files} 
                selectedFile={selectedFile}
              />
            </div>
          )}

          {layout === 'split' && (
            <div className={`grid ${getLayoutClass()} gap-0`}>
              <VSCodeEditor
                file={selectedFile}
                onSave={handleFileSave}
                onContentChange={handleFileContentChange}
              />
              <Preview 
                files={files} 
                selectedFile={selectedFile}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button - Mobile Only */}
      {isMobile && layout !== 'chat' && (
        <button
          onClick={() => setLayout('chat')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}

export default App; 