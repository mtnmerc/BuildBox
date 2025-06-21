const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenAI = require('openai');
const { Octokit } = require('@octokit/rest');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Initialize GitHub Octokit
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Use a personal access token for authentication
});

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
  // Initialize OpenAI inside the function
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
exports.pullRepo = functions.https.onCall(async (data, context) => {
  const { owner, repo } = data;
  if (!owner || !repo) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with arguments "owner" and "repo".');
  }

  try {
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: 'main', // or specify a branch
      recursive: true,
    });

    const files = await Promise.all(
      tree.tree
        .filter(item => item.type === 'blob')
        .map(async (item) => {
          const { data: blob } = await octokit.git.getBlob({
            owner,
            repo,
            file_sha: item.sha,
          });
          return {
            name: item.path.split('/').pop(),
            path: item.path,
            content: Buffer.from(blob.content, 'base64').toString('utf-8'),
          };
        })
    );

    return { success: true, files };
  } catch (error) {
    console.error('GitHub API Error:', error);
    return { success: false, error: error.message };
  }
});

// Push Changes Function
exports.pushChanges = functions.https.onCall(async (data, context) => {
  try {
    const { repo, files, commitMessage } = data;

    if (!repo || !files || !Array.isArray(files) || files.length === 0) {
      return {
        success: false,
        error: 'Invalid parameters: repo and files array required'
      };
    }

    const [owner, repoName] = repo.split('/');
    
    if (!owner || !repoName) {
      return {
        success: false,
        error: 'Invalid repository format. Use: owner/repo-name'
      };
    }

    // Get current branch reference
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo: repoName,
      ref: 'heads/main'
    });

    const baseSha = ref.object.sha;

    // Create tree with updated files
    const tree = await octokit.rest.git.createTree({
      owner,
      repo: repoName,
      base_tree: baseSha,
      tree: files.map(file => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        content: file.content
      }))
    });

    // Create commit
    const commit = await octokit.rest.git.createCommit({
      owner,
      repo: repoName,
      message: commitMessage || 'BuilderBox: Update files',
      tree: tree.data.sha,
      parents: [baseSha]
    });

    // Update branch reference
    await octokit.rest.git.updateRef({
      owner,
      repo: repoName,
      ref: 'heads/main',
      sha: commit.data.sha
    });

    return {
      success: true,
      commitSha: commit.data.sha,
      message: `Successfully pushed ${files.length} file(s) to ${repo}`
    };

  } catch (error) {
    console.error('Push Changes Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to push changes'
    };
  }
}); 