import React, { useState, useEffect } from 'react';
import { Github, Download, Upload, Settings, Smartphone, MessageCircle, Plus, Code, FileText, Sparkles } from 'lucide-react';
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

  console.log('🚨 App.js loaded at:', new Date().toLocaleString());
  console.log('🚨 Current layout:', layout);
  console.log('🚨 Is mobile:', isMobile);
  
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
      {/* DEBUG BANNER - REMOVE AFTER CONFIRMING CHANGES WORK */}
      <div className="bg-red-600 text-white text-center py-4 px-4 font-bold text-2xl animate-pulse border-4 border-yellow-400">
        🚨 DEBUG: NEW REPLIT STYLE INTERFACE - DEPLOYED AT {new Date().toLocaleString()} 🚨
        <br />
        <span className="text-lg">If you see this, the deployment is working!</span>
      </div>

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">📦</div>
          <h1 className="text-xl font-bold text-white">BuilderBox</h1>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
              AI-Powered Dev
            </span>
            <span className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-500/30">
              <Sparkles size={10} className="inline mr-1" />
              Replit Style
            </span>
          </div>
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
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                layout === 'chat' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              <MessageCircle size={14} className="inline mr-1" />
              Chat
            </button>
            <button
              onClick={() => setLayout('editor')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                layout === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              <Code size={14} className="inline mr-1" />
              Editor
            </button>
            <button
              onClick={() => setLayout('preview')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                layout === 'preview' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              Preview
            </button>
          </div>

          {/* GitHub Actions */}
          <button
            onClick={handlePushToGitHub}
            className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
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
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all hover:scale-110"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Welcome Message for Chat Layout */}
      {layout === 'chat' && files.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Welcome to BuilderBox AI</h3>
            <p className="text-gray-300 mb-4">
              This is the new Replit-style interface! Start by loading a repository or chatting with the AI.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowFileTree(true)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Load Repository
              </button>
              <button
                onClick={() => setLayout('editor')}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
              >
                Start Coding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 