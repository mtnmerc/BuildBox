const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenAI = require('openai');
const { Octokit } = require('@octokit/rest');
const cors = require('cors')({ origin: true });
const { VertexAI } = require('@google-cloud/vertexai');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

admin.initializeApp();

// Initialize GitHub Octokit
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Use a personal access token for authentication
});

// Initialize Vertex AI (for future use)
let vertexAI;
try {
  vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT || 'buildbox-50322',
    location: 'us-central1',
  });
} catch (error) {
  console.log('Vertex AI initialization failed:', error.message);
}

// OpenAI client will be initialized inside functions that need it
// since Firebase secrets are only available within functions

const execAsync = promisify(exec);

// CORS middleware
const corsHandler = (req, res) => {
  return new Promise((resolve, reject) => {
    cors(req, res, (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
};

// AI Code Editing Function
exports.editWithAI = functions
  .runWith({ secrets: ["OPENAI_API_KEY"] })
  .https.onCall(async (data, context) => {
  // Initialize OpenAI client inside the function where secrets are available
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    const { prompt, filePath, fileName, currentContent, language, repoContext, mode, projectContext } = data;

    if (mode === 'plan') {
      // New plan-and-edit mode
      if (!prompt || !projectContext) {
        return {
          success: false,
          error: 'Missing required parameters for plan mode'
        };
      }

      const systemPrompt = `You are an expert software architect and developer. Your task is to analyze a project and create a detailed, structured plan to achieve a specific goal.

IMPORTANT: You must respond with ONLY valid JSON in the exact format specified. No markdown, no explanations outside the JSON.

Rules:
1. Analyze the entire project structure and context
2. Create a comprehensive plan that addresses the goal
3. Identify all files that need to be created, modified, or deleted
4. Provide specific, actionable steps
5. Consider dependencies and implementation order
6. Ensure the plan is realistic and achievable
7. Return ONLY the JSON response, no other text

Required JSON Format:
{
  "plan": "Brief description of what will be done",
  "explanation": "Detailed explanation of the approach and reasoning",
  "files": [
    {
      "filename": "path/to/file.js",
      "action": "create|edit|delete",
      "content": "full file content (for create action)",
      "diff": "specific changes in unified diff format (for edit action)",
      "reason": "why this change is needed"
    }
  ],
  "dependencies": ["list of any new npm packages needed"],
  "steps": ["step1", "step2", "step3"]
}

Project Context:
- Goal: ${projectContext.goal}
- Mode: ${projectContext.mode}
- Files: ${projectContext.files.length} files available
- Selected File: ${projectContext.selectedFile ? projectContext.selectedFile.name : 'None'}

Available Files:
${projectContext.files.map(f => `${f.path} (${f.language})`).join('\n')}

User Goal: ${prompt}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please create a detailed plan to achieve this goal: "${prompt}"

Here are the current project files:
${projectContext.files.map(f => `\n--- ${f.path} ---\n${f.content}`).join('\n')}

Return ONLY the JSON plan, no other text.`
          }
        ],
        temperature: 0.1,
        max_tokens: 4096
      });

      const response = completion.choices[0].message.content.trim();
      
      // Try to extract JSON from the response
      let jsonResponse;
      try {
        // Remove any markdown formatting if present
        const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        jsonResponse = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Raw Response:', response);
        return {
          success: false,
          error: 'Invalid JSON response from AI. Please try again.'
        };
      }

      return {
        success: true,
        response: JSON.stringify(jsonResponse, null, 2)
      };

    } else if (mode === 'repo') {
      if (!prompt || !repoContext) {
        return {
          success: false,
          error: 'Missing required parameters for repository mode'
        };
      }

      const systemPrompt = `You are an expert code assistant with access to the entire repository context.
      Your task is to analyze the codebase and provide detailed answers to the user's questions.
      
      Rules:
      1. Provide clear, concise answers
      2. Reference specific files and line numbers when relevant
      3. Include code snippets when helpful
      4. If you need to suggest changes, explain them clearly
      5. Consider the entire codebase context in your answers
      
      Repository: ${repoContext.repo}
      Branch: ${repoContext.branch}
      Available Files: ${repoContext.files.map(f => f.path).join(', ')}
      
      User Question: ${prompt}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Here is the repository context:\n\n${JSON.stringify(repoContext.files.map(f => ({
              path: f.path,
              content: f.content
            })), null, 2)}\n\nPlease answer this question: ${prompt}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      return {
        success: true,
        response: completion.choices[0].message.content.trim()
      };
    } else {
      // File mode (existing code)
      if (!prompt || !currentContent) {
        return {
          success: false,
          error: 'Missing required parameters for file mode'
        };
      }

      const systemPrompt = `You are an expert code editor. You will receive code and a user request to modify it. 
      Your task is to modify the code according to the user's request and return ONLY the modified code without any explanations or markdown formatting.
      
      Rules:
      1. Return ONLY the modified code
      2. Do not include any explanations, comments about changes, or markdown
      3. Preserve the original structure and formatting as much as possible
      4. Make minimal necessary changes to fulfill the request
      5. If the request is unclear, make reasonable assumptions
      6. Ensure the code is syntactically correct for the language: ${language}
      
      File: ${fileName}
      Language: ${language}
      User Request: ${prompt}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Here is the current code:\n\n${currentContent}\n\nPlease modify it according to this request: ${prompt}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      const modifiedContent = completion.choices[0].message.content.trim();

      return {
        success: true,
        modifiedContent,
        explanation: `Code modified successfully based on: "${prompt}"`
      };
    }
  } catch (error) {
    console.error('AI Edit Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process AI request'
    };
  }
});

// Pull Repository Function
exports.pullRepo = functions
  .runWith({ secrets: ["GITHUB_TOKEN"] })
  .https.onCall(async (data, context) => {
  console.log('pullRepo: Function triggered.');
  try {
    const { repoUrl } = data;
    console.log(`pullRepo: Received repoUrl: ${repoUrl}`);

    if (!repoUrl) {
      console.error('pullRepo: No repository URL provided.');
      return { data: { success: false, error: 'No repository URL provided' } };
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      console.error('pullRepo: GITHUB_TOKEN secret is not available.');
      return { data: { success: false, error: 'Authentication token is not configured on the server.' } };
    }

    // Modify the repoUrl to include the token for authentication
    const authedRepoUrl = repoUrl.replace('https://', `https://${GITHUB_TOKEN}@`);
    
    const urlParts = repoUrl.split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1].replace('.git', '');
    const tempDir = `/tmp/${owner}-${repo}-${Date.now()}`;
    console.log(`pullRepo: Cloning into temporary directory: ${tempDir}`);

    try {
      // Use the authenticated URL for cloning
      await execAsync(`git clone --depth 1 ${authedRepoUrl} ${tempDir}`);
      console.log('pullRepo: Git clone successful.');
    } catch (cloneError) {
      console.error('pullRepo: Git clone failed.', cloneError);
      return { data: { success: false, error: `Failed to clone repository: ${cloneError.message}` } };
    }

    console.log('pullRepo: Reading cloned repository files.');
    const files = await readDirectory(tempDir);
    console.log(`pullRepo: Found ${files.length} files.`);
    await execAsync(`rm -rf ${tempDir}`);
    console.log('pullRepo: Cleaned up temporary directory.');

    return { data: { success: true, files: files } };
  } catch (error) {
    console.error('pullRepo: An unexpected error occurred.', {
      errorMessage: error.message,
      errorStack: error.stack,
      fullError: error,
    });
    return { data: { success: false, error: error.message || 'An unknown server error occurred in pullRepo.' } };
  }
});

// Push Changes Function
exports.pushChanges = functions.https.onCall(async (data, context) => {
  try {
    const { repo, files, commitMessage } = data;
    
    if (!repo || !files || !commitMessage) {
      return {
        data: {
          success: false,
          error: 'Missing required parameters'
        }
      };
    }

    // This would require GitHub API integration
    // For now, return a placeholder response
    return {
      data: {
        success: true,
        message: `Would push ${files.length} files to ${repo} with message: "${commitMessage}"`
      }
    };

  } catch (error) {
    console.error('Push Changes Error:', error);
    return {
      data: {
        success: false,
        error: error.message || 'Failed to push changes'
      }
    };
  }
});

exports.callOpenAI = functions
  .runWith({ secrets: ["OPENAI_API_KEY"] })
  .https.onCall(async (data, context) => {
    console.log('callOpenAI: Function triggered.');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    try {
      const { message, context: projectContextString, mode = 'conversational' } = data;
      console.log('callOpenAI: Received message:', message);
      console.log('callOpenAI: Received mode:', mode);

      if (!message) {
        console.error('callOpenAI: No message provided.');
        return { data: { success: false, error: 'No message provided' } };
      }

      const projectContext = JSON.parse(projectContextString || '{}');
      console.log('callOpenAI: Parsed project context successfully.');
      
      const systemPrompt = `You are BuilderBox AI, a helpful coding assistant integrated into a mobile-first development environment. Your role is to help users write, debug, and improve code. Provide clear, actionable advice, and format code blocks with proper syntax highlighting. Be conversational and friendly. Current context: ${projectContextString}`;
      const userPrompt = message;

      console.log('callOpenAI: Sending request to OpenAI...');
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      console.log('callOpenAI: Received response from OpenAI.');
      
      if (!response) {
        console.error('callOpenAI: OpenAI returned an empty response.');
        throw new Error('Empty response from AI');
      }

      return { data: { success: true, response: response, suggestions: [] } };
    } catch (error) {
      console.error('callOpenAI: An unexpected error occurred.', {
        errorMessage: error.message,
        errorStack: error.stack,
        fullError: error,
      });
      return { data: { success: false, error: error.message || 'An unknown server error occurred in callOpenAI.' } };
    }
});

// Helper function to extract suggestions from AI response
function extractSuggestions(response) {
  const suggestions = [];
  
  // Look for common follow-up questions or actions
  const commonSuggestions = [
    'Create a new component',
    'Add error handling',
    'Optimize performance',
    'Add TypeScript types',
    'Write tests',
    'Refactor this code',
    'Add documentation'
  ];

  // Simple heuristic: if response mentions certain topics, suggest related actions
  const responseLower = response.toLowerCase();
  
  if (responseLower.includes('component') || responseLower.includes('react')) {
    suggestions.push('Create a new React component');
  }
  
  if (responseLower.includes('error') || responseLower.includes('bug')) {
    suggestions.push('Add error handling');
  }
  
  if (responseLower.includes('performance') || responseLower.includes('optimize')) {
    suggestions.push('Optimize performance');
  }
  
  if (responseLower.includes('type') || responseLower.includes('typescript')) {
    suggestions.push('Add TypeScript types');
  }

  // Add some general suggestions if we don't have specific ones
  if (suggestions.length === 0) {
    suggestions.push(...commonSuggestions.slice(0, 3));
  }

  return suggestions.slice(0, 4); // Limit to 4 suggestions
}

// Legacy function for backward compatibility
exports.editWithAI = functions
  .runWith({ secrets: ["OPENAI_API_KEY"] })
  .https.onCall(async (data, context) => {
  // Initialize OpenAI client inside the function where secrets are available
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    const { prompt, projectContext, mode = 'plan' } = data;

    if (!prompt) {
      return {
        data: {
          success: false,
          error: 'No prompt provided'
        }
      };
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (mode === 'plan') {
      systemPrompt = `You are an AI coding assistant. Generate a structured plan to achieve the user's goal.

Respond with a JSON object containing:
{
  "goal": "The user's goal",
  "explanation": "Brief explanation of the approach",
  "files": [
    {
      "action": "create|edit|delete",
      "filename": "path/to/file",
      "content": "file content (for create/edit)"
    }
  ],
  "dependencies": ["package1", "package2"],
  "steps": ["Step 1", "Step 2", "Step 3"]
}`;

      userPrompt = `Goal: ${prompt}\n\nProject Context: ${JSON.stringify(projectContext)}`;
    } else {
      systemPrompt = `You are an AI coding assistant. Help the user with their coding task.`;
      userPrompt = `Task: ${prompt}\n\nProject Context: ${JSON.stringify(projectContext)}`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    return {
      data: {
        success: true,
        response: response
      }
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);
    return {
      data: {
        success: false,
        error: error.message || 'Failed to get AI response'
      }
    };
  }
}); 