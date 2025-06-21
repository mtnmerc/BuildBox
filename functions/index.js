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
const octokit = new Octokit();

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

const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/replit/replit-code-v1_5-3b";

// AI Code Editing Function
exports.editWithAI = functions.runWith({ timeoutSeconds: 300 }).https.onCall(async (data, context) => {
  const { prompt, files, mode } = data; // mode can be 'plan' or 'execute'
  const token = functions.config().huggingface.token;

  if (!token) {
    console.error("Hugging Face token is not configured.");
    return { success: false, error: "AI service is not configured on the server." };
  }

  if (!prompt || !files || !mode) {
    return { success: false, error: "Missing required parameters: prompt, files, and mode." };
  }

  let systemPrompt = "";
  if (mode === 'plan') {
    systemPrompt = `You are an expert software architect. Analyze the user's request and the provided files to create a detailed, structured plan for code changes.

Respond with ONLY a valid JSON object in the exact format specified below. Do not include any markdown, explanations, or text outside the JSON structure.

JSON Format:
{
  "plan": "A brief, one-sentence description of the overall change.",
  "explanation": "A detailed explanation of the approach and reasoning for the changes.",
  "files_to_edit": [
    {
      "file_path": "path/to/file.js",
      "reason": "Why this file needs to be changed to achieve the user's goal."
    }
  ]
}`;
  } else if (mode === 'execute') {
    systemPrompt = `You are an expert code editor. Your task is to modify the provided code according to the user's request.

You will be given a list of files and their current content. You must return ONLY a valid JSON object containing the full, updated content for each file you were asked to modify. Do not include any markdown, explanations, or text outside the JSON structure.

JSON Format:
{
  "file_changes": [
    {
      "file_path": "path/to/file.js",
      "updated_content": "The complete, new content of the file."
    }
  ]
}`;
  } else {
    return { success: false, error: `Invalid mode specified: ${mode}.` };
  }

  const fileContext = files.map(f => `// File: ${f.path}\n${f.content}`).join('\n\n---\n\n');
  const fullPrompt = `${systemPrompt}\n\nUser Request: "${prompt}"\n\nFull Code Context:\n${fileContext}`;

  try {
    console.log(`Calling Hugging Face API in '${mode}' mode.`);
    const response = await axios.post(
      HUGGINGFACE_API_URL,
      {
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 4096,
          return_full_text: false,
          use_cache: false,
        },
      },
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const generatedText = response.data[0].generated_text;
    console.log("Received raw response from Hugging Face:", generatedText);

    // Clean the response to ensure it's valid JSON
    const jsonResponse = JSON.parse(generatedText.trim().replace(/```json/g, '').replace(/```/g, ''));
    
    console.log("Successfully parsed JSON response.");
    return { success: true, data: jsonResponse };

  } catch (error) {
    console.error("Error calling Hugging Face API:", error.response ? error.response.data : error.message);
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    return { success: false, error: `Failed to get response from AI model: ${errorMessage}` };
  }
});

// Pull Repository Function
exports.pullRepo = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
  console.log('pullRepo: Function triggered.');
  try {
    const { repoUrl } = data;
    console.log(`pullRepo: Received repoUrl: ${repoUrl}`);

    if (!repoUrl) {
      console.error('pullRepo: No repository URL provided.');
      return { data: { success: false, error: 'No repository URL provided' } };
    }

    const GITHUB_TOKEN = functions.config().github.token;
    if (!GITHUB_TOKEN) {
      console.error('pullRepo: GITHUB_TOKEN secret is not available.');
      return { data: { success: false, error: 'Authentication token is not configured on the server.' } };
    }

    // Modify the repoUrl to include the token for authentication
    const authedRepoUrl = repoUrl.replace('https://', `https://${GITHUB_TOKEN}@`);
    
    const urlParts = repoUrl.split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1].replace('.git', '');
    const repoDir = `${owner}-${repo}-${Date.now()}`;
    const tempDir = path.join('/tmp', repoDir);
    console.log(`pullRepo: Cloning into temporary directory: ${tempDir}`);

    try {
      // Use sparse checkout to ignore large binary files
      await execAsync(`git clone --depth 1 --filter=blob:none --no-checkout ${authedRepoUrl} ${tempDir}`);
      await execAsync(`git -C ${tempDir} sparse-checkout set --no-cone "/*" "!*.msi" "!*.exe" "!*.zip"`);
      await execAsync(`git -C ${tempDir} checkout`);
      console.log('pullRepo: Git clone with sparse checkout successful.');
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

// Helper function to read directory contents recursively
async function readDirectory(dir) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(await readDirectory(fullPath));
    } else {
      files.push({
        path: path.relative(dir, fullPath),
        content: await fs.readFile(fullPath, 'utf8')
      });
    }
  }
  return files;
} 