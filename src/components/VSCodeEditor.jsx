import React, { useState, useEffect, useRef } from 'react';
import { Code, Settings, Terminal, GitBranch, Search, Puzzle } from 'lucide-react';

const VSCodeEditor = ({ file, onSave, onContentChange, files }) => {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isDirty, setIsDirty] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState('editor'); // editor, terminal, git, search
  const [lineNumbers, setLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (file) {
      setContent(file.content || '');
      setIsDirty(false);
      setLanguage(getLanguageFromExtension(file.name));
    }
  }, [file]);

  const getLanguageFromExtension = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    return languageMap[ext] || 'plaintext';
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    setIsDirty(true);
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  const handleSave = () => {
    if (file && content !== file.content) {
      onSave({ ...file, content });
      setIsDirty(false);
    }
  };

  const handleKeyDown = (e) => {
    // VS Code-like shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          handleSave();
          break;
        case 'f':
          e.preventDefault();
          setActiveTab('search');
          break;
        case '`':
          e.preventDefault();
          setActiveTab('terminal');
          break;
        case 'b':
          e.preventDefault();
          setShowSidebar(!showSidebar);
          break;
        case '=':
          e.preventDefault();
          setFontSize(prev => Math.min(prev + 1, 24));
          break;
        case '-':
          e.preventDefault();
          setFontSize(prev => Math.max(prev - 1, 10));
          break;
        default:
          break;
      }
    }
  };

  const getLineNumbers = () => {
    if (!lineNumbers) return null;
    const lines = content.split('\n');
    return (
      <div className="line-numbers">
        {lines.map((_, index) => (
          <div key={index} className="line-number">
            {index + 1}
          </div>
        ))}
      </div>
    );
  };

  const getSyntaxHighlighting = () => {
    // Basic syntax highlighting based on language
    if (language === 'javascript' || language === 'typescript') {
      return content
        .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default)\b/g, '<span class="keyword">$1</span>')
        .replace(/\b(true|false|null|undefined)\b/g, '<span class="literal">$1</span>')
        .replace(/"([^"]*)"/g, '<span class="string">"$1"</span>')
        .replace(/'([^']*)'/g, '<span class="string">\'$1\'</span>')
        .replace(/\/\/(.*)$/gm, '<span class="comment">//$1</span>');
    }
    return content;
  };

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <Code size={48} className="mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No File Selected</h3>
          <p className="text-sm">Select a file from the file tree to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* VS Code-like Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-gray-400 hover:text-white p-1"
              title="Toggle Sidebar (Ctrl+B)"
            >
              <Code size={16} />
            </button>
            <span className="text-sm font-medium text-white">{file.name}</span>
            {isDirty && (
              <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">Modified</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('search')}
            className="text-gray-400 hover:text-white p-1"
            title="Search (Ctrl+F)"
          >
            <Search size={16} />
          </button>
          <button
            onClick={() => setActiveTab('git')}
            className="text-gray-400 hover:text-white p-1"
            title="Git"
          >
            <GitBranch size={16} />
          </button>
          <button
            onClick={() => setActiveTab('extensions')}
            className="text-gray-400 hover:text-white p-1"
            title="Extensions"
          >
            <Puzzle size={16} />
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className="text-gray-400 hover:text-white p-1"
            title="Terminal (Ctrl+`)"
          >
            <Terminal size={16} />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-gray-400 hover:text-white p-1"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 bg-gray-800 border-r border-gray-700">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Explorer</h3>
              <div className="space-y-1">
                {files.map((f) => (
                  <div
                    key={f.path}
                    className={`text-sm px-2 py-1 rounded cursor-pointer ${
                      f.path === file.path ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {f.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Tab Bar */}
          <div className="bg-gray-800 border-b border-gray-700 flex items-center">
            <div className="flex items-center space-x-1 px-4 py-2">
              <button
                onClick={() => setActiveTab('editor')}
                className={`text-sm px-3 py-1 rounded ${
                  activeTab === 'editor' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {file.name}
              </button>
              {activeTab === 'terminal' && (
                <button
                  onClick={() => setActiveTab('terminal')}
                  className="text-sm px-3 py-1 rounded bg-gray-700 text-white"
                >
                  Terminal
                </button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 relative">
            {activeTab === 'editor' && (
              <div className="h-full flex">
                {getLineNumbers()}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    className="w-full h-full bg-gray-900 text-gray-100 p-4 font-mono resize-none outline-none"
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: '1.5',
                      whiteSpace: wordWrap ? 'pre-wrap' : 'pre'
                    }}
                    spellCheck={false}
                    placeholder="Start coding..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'terminal' && (
              <div className="h-full bg-gray-900 p-4">
                <div className="text-green-400 font-mono text-sm">
                  <div>$ npm start</div>
                  <div className="text-gray-400">Starting development server...</div>
                  <div className="text-gray-400">Local: http://localhost:3000</div>
                  <div className="text-gray-400">Network: http://192.168.1.100:3000</div>
                </div>
              </div>
            )}

            {activeTab === 'git' && (
              <div className="h-full bg-gray-900 p-4">
                <div className="text-white font-mono text-sm">
                  <div className="text-green-400">✓ main</div>
                  <div className="text-gray-400">No changes to commit</div>
                  <div className="mt-4">
                    <div className="text-blue-400">Modified files:</div>
                    <div className="text-gray-400">No modified files</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="h-full bg-gray-900 p-4">
                <div className="text-white">
                  <input
                    type="text"
                    placeholder="Search in files..."
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
                  />
                  <div className="mt-4 text-gray-400 text-sm">
                    No search results
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="h-full bg-gray-900 p-4">
                <div className="text-white space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Font Size</label>
                    <input
                      type="range"
                      min="10"
                      max="24"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-400">{fontSize}px</span>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={lineNumbers}
                        onChange={(e) => setLineNumbers(e.target.checked)}
                        className="mr-2"
                      />
                      Show Line Numbers
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={wordWrap}
                        onChange={(e) => setWordWrap(e.target.checked)}
                        className="mr-2"
                      />
                      Word Wrap
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-1 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{language}</span>
          <span>Ln {content.split('\n').length}, Col {content.length}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>UTF-8</span>
          <span>{fontSize}px</span>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="text-blue-400 hover:text-blue-300 disabled:text-gray-600"
          >
            {isDirty ? 'Ctrl+S to save' : 'Saved'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VSCodeEditor; 