import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Save, Download, Upload } from 'lucide-react';

const CodeEditor = ({ file, onSave, onContentChange }) => {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isDirty, setIsDirty] = useState(false);

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

  const handleEditorChange = (value) => {
    setContent(value);
    setIsDirty(true);
    if (onContentChange) {
      onContentChange(value);
    }
  };

  const handleSave = () => {
    if (file && content !== file.content) {
      onSave({ ...file, content });
      setIsDirty(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file?.name || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setContent(e.target.result);
        setIsDirty(true);
      };
      reader.readAsText(file);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold mb-2">No File Selected</h3>
          <p className="text-sm">Select a file from the file tree to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Editor Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-white">{file.name}</span>
          {isDirty && (
            <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">Modified</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".js,.jsx,.ts,.tsx,.html,.css,.json,.md,.py,.java,.cpp,.c,.php,.rb,.go,.rs,.sql,.xml,.yaml,.yml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload size={16} className="text-gray-400 hover:text-white cursor-pointer" />
          </label>
          
          <button
            onClick={handleDownload}
            className="text-gray-400 hover:text-white"
            title="Download file"
          >
            <Download size={16} />
          </button>
          
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
          >
            <Save size={16} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={content}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: {
              enabled: true
            },
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: true,
            trimAutoWhitespace: true,
            largeFileOptimizations: true,
            formatOnPaste: true,
            formatOnType: true
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor; 