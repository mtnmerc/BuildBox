import React, { useState } from 'react';
import VSCodeEmbed from './components/VSCodeEmbed';

function App() {
  const [showVSCode, setShowVSCode] = useState(false);

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
        <h1>BuilderBox v2 - VS Code Integration Test</h1>
        <p>Frontend is deploying successfully. VS Code integration ready.</p>
        <button 
          onClick={() => setShowVSCode(!showVSCode)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {showVSCode ? 'Hide VS Code' : 'Show VS Code'}
        </button>
      </div>

      {/* VS Code iframe */}
      {showVSCode && (
        <div style={{ flex: 1, position: 'relative' }}>
          <VSCodeEmbed />
        </div>
      )}

      {/* Info panel when VS Code is hidden */}
      {!showVSCode && (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white', 
          backgroundColor: '#1e1e1e'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2>VS Code Integration Ready</h2>
            <p>Click the button above to launch VS Code via code-server</p>
            <p style={{ fontSize: '12px', color: '#888' }}>
              This will load a full VS Code instance in an iframe
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 