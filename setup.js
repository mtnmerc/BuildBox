#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 BuilderBox Setup Wizard');
console.log('==========================\n');

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupBuilderBox() {
  try {
    console.log('⚠️  IMPORTANT: You need the following API keys and configurations:');
    console.log('   1. Firebase project (for hosting and functions)');
    console.log('   2. OpenAI API key (for AI code editing)');
    console.log('   3. GitHub Personal Access Token (for repo access)\n');

    // Firebase Configuration
    console.log('📋 Step 1: Firebase Configuration');
    console.log('1. Go to: https://console.firebase.google.com/');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable Hosting and Functions');
    console.log('4. Go to Project Settings > General > Your apps');
    console.log('5. Add a web app and copy the config values\n');
    
    const firebaseProjectId = await question('Enter your Firebase Project ID: ');
    if (!firebaseProjectId) {
      console.log('❌ Firebase Project ID is required!');
      return;
    }

    const firebaseApiKey = await question('Enter your Firebase API Key: ');
    if (!firebaseApiKey) {
      console.log('❌ Firebase API Key is required!');
      return;
    }

    const firebaseAuthDomain = await question('Enter your Firebase Auth Domain: ');
    const firebaseStorageBucket = await question('Enter your Firebase Storage Bucket: ');
    const firebaseMessagingSenderId = await question('Enter your Firebase Messaging Sender ID: ');
    const firebaseAppId = await question('Enter your Firebase App ID: ');

    // Update .firebaserc
    const firebasercContent = {
      projects: {
        default: firebaseProjectId
      }
    };
    
    fs.writeFileSync('.firebaserc', JSON.stringify(firebasercContent, null, 2));
    console.log('✅ Updated .firebaserc');

    // Update firebase.js
    const firebaseJsContent = `import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "${firebaseApiKey}",
  authDomain: "${firebaseAuthDomain}",
  projectId: "${firebaseProjectId}",
  storageBucket: "${firebaseStorageBucket}",
  messagingSenderId: "${firebaseMessagingSenderId}",
  appId: "${firebaseAppId}"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Firebase Functions
export const editWithAI = httpsCallable(functions, 'editWithAI');
export const pullRepo = httpsCallable(functions, 'pullRepo');
export const pushChanges = httpsCallable(functions, 'pushChanges');

export { app, functions };
`;

    fs.writeFileSync('src/firebase.js', firebaseJsContent);
    console.log('✅ Updated src/firebase.js');

    // OpenAI API Key
    console.log('\n📋 Step 2: OpenAI API Key');
    console.log('1. Go to: https://platform.openai.com/api-keys');
    console.log('2. Create a new API key');
    console.log('3. Copy the key (you\'ll need credits for AI features)\n');
    
    const openaiKey = await question('Enter your OpenAI API Key: ');
    if (!openaiKey) {
      console.log('⚠️  Warning: AI features will not work without OpenAI API key');
    }

    // GitHub Token
    console.log('\n📋 Step 3: GitHub Personal Access Token');
    console.log('1. Go to: https://github.com/settings/tokens');
    console.log('2. Generate new token (classic)');
    console.log('3. Select scopes: repo (for private repos) or public_repo (for public repos)');
    console.log('4. Copy the token\n');
    
    const githubToken = await question('Enter your GitHub Personal Access Token: ');
    if (!githubToken) {
      console.log('❌ GitHub token is required for repository access!');
      return;
    }

    // Generate setup commands
    console.log('\n🔧 Step 4: Setting up API Keys');
    console.log('Run these commands to configure Firebase Functions:\n');
    
    if (openaiKey) {
      console.log(`firebase functions:config:set openai.key="${openaiKey}"`);
    }
    
    if (githubToken) {
      console.log(`firebase functions:config:set github.token="${githubToken}"`);
    }

    // Installation instructions
    console.log('\n📋 Step 5: Installation');
    console.log('Run these commands to complete setup:\n');
    console.log('1. Install dependencies:');
    console.log('   npm install');
    console.log('   cd functions && npm install && cd ..\n');
    
    console.log('2. Deploy Firebase Functions:');
    console.log('   firebase deploy --only functions\n');
    
    console.log('3. Build and deploy the app:');
    console.log('   npm run build');
    console.log('   firebase deploy --only hosting\n');

    // Test instructions
    console.log('🧪 Step 6: Testing');
    console.log('After deployment:');
    console.log('1. Visit your Firebase Hosting URL');
    console.log('2. Click "Load Repo" to test GitHub integration');
    console.log('3. Select a file and try the AI assistant');
    console.log('4. Test the live preview with HTML files\n');

    // Mobile setup
    console.log('📱 Step 7: Mobile App Setup (Optional)');
    console.log('To create mobile apps:\n');
    console.log('1. Install Capacitor: npm install -g @capacitor/cli');
    console.log('2. Initialize: npx cap init');
    console.log('3. Add Android: npx cap add android');
    console.log('4. Build: npm run build && npx cap copy android');
    console.log('5. Open in Android Studio: npx cap open android\n');

    console.log('🎉 Setup complete!');
    console.log('Visit your Firebase Hosting URL to start using BuilderBox.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setupBuilderBox(); 