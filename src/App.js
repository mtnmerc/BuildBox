import React, { useState, useEffect } from 'react';
import { Upload, MessageCircle, FileText, Sparkles, X } from 'lucide-react';
import FileTree from './components/FileTree';
import VSCodeEditor from './components/VSCodeEditor';
import Preview from './components/Preview';
import AgentPanel from './components/AgentPanel';
import { pushChanges } from './firebase';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [repoUrl, setRepoUrl] = useState('https://github.com/mtnmerc/BuildBox');
  const [layout, setLayout] = useState('editor'); // editor, preview, split
  const [isMobile, setIsMobile] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);
  const [showChat, setShowChat] = useState(false); // Chat is now hidden by default

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (isMobile) setShowFileTree(false);
  };

  const handleFileSave = (updatedFile) => {
    setFiles(prev => prev.map(f => (f.path === updatedFile.path ? updatedFile : f)));
    setSelectedFile(updatedFile);
  };

  const handleFileContentChange = (content) => {
    if (selectedFile) {
      setSelectedFile(prev => ({ ...prev, content, isModified: true }));
    }
  };

  const handleCreateFile = (newFile) => {
    setFiles(prev => [...prev, newFile]);
    setSelectedFile(newFile);
  };

  const handlePushToGitHub = async () => {
    try {
      const modifiedFiles = files.filter(file => file.isModified);
      if (modifiedFiles.length === 0) return alert('No changes to push');
      
      const owner = repoUrl.split('/')[3];
      const repo = repoUrl.split('/')[4];
      const result = await pushChanges({
        repo: `${owner}/${repo}`,
        files: modifiedFiles,
        commitMessage: `BuilderBox: Update ${modifiedFiles.length} file(s)`
      });
      if (result.data.success) {
        alert('Changes pushed to GitHub successfully!');
        setFiles(prev => prev.map(f => ({ ...f, isModified: false })));
      } else {
        alert('Failed to push changes: ' + result.data.error);
      }
    } catch (error) {
      console.error('Push Error:', error);
      alert('Failed to push changes to GitHub');
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between z-20">
        {/* Left Side */}
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
        {/* Right Side */}
        <div className="flex items-center space-x-2">
          {isMobile && (
            <button
              onClick={() => setShowFileTree(!showFileTree)}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
            >
              <FileText size={16} />
            </button>
          )}
          <button
            onClick={handlePushToGitHub}
            className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Push</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree */}
        {(!isMobile || showFileTree) && (
          <div className={`${isMobile ? 'absolute z-10 h-full' : ''} w-64 bg-gray-800 text-white border-r border-gray-700`}>
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
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <VSCodeEditor
            file={selectedFile}
            onSave={handleFileSave}
            onContentChange={handleFileContentChange}
          />
        </div>
      </div>

      {/* Chat Bubble & Window */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Window */}
        {showChat && (
          <div className="w-[440px] h-[600px] max-h-[80vh] bg-gray-800 text-white rounded-2xl shadow-2xl flex flex-col mb-4 border border-gray-700">
            <AgentPanel files={files} onFilesUpdate={setFiles} />
          </div>
        )}
        {/* Chat Toggle Bubble */}
        <button
          onClick={() => setShowChat(!showChat)}
          className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
        >
          {showChat ? <X size={28} /> : <MessageCircle size={28} />}
        </button>
      </div>
    </div>
  );
}

export default App; 