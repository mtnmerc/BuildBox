# BuilderBox 📦

A lightweight, mobile-first personal development environment with AI-powered code editing.

## ⚠️ Required Setup

**BuilderBox requires the following API keys and services to function:**

1. **Firebase Project** - For hosting and cloud functions
2. **OpenAI API Key** - For AI code editing features  
3. **GitHub Personal Access Token** - For repository access

**Quick Setup:**
```bash
# Run the setup wizard
node setup.js

# Or follow the manual setup below
```

## 🚀 Features

- **📝 Monaco Editor** - Professional code editing experience
- **📂 GitHub Integration** - Load and edit files from external repositories
- **🧠 AI Code Assistant** - Natural language code modifications using OpenAI
- **🔍 Live Preview** - Real-time preview for HTML/CSS/JS files
- **📱 Mobile-First** - Responsive design optimized for mobile devices
- **🔥 Firebase Backend** - Scalable cloud functions and hosting
- **📲 PWA + APK** - Installable as web app or export as mobile app

## 🏗️ Architecture

```
BuilderBox/
├── src/
│   ├── components/
│   │   ├── FileTree.jsx      # GitHub repo file explorer
│   │   ├── Editor.jsx        # Monaco code editor
│   │   ├── Preview.jsx       # Live preview panel
│   │   └── AIAgent.jsx       # AI assistant interface
│   ├── App.js               # Main application
│   └── firebase.js          # Firebase configuration
├── functions/
│   ├── editWithAI.js        # OpenAI code editing
│   ├── pullRepo.js          # GitHub repo loading
│   └── pushChanges.js       # GitHub commit/push
└── public/
    └── manifest.json        # PWA configuration
```

## 🛠️ Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- **GitHub Personal Access Token** (with `repo` scope)
- **OpenAI API Key** (with credits)

### 2. Quick Setup (Recommended)

```bash
# Run the interactive setup wizard
node setup.js
```

The wizard will guide you through:
- Firebase project configuration
- API key setup
- Environment configuration
- Deployment instructions

### 3. Manual Setup

#### Step 1: Get API Keys

**Firebase Project:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Hosting and Functions
4. Go to Project Settings > General > Your apps
5. Add a web app and copy the config values

**OpenAI API Key:**
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (you'll need credits for AI features)

**GitHub Personal Access Token:**
1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Generate new token (classic)
3. Select scopes: `repo` (for private repos) or `public_repo` (for public repos)
4. Copy the token

#### Step 2: Install Dependencies

```bash
# Install React app dependencies
npm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

#### Step 3: Configure Firebase

1. Update `.firebaserc` with your project ID:
   ```json
   {
     "projects": {
       "default": "your-builderbox-project-id"
     }
   }
   ```

2. Update `src/firebase.js` with your Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

#### Step 4: Set Environment Variables

```bash
# Set OpenAI API key
firebase functions:config:set openai.key="your-openai-api-key"

# Set GitHub token
firebase functions:config:set github.token="your-github-token"
```

#### Step 5: Deploy Firebase Functions

```bash
firebase deploy --only functions
```

#### Step 6: Build and Deploy

```bash
# Build the React app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## 📱 Mobile App Export

### PWA Installation
BuilderBox is automatically installable as a PWA. Users can:
1. Open BuilderBox in Chrome/Safari
2. Click "Add to Home Screen" or "Install App"
3. Use BuilderBox like a native app

### APK Export with Capacitor

```bash
# Install Capacitor CLI
npm install -g @capacitor/cli

# Initialize Capacitor
npx cap init

# Add Android platform
npx cap add android

# Build the app
npm run build

# Copy web assets to native project
npx cap copy android

# Open in Android Studio
npx cap open android
```

## 🎯 Usage

### 1. Load Repository
- Click "Load Repo" in the file tree
- BuilderBox will fetch files from `mtnmerc/BlueCollarBizWorx-1`

### 2. Edit Code
- Select any file from the file tree
- Edit in the Monaco editor
- Changes are saved locally

### 3. AI Assistant
- Select a file to edit
- Expand the AI Assistant panel
- Type natural language prompts like:
  - "Fix the login bug"
  - "Add error handling"
  - "Optimize this function"
  - "Add comments"

### 4. Live Preview
- Switch to "Preview" or "Split" layout
- See real-time preview of HTML/CSS/JS files
- Toggle between desktop and mobile views

### 5. Push to GitHub
- Click "Push to GitHub" in the header
- Changes are committed and pushed to the repository

## 🔧 Configuration

### Supported File Types
- **Code**: `.js`, `.jsx`, `.ts`, `.tsx`, `.py`, `.java`, `.cpp`, `.c`, `.php`, `.rb`, `.go`, `.rs`
- **Web**: `.html`, `.css`, `.scss`
- **Data**: `.json`, `.xml`, `.yaml`, `.yml`
- **Docs**: `.md`

### AI Assistant Prompts
The AI assistant can handle various requests:
- Bug fixes and debugging
- Code optimization
- Feature additions
- Code refactoring
- Documentation
- Accessibility improvements
- Performance enhancements

## 🚨 Important Notes

1. **API Keys Required**: BuilderBox cannot function without Firebase, OpenAI, and GitHub credentials
2. **No Authentication**: BuilderBox is designed for personal use only
3. **GitHub Permissions**: Your GitHub token needs `repo` scope for private repos
4. **OpenAI Costs**: AI features consume OpenAI API credits
5. **File Size Limits**: Large repositories may take time to load
6. **Mobile Performance**: Complex editing on mobile devices may be slower

## 🔒 Security

- API keys are stored securely in Firebase Functions config
- No user data is stored permanently
- All communication uses HTTPS
- GitHub tokens should have minimal required permissions

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Functions not working**
   - Check Firebase project configuration
   - Verify environment variables are set: `firebase functions:config:get`
   - Check function logs: `firebase functions:log`

2. **GitHub API errors**
   - Verify GitHub token has correct permissions
   - Check repository accessibility
   - Ensure repository format is `owner/repo-name`

3. **OpenAI API errors**
   - Verify OpenAI API key is valid
   - Check API usage limits
   - Ensure sufficient credits

4. **Mobile app issues**
   - Clear browser cache for PWA
   - Rebuild Capacitor project after changes
   - Check Android Studio for APK build errors

## 📄 License

This project is for personal use only. Please respect the terms of service for:
- OpenAI API
- GitHub API
- Firebase services

## 🤝 Contributing

This is a personal development tool. If you find bugs or have suggestions, feel free to create issues or fork the project for your own use.

---

**BuilderBox** - Your personal AI-powered development environment 🚀
