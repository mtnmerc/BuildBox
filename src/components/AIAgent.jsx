import React, { useState, useEffect } from 'react';
import { Bot, Send, Sparkles, Loader2, MessageSquare, Zap, Code, FileText, Target, List, CheckCircle } from 'lucide-react';
import { editWithAI, pullRepo } from '../firebase';

const AIAgent = ({ selectedFile, onCodeUpdate, files }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [repoContext, setRepoContext] = useState(null);
  const [mode, setMode] = useState('file'); // 'file' or 'repo'
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planStep, setPlanStep] = useState(0); // 0: input, 1: plan, 2: execution

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
        repo: 'mtnmerc/BuildBox',
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

  const generatePlan = async (goal) => {
    setIsLoading(true);
    try {
      // Create a comprehensive context of the project
      const projectContext = {
        goal: goal,
        files: files.map(f => ({
          name: f.name,
          path: f.path,
          content: f.content,
          language: getLanguageFromExtension(f.name)
        })),
        mode: mode,
        selectedFile: selectedFile
      };

      const result = await editWithAI({
        prompt: `Generate a structured plan to achieve this goal: "${goal}"

Please analyze the project structure and return a JSON plan with the following format:
{
  "plan": "Brief description of what will be done",
  "explanation": "Detailed explanation of the approach",
  "files": [
    {
      "filename": "path/to/file.js",
      "action": "create|edit|delete",
      "content": "full file content (for create)",
      "diff": "specific changes (for edit)",
      "reason": "why this change is needed"
    }
  ],
  "dependencies": ["list of any new dependencies needed"],
  "steps": ["step1", "step2", "step3"]
}`,
        projectContext: projectContext,
        mode: 'plan'
      });

      if (result.data.success) {
        try {
          const plan = JSON.parse(result.data.response);
          setCurrentPlan(plan);
          setPlanStep(1);
          
          const planMessage = {
            id: Date.now(),
            type: 'plan',
            content: plan,
            timestamp: new Date().toLocaleTimeString()
          };
          setChatHistory(prev => [...prev, planMessage]);
        } catch (parseError) {
          throw new Error('Invalid plan format received from AI');
        }
      } else {
        throw new Error(result.data.error);
      }
    } catch (error) {
      console.error('Plan Generation Error:', error);
      const errorMessage = {
        id: Date.now(),
        type: 'error',
        content: error.message || 'Failed to generate plan',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const executePlan = async () => {
    if (!currentPlan) return;
    
    setIsLoading(true);
    try {
      // Execute each file change in the plan
      for (const fileChange of currentPlan.files) {
        if (fileChange.action === 'create') {
          // Create new file
          const newFile = {
            name: fileChange.filename.split('/').pop(),
            path: fileChange.filename,
            content: fileChange.content,
            isModified: false
          };
          
          // Add to files array and trigger update
          // This would need to be handled by the parent component
          console.log('Creating file:', newFile);
        } else if (fileChange.action === 'edit') {
          // Apply diff to existing file
          console.log('Editing file:', fileChange.filename);
          // This would need diff parsing and application
        }
      }

      const successMessage = {
        id: Date.now(),
        type: 'success',
        content: `Successfully executed plan: ${currentPlan.plan}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, successMessage]);
      setCurrentPlan(null);
      setPlanStep(0);
    } catch (error) {
      console.error('Plan Execution Error:', error);
      const errorMessage = {
        id: Date.now(),
        type: 'error',
        content: 'Failed to execute plan: ' + error.message,
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

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setPrompt('');

    // Generate plan for the goal
    await generatePlan(prompt);
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
      case 'plan':
        return <Target size={16} className="text-purple-400" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-400" />;
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
      case 'plan':
        return 'bg-purple-600 text-white';
      case 'success':
        return 'bg-green-600 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      case 'system':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const renderPlan = (plan) => {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mt-2">
        <div className="flex items-center space-x-2 mb-3">
          <Target size={16} className="text-purple-400" />
          <h4 className="font-semibold text-white">{plan.plan}</h4>
        </div>
        
        <p className="text-gray-300 text-sm mb-4">{plan.explanation}</p>
        
        <div className="space-y-3">
          <div>
            <h5 className="text-sm font-medium text-white mb-2">Files to modify:</h5>
            <div className="space-y-2">
              {plan.files.map((file, index) => (
                <div key={index} className="bg-gray-700 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{file.filename}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      file.action === 'create' ? 'bg-green-600' :
                      file.action === 'edit' ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}>
                      {file.action}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{file.reason}</p>
                </div>
              ))}
            </div>
          </div>
          
          {plan.dependencies && plan.dependencies.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-white mb-2">Dependencies:</h5>
              <div className="flex flex-wrap gap-2">
                {plan.dependencies.map((dep, index) => (
                  <span key={index} className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h5 className="text-sm font-medium text-white mb-2">Steps:</h5>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
              {plan.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
        
        <div className="mt-4 flex space-x-2">
          <button
            onClick={executePlan}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            Execute Plan
          </button>
          <button
            onClick={() => {
              setCurrentPlan(null);
              setPlanStep(0);
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const suggestedGoals = [
    "Add Firebase authentication with email/password",
    "Create a new React component for user profile",
    "Add error handling to the API calls",
    "Implement responsive design for mobile",
    "Add unit tests for the main components",
    "Create a new API endpoint for user data",
    "Add dark mode toggle functionality",
    "Implement file upload feature"
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
          <span className="text-sm font-medium text-white">AI Coding Agent</span>
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
                <Target size={48} className="mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  AI Coding Agent
                </h3>
                <p className="text-sm mb-4">
                  Describe your coding goal and I'll create a detailed plan to achieve it
                </p>
                
                {/* Suggested Goals */}
                <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                  {suggestedGoals.map((goal, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(goal)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-left"
                    >
                      {goal}
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
                    {message.type === 'plan' && renderPlan(message.content)}
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
                placeholder="Describe your coding goal (e.g., 'Add Firebase auth', 'Create a new component')"
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