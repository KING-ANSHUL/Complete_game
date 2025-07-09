import React, { useState, useEffect, useCallback } from 'react';

export const FullscreenWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    }
  };

  return (
    <>
      {children}
      {!isFullscreen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm text-white flex flex-col justify-center items-center gap-8 p-4 text-center animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.7)'}}>
            Fullscreen Required
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl">
            For the best experience, this application must be in fullscreen mode.
          </p>
          <button
            onClick={requestFullscreen}
            className="px-8 py-4 bg-cyan-500 text-white font-bold rounded-lg text-2xl hover:bg-cyan-600 transition-transform transform hover:scale-105 shadow-lg flex items-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
            </svg>
            Enter Fullscreen
          </button>
        </div>
      )}
    </>
  );
};
