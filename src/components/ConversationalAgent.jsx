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
      <div className="flex-1 p-4 overflow-y-auto">
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

        {isTyping && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-white flex items-center justify-center">
                <Zap size={16} />
              </div>
              <div className="p-3 rounded-2xl bg-white text-gray-900 shadow-lg border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your code..."
            className="w-full pl-4 pr-12 py-3 rounded-full bg-gray-100 text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            rows={1}
            style={{ overflowY: 'hidden' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
};

export default ConversationalAgent; 