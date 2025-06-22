import React from 'react';

function App() {
  const codeServerUrl = "https://code-server-production-4ab1.up.railway.app";

  const openCodeServer = () => {
    window.open(codeServerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        padding: '1rem', 
        textAlign: 'center', 
        color: 'white', 
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid #333'
      }}>
        <h1>BuilderBox v2 - VS Code Integration</h1>
        <p>Your cloud development environment.</p>
        <button 
          onClick={openCodeServer}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Open VS Code
        </button>
      </div>

      {/* Info panel */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white', 
        backgroundColor: '#1e1e1e'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '1rem' }}>
          <h2>Welcome to BuilderBox</h2>
          <p style={{color: '#aaa', marginTop: '0.5rem'}}>
            Click the button above to launch your code-server instance in a new tab. All authentication will be handled there.
          </p>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '2rem' }}>
            Future updates will re-integrate the editor directly into this view.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App; 