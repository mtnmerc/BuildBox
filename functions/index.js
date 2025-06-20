const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenAI = require('openai');
const { Octokit } = require('octokit');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: functions.config().openai.key,
});

// Initialize GitHub Octokit
const octokit = new Octokit({
  auth: functions.config().github.token,
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
exports.editWithAI = functions.https.onCall(async (data, context) => {
  try {
    const { prompt, filePath, fileName, currentContent, language, repoContext, mode } = data;

    if (mode === 'repo') {
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
  try {
    const { repo, branch = 'main' } = data;

    if (!repo) {
      return {
        success: false,
        error: 'Repository name is required'
      };
    }

    const [owner, repoName] = repo.split('/');
    
    if (!owner || !repoName) {
      return {
        success: false,
        error: 'Invalid repository format. Use: owner/repo-name'
      };
    }

    // Get repository contents recursively
    const getContents = async (path = '') => {
      try {
        const response = await octokit.rest.repos.getContent({
          owner,
          repo: repoName,
          path,
          ref: branch
        });

        const files = [];
        
        if (Array.isArray(response.data)) {
          // Directory
          for (const item of response.data) {
            if (item.type === 'file') {
              // Get file content
              const fileResponse = await octokit.rest.repos.getContent({
                owner,
                repo: repoName,
                path: item.path,
                ref: branch
              });
              
              const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
              
              files.push({
                name: item.name,
                path: item.path,
                content: content,
                size: item.size,
                type: item.type,
                isModified: false
              });
            } else if (item.type === 'dir') {
              // Recursively get subdirectory contents
              const subFiles = await getContents(item.path);
              files.push(...subFiles);
            }
          }
        } else {
          // Single file
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          
          files.push({
            name: response.data.name,
            path: response.data.path,
            content: content,
            size: response.data.size,
            type: response.data.type,
            isModified: false
          });
        }

        return files;
      } catch (error) {
        console.error(`Error getting contents for path ${path}:`, error);
        return [];
      }
    };

    const files = await getContents();

    return {
      success: true,
      files,
      repo,
      branch
    };

  } catch (error) {
    console.error('Pull Repo Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to pull repository'
    };
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