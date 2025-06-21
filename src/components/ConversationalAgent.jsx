import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Code, Play, Copy, Download, Sparkles, Loader2, FileText, MessageSquare, Zap } from 'lucide-react';
import { callOpenAI } from '../firebase';

const ConversationalAgent = ({ selectedFile, files, onCreateFile, onUpdateFile }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-focus input on mobile
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Create context from current file and project structure
      const context = {
        currentFile: selectedFile,
        projectFiles: files,
        conversationHistory: messages.slice(-10) // Last 10 messages for context
      };

      const response = await callOpenAI({
        message: input,
        context: JSON.stringify(context),
        mode: 'conversational'
      });

      if (response.data && response.data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
          suggestions: response.data.suggestions || []
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.data?.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('AI Response Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const extractCodeBlocks = (content) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        blocks.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        });
      }

      // Add code block
      blocks.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2].trim()
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      blocks.push({
        type: 'text',
        content: content.slice(lastIndex)
      });
    }

    return blocks.length > 0 ? blocks : [{ type: 'text', content }];
  };

  const renderMessage = (message) => {
    const blocks = extractCodeBlocks(message.content);
    
    return (
      <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            message.role === 'user' 
              ? 'bg-blue-600 text-white' 
              : message.isError 
                ? 'bg-red-600 text-white' 
                : 'bg-gradient-to-br from-purple-500 to-blue-600 text-white'
          }`}>
            {message.role === 'user' ? (
              <User size={16} />
            ) : message.isError ? (
              <span className="text-xs">!</span>
            ) : (
              <Zap size={16} />
            )}
          </div>

          {/* Message Content */}
          <div className={`flex-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-3 rounded-2xl ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : message.isError
                  ? 'bg-red-100 text-red-800'
                  : 'bg-white text-gray-900 shadow-lg border border-gray-200'
            }`}>
              {blocks.map((block, index) => (
                <div key={index}>
                  {block.type === 'text' && (
                    <div className="whitespace-pre-wrap">{block.content}</div>
                  )}
                  {block.type === 'code' && (
                    <div className="mt-2 bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-700 text-gray-300 text-xs">
                        <span className="font-mono">{block.language}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(block.content)}
                            className="hover:text-white transition-colors"
                            title="Copy code"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={() => {
                              // Could implement run code functionality
                              console.log('Run code:', block.content);
                            }}
                            className="hover:text-white transition-colors"
                            title="Run code"
                          >
                            <Play size={12} />
                          </button>
                        </div>
                      </div>
                      <pre className="p-3 text-sm text-gray-200 overflow-x-auto">
                        <code>{block.content}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Suggestions */}
            {message.suggestions && message.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-sm transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">BuilderBox AI</h2>
            <p className="text-xs text-gray-500">
              {selectedFile ? `Working on: ${selectedFile.name}` : 'Ready to help with your code'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <Sparkles size={10} className="inline mr-1" />
            Replit Style
          </div>
          <button
            onClick={() => setMessages([])}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            title="Clear chat"
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to BuilderBox AI</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              I'm your AI coding assistant with a Replit-style interface! Ask me anything about your code, 
              get help with debugging, or let me suggest improvements.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "Create a new React component",
                "Debug this code",
                "Add TypeScript types",
                "Optimize performance",
                "Explain this function",
                "Write tests for this"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm border border-gray-200 transition-colors shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(renderMessage)}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your code..."
              className="w-full p-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              rows="1"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-full transition-all shadow-lg"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-1 hover:text-gray-700 transition-colors">
              <FileText size={12} />
              <span>Files</span>
            </button>
            <button className="flex items-center space-x-1 hover:text-gray-700 transition-colors">
              <Code size={12} />
              <span>Code</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationalAgent; 