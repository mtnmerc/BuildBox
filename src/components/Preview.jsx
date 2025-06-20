import React, { useState, useEffect, useRef } from 'react';
import { Eye, RefreshCw, Maximize2, Minimize2, Smartphone, Monitor } from 'lucide-react';

const Preview = ({ files, selectedFile }) => {
  const [previewContent, setPreviewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('desktop'); // desktop, mobile
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef(null);

  // Get all HTML, CSS, and JS files for preview
  const getPreviewFiles = () => {
    const htmlFiles = files.filter(f => f.name.endsWith('.html'));
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    const jsFiles = files.filter(f => f.name.endsWith('.js') || f.name.endsWith('.jsx'));
    
    return { htmlFiles, cssFiles, jsFiles };
  };

  const generatePreviewHTML = () => {
    const { htmlFiles, cssFiles, jsFiles } = getPreviewFiles();
    
    if (htmlFiles.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Preview</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: #f5f5f5; 
            }
            .preview-placeholder {
              text-align: center;
              padding: 50px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="preview-placeholder">
            <h2>No HTML file found</h2>
            <p>Create an HTML file to see the preview here</p>
          </div>
        </body>
        </html>
      `;
    }

    // Use the first HTML file as base
    const mainHTML = htmlFiles[0].content || '';
    
    // Extract existing styles and scripts
    let finalHTML = mainHTML;
    
    // Add CSS files
    cssFiles.forEach(cssFile => {
      const cssContent = cssFile.content || '';
      if (!finalHTML.includes(cssContent)) {
        finalHTML = finalHTML.replace('</head>', `<style>${cssContent}</style></head>`);
      }
    });
    
    // Add JS files
    jsFiles.forEach(jsFile => {
      const jsContent = jsFile.content || '';
      if (!finalHTML.includes(jsContent)) {
        finalHTML = finalHTML.replace('</body>', `<script>${jsContent}</script></body>`);
      }
    });

    return finalHTML;
  };

  const refreshPreview = () => {
    setIsLoading(true);
    const html = generatePreviewHTML();
    setPreviewContent(html);
    
    // Small delay to show loading state
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  useEffect(() => {
    if (files.length > 0) {
      refreshPreview();
    }
  }, [files]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getPreviewContainerClass = () => {
    let baseClass = 'bg-white border border-gray-300 rounded-lg overflow-hidden';
    
    if (viewMode === 'mobile') {
      baseClass += ' max-w-sm mx-auto';
    }
    
    if (isFullscreen) {
      baseClass = 'fixed inset-0 z-50 bg-white';
    }
    
    return baseClass;
  };

  const getIframeStyle = () => {
    if (isFullscreen) {
      return { width: '100%', height: '100%', border: 'none' };
    }
    
    if (viewMode === 'mobile') {
      return { 
        width: '100%', 
        height: '600px', 
        border: 'none',
        transform: 'scale(0.8)',
        transformOrigin: 'top center'
      };
    }
    
    return { width: '100%', height: '600px', border: 'none' };
  };

  if (!files.length) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <Eye size={48} className="mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Preview Available</h3>
          <p className="text-sm">Load files from the repository to see preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Preview Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye size={20} className="text-gray-400" />
          <span className="text-sm font-medium text-white">Live Preview</span>
          {isLoading && (
            <RefreshCw size={16} className="text-blue-400 animate-spin" />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-1 rounded ${viewMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Mobile view"
          >
            <Smartphone size={16} />
          </button>
          
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-1 rounded ${viewMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Desktop view"
          >
            <Monitor size={16} />
          </button>
          
          <button
            onClick={refreshPreview}
            className="text-gray-400 hover:text-white p-1"
            title="Refresh preview"
          >
            <RefreshCw size={16} />
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="text-gray-400 hover:text-white p-1"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className={getPreviewContainerClass()}>
          <iframe
            ref={iframeRef}
            srcDoc={previewContent}
            style={getIframeStyle()}
            title="Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};

export default Preview; 