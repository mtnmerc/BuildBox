import React, { useState, useEffect } from 'react';
import { Bot, Send, Sparkles, Loader2, MessageSquare, Zap, Code, FileText } from 'lucide-react';
import { editWithAI, pullRepo } from '../firebase';

const AIAgent = ({ selectedFile, onCodeUpdate }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [repoContext, setRepoContext] = useState(null);
  const [mode, setMode] = useState('file'); // 'file' or 'repo'

  useEffect(() => {
    // Load repository context when switching to repo mode
    if (mode === 'repo' && !repoContext) {
      loadRepoContext();
    }
  }, [mode]);

  const loadRepoContext = async () => {
    setIsLoading(true);
    try {
      const result = await pullRepo({
        repo: 'mtnmerc/BuildBox', // You can make this configurable
        branch: 'main'
      });

      if (result.data.success) {
        setRepoContext(result.data);
        const systemMessage = {
          id: Date.now(),
          type: 'system',
          content: 'Repository context loaded successfully. You can now ask questions about the entire codebase.',
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistory(prev => [...prev, systemMessage]);
      } else {
        throw new Error(result.data.error);
      }
    } catch (error) {
      console.error('Load Repo Error:', error);
      const errorMessage = {
        id: Date.now(),
        type: 'error',
        content: 'Failed to load repository context',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (mode === 'file' && !selectedFile) {
      const errorMessage = {
        id: Date.now(),
        type: 'error',
        content: 'Please select a file first',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      if (mode === 'file') {
        const result = await editWithAI({
          prompt: prompt,
          filePath: selectedFile.path,
          fileName: selectedFile.name,
          currentContent: selectedFile.content,
          language: getLanguageFromExtension(selectedFile.name)
        });

        if (result.data.success) {
          const aiMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: result.data.explanation || 'Code updated successfully!',
            timestamp: new Date().toLocaleTimeString(),
            codeChanges: result.data.modifiedContent
          };

          setChatHistory(prev => [...prev, aiMessage]);
          
          if (onCodeUpdate && result.data.modifiedContent) {
            onCodeUpdate({
              ...selectedFile,
              content: result.data.modifiedContent
            });
          }
        } else {
          throw new Error(result.data.error);
        }
      } else {
        // Repository-wide context mode
        const result = await editWithAI({
          prompt: prompt,
          repoContext: repoContext,
          mode: 'repo'
        });

        if (result.data.success) {
          const aiMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: result.data.response,
            timestamp: new Date().toLocaleTimeString()
          };

          setChatHistory(prev => [...prev, aiMessage]);
        } else {
          throw new Error(result.data.error);
        }
      }
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: error.message || 'Failed to process request',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getMessageIcon = (type) => {
    switch (type) {
      case 'user':
        return <MessageSquare size={16} className="text-blue-400" />;
      case 'ai':
        return <Bot size={16} className="text-green-400" />;
      case 'error':
        return <Zap size={16} className="text-red-400" />;
      case 'system':
        return <Code size={16} className="text-yellow-400" />;
      default:
        return <MessageSquare size={16} className="text-gray-400" />;
    }
  };

  const getMessageClass = (type) => {
    switch (type) {
      case 'user':
        return 'bg-blue-600 text-white ml-auto';
      case 'ai':
        return 'bg-gray-700 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      case 'system':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const suggestedPrompts = mode === 'file' ? [
    "Fix any bugs in this code",
    "Add error handling",
    "Optimize performance",
    "Add comments to explain the code",
    "Refactor for better readability",
    "Add input validation",
    "Implement responsive design",
    "Add accessibility features"
  ] : [
    "Explain the project structure",
    "Find all API endpoints",
    "List all React components",
    "Show me where state management is used",
    "Find security vulnerabilities",
    "Suggest architectural improvements",
    "List all dependencies",
    "Show me the data flow"
  ];

  return (
    <div className={`bg-gray-900 border-t border-gray-700 transition-all duration-300 ${
      isExpanded ? 'h-[500px]' : 'h-16'
    }`}>
      {/* AI Agent Header */}
      <div 
        className="bg-gray-800 px-4 py-2 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Bot size={20} className="text-green-400" />
          <span className="text-sm font-medium text-white">AI Assistant</span>
          {isLoading && (
            <Loader2 size={16} className="text-green-400 animate-spin" />
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMode('file');
              }}
              className={`text-xs px-2 py-1 rounded ${
                mode === 'file' ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              <FileText size={14} className="inline mr-1" />
              File
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMode('repo');
              }}
              className={`text-xs px-2 py-1 rounded ${
                mode === 'repo' ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              <Code size={14} className="inline mr-1" />
              Repo
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-yellow-400" />
            <span className="text-xs text-gray-400">
              {isExpanded ? 'Click to minimize' : 'Click to expand'}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col h-full">
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[calc(500px-120px)]">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Bot size={48} className="mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {mode === 'file' ? 'AI Code Assistant' : 'Repository Assistant'}
                </h3>
                <p className="text-sm mb-4">
                  {mode === 'file' 
                    ? 'Ask me to modify your code using natural language'
                    : 'Ask me anything about the codebase'}
                </p>
                
                {/* Suggested Prompts */}
                <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                  {suggestedPrompts.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(suggestion)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((message) => (
                <div key={message.id} className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-1">
                    {getMessageIcon(message.type)}
                  </div>
                  <div className={`flex-1 max-w-xs px-3 py-2 rounded-lg text-sm ${getMessageClass(message.type)}`}>
                    <div className="mb-1">{message.content}</div>
                    {message.codeChanges && (
                      <div className="mt-2 p-2 bg-gray-800 rounded text-xs font-mono">
                        <pre>{message.codeChanges}</pre>
                      </div>
                    )}
                    <div className="text-xs opacity-70">{message.timestamp}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex space-x-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'file' 
                  ? "Type your code modification request..."
                  : "Ask anything about the codebase..."}
                className="flex-1 bg-gray-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIAgent; 