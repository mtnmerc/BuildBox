import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, Loader2, MessageSquare, Zap, Code, FileText, Target, CheckCircle, X, Play, Edit3, RotateCcw } from 'lucide-react';
import { editWithAI, pullRepo } from '../firebase';

const ConversationalAgent = ({ selectedFile, onCodeUpdate, files, onFilesLoaded }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [sessionId] = useState(Date.now().toString());
  const messagesEndRef = useRef(null);

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat_history_${sessionId}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, [sessionId]);

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem(`chat_history_${sessionId}`, JSON.stringify(messages));
  }, [messages, sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (content, type = 'user', metadata = {}) => {
    const newMessage = {
      id: Date.now(),
      content,
      type,
      timestamp: new Date().toLocaleTimeString(),
      ...metadata
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const generatePlan = async (goal) => {
    setIsLoading(true);
    try {
      const projectContext = {
        goal,
        files: files.map(f => ({
          name: f.name,
          path: f.path,
          content: f.content,
          language: getLanguageFromExtension(f.name)
        })),
        selectedFile: selectedFile
      };

      const result = await editWithAI({
        prompt: `Generate a conversational plan to achieve this goal: "${goal}"

Please analyze the project and return a JSON plan with this format:
{
  "goal": "Brief description of what will be done",
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
  "steps": ["step1", "step2", "step3"],
  "questions": ["any clarifying questions for the user"]
}`,
        projectContext,
        mode: 'plan'
      });

      if (result.data.success) {
        try {
          const plan = JSON.parse(result.data.response);
          setCurrentPlan(plan);
          
          // Add plan message
          addMessage(plan, 'plan');
          
          // If there are questions, ask them
          if (plan.questions && plan.questions.length > 0) {
            addMessage(
              `I have some questions to clarify:\n${plan.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
              'ai',
              { needsClarification: true }
            );
          }
        } catch (parseError) {
          throw new Error('Invalid plan format received from AI');
        }
      } else {
        throw new Error(result.data.error);
      }
    } catch (error) {
      console.error('Plan Generation Error:', error);
      addMessage(
        `Sorry, I couldn't generate a plan: ${error.message}`,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const executePlan = async () => {
    if (!currentPlan) return;
    
    setIsLoading(true);
    addMessage('Executing plan...', 'system');
    
    try {
      // Execute each file change
      for (const fileChange of currentPlan.files) {
        if (fileChange.action === 'create') {
          const newFile = {
            name: fileChange.filename.split('/').pop(),
            path: fileChange.filename,
            content: fileChange.content,
            isModified: false
          };
          
          // Add to files array
          if (onFilesLoaded) {
            const updatedFiles = [...files, newFile];
            onFilesLoaded(updatedFiles);
          }
          
          addMessage(`Created file: ${fileChange.filename}`, 'system');
        } else if (fileChange.action === 'edit') {
          // Find and update existing file
          const fileIndex = files.findIndex(f => f.path === fileChange.filename);
          if (fileIndex !== -1) {
            const updatedFile = {
              ...files[fileIndex],
              content: fileChange.content || files[fileIndex].content,
              isModified: true
            };
            
            if (onCodeUpdate) {
              onCodeUpdate(updatedFile);
            }
            
            addMessage(`Updated file: ${fileChange.filename}`, 'system');
          }
        }
      }

      addMessage(
        `✅ Successfully executed plan: ${currentPlan.goal}`,
        'success'
      );
      setCurrentPlan(null);
    } catch (error) {
      console.error('Plan Execution Error:', error);
      addMessage(
        `❌ Failed to execute plan: ${error.message}`,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');
    
    // Add user message
    addMessage(userInput, 'user');

    // Check if this is a response to clarification questions
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'ai' && lastMessage?.needsClarification) {
      // This is a response to clarification questions
      addMessage('Thanks for the clarification! Let me update the plan...', 'ai');
      await generatePlan(userInput);
    } else {
      // This is a new goal/request
      await generatePlan(userInput);
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
          <h4 className="font-semibold text-white">{plan.goal}</h4>
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
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center space-x-2"
          >
            <Play size={16} />
            <span>Execute Plan</span>
          </button>
          <button
            onClick={() => {
              setCurrentPlan(null);
              addMessage('Plan cancelled. What would you like to do instead?', 'ai');
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center space-x-2"
          >
            <X size={16} />
            <span>Cancel</span>
          </button>
          <button
            onClick={() => {
              setCurrentPlan(null);
              generatePlan(input);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center space-x-2"
          >
            <Edit3 size={16} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>
    );
  };

  const suggestedPrompts = [
    "Add Firebase authentication with email/password",
    "Create a new React component for user profile",
    "Add error handling to the API calls",
    "Implement responsive design for mobile",
    "Add unit tests for the main components",
    "Create a new API endpoint for user data",
    "Add dark mode toggle functionality",
    "Implement file upload feature"
  ];

  const clearChat = () => {
    setMessages([]);
    setCurrentPlan(null);
    localStorage.removeItem(`chat_history_${sessionId}`);
  };

  return (
    <div className={`bg-gray-900 border-t border-gray-700 transition-all duration-300 ${
      isExpanded ? 'h-[500px]' : 'h-16'
    }`}>
      {/* Agent Header */}
      <div 
        className="bg-gray-800 px-4 py-2 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Bot size={20} className="text-green-400" />
          <span className="text-sm font-medium text-white">Conversational AI Agent</span>
          {isLoading && (
            <Loader2 size={16} className="text-green-400 animate-spin" />
          )}
        </div>
        
        <div className="flex items-center space-x-4">
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
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Bot size={48} className="mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Conversational AI Agent
                </h3>
                <p className="text-sm mb-4">
                  I'm your AI coding assistant. Describe what you want to build or ask me anything about your code!
                </p>
                
                {/* Suggested Prompts */}
                <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(prompt)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-1">
                      {getMessageIcon(message.type)}
                    </div>
                    <div className={`flex-1 max-w-xs px-3 py-2 rounded-lg text-sm ${getMessageClass(message.type)}`}>
                      <div className="mb-1 whitespace-pre-wrap">{message.content}</div>
                      {message.type === 'plan' && renderPlan(message.content)}
                      <div className="text-xs opacity-70">{message.timestamp}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what you want to build or ask me anything..."
                className="flex-1 bg-gray-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="bg-gray-600 text-white rounded px-3 py-2 text-sm font-medium hover:bg-gray-700"
                  title="Clear chat history"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ConversationalAgent; 