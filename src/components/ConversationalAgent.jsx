import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, Loader2, MessageSquare, Zap, Code, FileText, Target, CheckCircle, X, Play, Edit3, RotateCcw } from 'lucide-react';
import { editWithAI, pullRepo } from '../firebase';

const ConversationalAgent = ({ selectedFile, files, onCreateFile, onUpdateFile }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [sessionId] = useState(() => Date.now().toString());
  const messagesEndRef = useRef(null);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(`chat_history_${sessionId}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
      localStorage.removeItem(`chat_history_${sessionId}`);
    }
  }, [sessionId]);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`chat_history_${sessionId}`, JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
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
    addMessage(goal, 'user');
    
    try {
      console.log('Starting plan generation for goal:', goal);
      
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

      console.log('Project context:', projectContext);

      const result = await editWithAI({
        prompt: `Generate a conversational plan to achieve this goal: "${goal}"`,
        projectContext,
        mode: 'plan'
      });
      
      console.log('Raw result from Firebase:', result);
      
      if (!result || !result.data) {
        throw new Error('No response received from Firebase function');
      }
      
      console.log('Result data:', result.data);
      
      if (result.data.success && result.data.response) {
        console.log('Response received:', result.data.response);
        
        // The response is already a JSON string from the Firebase function
        try {
          const planData = JSON.parse(result.data.response);
          console.log('Parsed plan data:', planData);
          
          addMessage(planData, 'plan');
          setCurrentPlan(planData);
        } catch (parseError) {
          console.error('Failed to parse plan response:', parseError);
          console.error('Raw response that failed to parse:', result.data.response);
          addMessage(
            `Sorry, I received an invalid response format. Please try again.`,
            'error'
          );
        }
      } else {
        console.error('Firebase function returned error:', result.data.error);
        throw new Error(result.data.error || 'No response from AI');
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
    if (!currentPlan) {
      addMessage('No plan to execute.', 'error');
      return;
    }
    
    // Ensure currentPlan has the expected structure
    if (!currentPlan.files || !Array.isArray(currentPlan.files)) {
      addMessage('Invalid plan structure: missing files array.', 'error');
      return;
    }
    
    setIsLoading(true);
    addMessage('Executing plan...', 'system');
    
    try {
      // Execute each file change
      for (const fileChange of currentPlan.files) {
        if (!fileChange.action || !fileChange.filename) {
          console.warn('Invalid file change:', fileChange);
          continue;
        }
        
        if (fileChange.action === 'create') {
          const newFile = {
            name: fileChange.filename.split('/').pop(),
            path: fileChange.filename,
            content: fileChange.content || '',
            isNew: true,
            isModified: false
          };
          
          if (onCreateFile) {
            onCreateFile(newFile);
          }
          
          addMessage(`Created file: ${fileChange.filename}`, 'system');
        } else if (fileChange.action === 'edit') {
          const fileToUpdate = files.find(f => f.path === fileChange.filename);
          if (fileToUpdate) {
            const updatedFile = {
              ...fileToUpdate,
              content: fileChange.content || fileToUpdate.content,
              isModified: true
            };
            
            if (onUpdateFile) {
              onUpdateFile(updatedFile);
            }
            
            addMessage(`Updated file: ${fileChange.filename}`, 'system');
          } else {
            addMessage(`Warning: File not found: ${fileChange.filename}`, 'error');
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
    await generatePlan(userInput);
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
      'md': 'markdown'
    };
    return languageMap[ext] || 'plaintext';
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'user':
        return <Bot className="w-5 h-5" />;
      case 'ai':
      case 'plan':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'system':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <X className="w-5 h-5 text-red-400" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getMessageClass = (type) => {
    switch (type) {
      case 'user':
        return 'bg-blue-500 text-white self-end';
      case 'ai':
        return 'bg-gray-700';
      case 'plan':
        return 'bg-gray-800 border border-purple-500';
      case 'system':
        return 'bg-yellow-900/50 text-yellow-300';
      case 'error':
        return 'bg-red-900/50 text-red-300';
      case 'success':
        return 'bg-green-900/50 text-green-300';
      default:
        return 'bg-gray-700';
    }
  };

  const renderPlan = (plan) => {
    console.log('renderPlan called with:', plan);
    console.log('Plan type:', typeof plan);
    
    // Handle string input (JSON that needs parsing) - for backward compatibility
    if (typeof plan === 'string') {
      try {
        plan = JSON.parse(plan);
        console.log('Parsed string plan:', plan);
      } catch (e) {
        console.error('Failed to parse plan JSON:', e);
        return <div className="text-red-400">Invalid plan format: {plan}</div>;
      }
    }
    
    // Validate plan structure
    if (!plan || typeof plan !== 'object') {
      console.error('Invalid plan object:', plan);
      return <div className="text-red-400">Invalid plan structure.</div>;
    }

    // Ensure required fields exist
    if (!plan.plan && !plan.goal) {
      console.error('Plan missing goal:', plan);
      return <div className="text-red-400">Plan is missing required fields.</div>;
    }

    const goal = plan.goal || plan.plan;

    return (
      <div className="p-4 rounded-lg bg-gray-800 border border-purple-500">
        <h3 className="font-bold text-lg mb-2 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Plan: {goal || 'Untitled Plan'}
        </h3>
        {plan.explanation && (
          <p className="text-sm text-gray-400 mb-4">{plan.explanation}</p>
        )}
        
        {plan.files && plan.files.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Files to be changed:</h4>
            <ul className="list-none space-y-2">
              {plan.files.map((file, index) => (
                <li key={index} className="flex items-center text-sm p-2 rounded bg-gray-700/50">
                  {file.action === 'create' && <FileText className="w-4 h-4 mr-2 text-green-400" />}
                  {file.action === 'edit' && <Edit3 className="w-4 h-4 mr-2 text-yellow-400" />}
                  {file.action === 'delete' && <X className="w-4 h-4 mr-2 text-red-400" />}
                  <span className="font-mono">{file.filename}</span>
                  <span className="ml-auto text-xs uppercase font-semibold">{file.action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {plan.dependencies && plan.dependencies.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2">New Dependencies:</h4>
            <ul className="list-none space-y-2">
              {plan.dependencies.map((dep, index) => (
                <li key={index} className="flex items-center text-sm p-2 rounded bg-gray-700/50">
                  <Code className="w-4 h-4 mr-2" />
                  <span className="font-mono">{dep}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setCurrentPlan(null)}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={executePlan}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-green-600 hover:bg-green-500 flex items-center transition-colors"
          >
            <Play className="w-4 h-4 mr-2" />
            Execute Plan
          </button>
        </div>
      </div>
    );
  };
  
  const clearChat = () => {
    setMessages([]);
    setCurrentPlan(null);
    localStorage.removeItem(`chat_history_${sessionId}`);
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center">
          <Bot className="w-6 h-6 mr-2" />
          Conversational AI Agent
        </h2>
        <button
          onClick={clearChat}
          className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          title="Clear chat history"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => {
            try {
              return (
                <div key={msg.id} className={`flex items-start gap-3 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                  {msg.type !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      {getMessageIcon(msg.type)}
                    </div>
                  )}
                  
                  <div className={`p-3 rounded-lg max-w-lg ${getMessageClass(msg.type)}`}>
                    {msg.type === 'plan' ? (
                      renderPlan(msg.content)
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-1 text-right">{msg.timestamp}</div>
                  </div>
                  
                  {msg.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      {getMessageIcon(msg.type)}
                    </div>
                  )}
                </div>
              );
            } catch (error) {
              console.error('Error rendering message:', error, msg);
              return (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-700 flex items-center justify-center">
                    <X className="w-5 h-5" />
                  </div>
                  <div className="p-3 rounded-lg bg-red-900/50 text-red-300">
                    <p className="text-sm">Error rendering message: {error.message}</p>
                  </div>
                </div>
              );
            }
          })}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="p-3 rounded-lg bg-gray-700">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to build or ask me anything..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 p-2 rounded-lg disabled:bg-gray-600"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationalAgent; 