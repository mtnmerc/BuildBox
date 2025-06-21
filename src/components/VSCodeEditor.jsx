import React, { useState, useEffect, useRef } from 'react';
import { Save, Download, Settings, Maximize2, Minimize2, FileText, Code, Terminal, GitBranch, Search, MoreVertical } from 'lucide-react';

const VSCodeEditor = ({ file, onSave, onContentChange }) => {
  const [content, setContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState('dark');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (file) {
      setContent(file.content || '');
    }
  }, [file]);

  useEffect(() => {
    if (onContentChange) {
      onContentChange(content);
    }
  }, [content, onContentChange]);

  const handleSave = () => {
    if (file && onSave) {
      onSave({
        ...file,
        content: content,
        isModified: false
      });
    }
  };

  const handleKeyDown = (e) => {
    // Auto-indent on Enter
    if (e.key === 'Enter') {
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      // Get the current line
      const currentLine = value.substring(0, start).split('\n').pop();
      const indentMatch = currentLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      
      // Add extra indent for opening braces
      const extraIndent = currentLine.trim().endsWith('{') ? '  ' : '';
      
      const newValue = value.substring(0, start) + '\n' + indent + extraIndent + value.substring(end);
      setContent(newValue);
      
      // Set cursor position
      setTimeout(() => {
        const newCursorPos = start + indent.length + extraIndent.length + 1;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
      
      e.preventDefault();
    }
    
    // Save on Ctrl+S
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const getLanguageFromExtension = (filename = '') => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin'
    };
    return languageMap[ext] || 'plaintext';
  };

  const getSyntaxHighlighting = (text, language) => {
    // Simple syntax highlighting for common languages
    if (language === 'javascript' || language === 'typescript') {
      return text
        .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\b(true|false|null|undefined)\b/g, '<span class="text-orange-400">$1</span>')
        .replace(/\b(console|Math|Date|Array|Object|String|Number|Boolean)\b/g, '<span class="text-blue-400">$1</span>')
        .replace(/"([^"]*)"/g, '<span class="text-green-400">"$1"</span>')
        .replace(/'([^']*)'/g, '<span class="text-green-400">\'$1\'</span>')
        .replace(/\/\/(.*)/g, '<span class="text-gray-500">//$1</span>')
        .replace(/\/\*([\s\S]*?)\*\//g, '<span class="text-gray-500">/*$1*/</span>');
    }
    
    if (language === 'html') {
      return text
        .replace(/&lt;/g, '<span class="text-red-400">&lt;</span>')
        .replace(/&gt;/g, '<span class="text-red-400">&gt;</span>')
        .replace(/(&lt;[^&]*&gt;)/g, '<span class="text-blue-400">$1</span>')
        .replace(/(&lt;\/[^&]*&gt;)/g, '<span class="text-blue-400">$1</span>');
    }
    
    if (language === 'css') {
      return text
        .replace(/([a-zA-Z-]+):/g, '<span class="text-blue-400">$1</span>:')
        .replace(/(#[0-9a-fA-F]{3,6})/g, '<span class="text-green-400">$1</span>')
        .replace(/(\d+px|\d+em|\d+rem|\d+%)/g, '<span class="text-orange-400">$1</span>');
    }
    
    return text;
  };

  const renderLineNumbers = () => {
    if (!showLineNumbers) return null;
    
    const lines = content.split('\n');
    return (
      <div className="select-none text-right pr-3 text-gray-500 text-sm border-r border-gray-700">
        {lines.map((_, index) => (
          <div key={index} className="leading-6">
            {index + 1}
          </div>
        ))}
      </div>
    );
  };

  const renderHighlightedContent = () => {
    const language = getLanguageFromExtension(file?.name);
    const lines = content.split('\n');
    
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {renderLineNumbers()}
          <div className="flex-1">
            {lines.map((line, index) => (
              <div key={index} className="leading-6 px-3">
                <span 
                  dangerouslySetInnerHTML={{ 
                    __html: getSyntaxHighlighting(line, language) 
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!file) {
    return (
      <div className="flex-1 bg-gray-900 text-gray-400 flex items-center justify-center">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No file selected</p>
          <p className="text-sm">Select a file from the file tree to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-900 text-gray-200 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Code size={16} className="text-blue-400" />
          <span className="text-sm font-medium">{file.name}</span>
          {file.isModified && (
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Mobile-friendly buttons */}
          <button
            onClick={handleSave}
            className="p-2 hover:bg-gray-700 rounded text-green-400 hover:text-green-300"
            title="Save (Ctrl+S)"
          >
            <Save size={16} />
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-700 rounded"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-700 rounded"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-gray-400 mb-1">Font Size</label>
              <input
                type="range"
                min="10"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{fontSize}px</span>
            </div>
            
            <div>
              <label className="block text-gray-400 mb-1">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="lineNumbers"
                checked={showLineNumbers}
                onChange={(e) => setShowLineNumbers(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="lineNumbers" className="text-sm">Line Numbers</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="wordWrap"
                checked={wordWrap}
                onChange={(e) => setWordWrap(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="wordWrap" className="text-sm">Word Wrap</label>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Hidden textarea for input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="absolute opacity-0 pointer-events-none"
          style={{ fontSize: `${fontSize}px` }}
        />
        
        {/* Visible highlighted content */}
        <div 
          className="flex-1 relative"
          style={{ fontSize: `${fontSize}px` }}
        >
          {renderHighlightedContent()}
          
          {/* Overlay for click handling */}
          <div 
            className="absolute inset-0 cursor-text"
            onClick={() => textareaRef.current?.focus()}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{getLanguageFromExtension(file.name)}</span>
          <span>{content.split('\n').length} lines</span>
          <span>{content.length} characters</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </div>
    </div>
  );
};

export default VSCodeEditor; 