import React, { useState, useCallback } from 'react';
import { Send, Bot, User, BrainCircuit, Check, X } from 'lucide-react';
import { editWithAI } from '../firebase';

const AgentPanel = ({ files, onFilesUpdate }) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      // Step 1: Get a plan from the AI
      const planResponse = await editWithAI({ prompt, files, mode: 'plan' });

      if (!planResponse.data.success) {
        throw new Error(planResponse.data.error || 'Failed to get a plan from the AI.');
      }
      
      const planData = planResponse.data.data;
      const agentMessage = {
        role: 'agent',
        content: `I've created a plan to address your request:`,
        plan: planData,
      };
      setMessages(prev => [...prev, agentMessage]);
      setCurrentPlan(planData);

    } catch (error) {
      console.error('Error getting AI plan:', error);
      const errorMessage = { role: 'agent', content: `Sorry, I encountered an error: ${error.message}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecutePlan = async () => {
    if (!currentPlan) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'agent', content: 'Executing the plan...' }]);

    try {
      // Step 2: Execute the plan
      const executeResponse = await editWithAI({
        prompt: `Execute the following plan: ${JSON.stringify(currentPlan)}`,
        files,
        mode: 'execute'
      });

      if (!executeResponse.data.success) {
        throw new Error(executeResponse.data.error || 'Failed to execute the plan.');
      }

      const { file_changes } = executeResponse.data.data;
      
      // Update the files in the parent component
      onFilesUpdate(prevFiles => {
        return prevFiles.map(f => {
          const change = file_changes.find(c => c.file_path === f.path);
          return change ? { ...f, content: change.updated_content, isModified: true } : f;
        });
      });

      setMessages(prev => [...prev, { role: 'agent', content: 'Changes have been applied to the editor.' }]);
      setCurrentPlan(null);

    } catch (error) {
      console.error('Error executing AI plan:', error);
      const errorMessage = { role: 'agent', content: `Sorry, I encountered an error during execution: ${error.message}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPlan = () => {
    setCurrentPlan(null);
    setMessages(prev => [...prev, { role: 'agent', content: 'Plan canceled.' }]);
  };

  const renderMessage = (msg, index) => {
    const isAgent = msg.role === 'agent';
    return (
      <div key={index} className={`flex items-start gap-3 my-4 ${isAgent ? '' : 'flex-row-reverse'}`}>
        <div className={`p-2 rounded-full ${isAgent ? 'bg-purple-600' : 'bg-blue-600'}`}>
          {isAgent ? <Bot size={20} /> : <User size={20} />}
        </div>
        <div className={`p-3 rounded-lg ${isAgent ? 'bg-gray-700' : 'bg-blue-800'}`}>
          <p>{msg.content}</p>
          {msg.plan && (
            <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-600">
              <h4 className="font-bold flex items-center gap-2"><BrainCircuit size={16} /> AI Execution Plan</h4>
              <p className="text-sm text-gray-400 mt-2">{msg.plan.explanation}</p>
              <ul className="mt-3 list-disc list-inside text-sm">
                {msg.plan.files_to_edit.map((file, i) => (
                  <li key={i}>
                    <strong>{file.file_path}</strong>: {file.reason}
                  </li>
                ))}
              </ul>
              {!isLoading && (
                 <div className="mt-4 flex gap-2">
                  <button onClick={handleExecutePlan} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center justify-center gap-2">
                    <Check size={16} /> Confirm & Apply
                  </button>
                  <button onClick={handleCancelPlan} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center justify-center gap-2">
                    <X size={16} /> Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full text-white">
      <header className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 && <p className="text-gray-400 text-center">Ask me to make a change to your code.</p>}
        {messages.map(renderMessage)}
        {isLoading && <p className="text-gray-400 text-center animate-pulse">AI is thinking...</p>}
      </div>
      <footer className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Add a button to the header'"
              className="w-full pl-3 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              disabled={isLoading || currentPlan !== null}
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" disabled={isLoading || currentPlan !== null}>
              <Send size={20} />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default AgentPanel; 