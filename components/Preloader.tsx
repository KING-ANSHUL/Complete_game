import React, { useEffect, useState } from 'react';

const assetsToPreload = [
  // Videos
  '/playing-island-bg.mp4',
  '/pirate-island-bg.mp4',
  '/bird.webm',
  '/bird.mp4',
  
  // Main Images
  '/game-map-bg.png',
  '/complete-background.png',
  
  // Game Icons
  '/icons/reaction-game.png',
  '/icons/colormatch-game.png',
  '/icons/memory-game.png',
  '/icons/tetris-game.png',
  '/icons/flappybird-game.png',
  
  // Island Icons
  '/icons/vocab-vault.png',
  '/icons/talkers-cave.png',
  '/icons/grammar-groot.png',
  '/icons/reading-arena.png',
  '/icons/wonderland.png',
  
  // Scene Images
  '/scene-doctor-patient.png',
  '/scene-shopkeeper-customer.png',
  '/scene-waiter-customer.png',
  
  // Character Images
  '/character-doctor.png',
  '/character-patient.png',
  '/character-shopkeeper.png',
  '/character-customer.png',
  '/character-waiter.png',
];

const preloadAsset = (src: string) => {
  return new Promise((resolve, reject) => {
    if (src.endsWith('.mp4') || src.endsWith('.webm')) {
      const video = document.createElement('video');
      video.src = src;
      video.oncanplaythrough = resolve;
      video.onerror = reject;
      video.load();
    } else {
      const img = new Image();
      img.src = src;
      img.onload = resolve;
      img.onerror = reject;
    }
  });
};

interface PreloaderProps {
  onLoaded: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ onLoaded }) => {
    const [loadingMessage, setLoadingMessage] = useState('Loading Adventure...');

    useEffect(() => {
        const preloadAll = async () => {
          const promises = assetsToPreload.map(preloadAsset);
          
          try {
              await Promise.all(promises);
              setLoadingMessage('Assets Loaded. Starting...');
              setTimeout(onLoaded, 500);
          } catch (error) {
              console.warn("An asset failed to preload, continuing anyway:", error);
              setLoadingMessage('Starting...');
              setTimeout(onLoaded, 500); // Continue even if one asset fails
          }
        };

        // Fallback timeout to ensure the app loads even if preloading takes too long
        const timeoutId = setTimeout(() => {
            console.warn("Preloading timed out. Continuing...");
            onLoaded();
        }, 15000); // 15 second timeout

        preloadAll();

        return () => clearTimeout(timeoutId);
    }, [onLoaded]);

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900 text-white flex flex-col justify-center items-center gap-8 p-4 text-center animate-fade-in">
            <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400 animate-pulse" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.7)'}}>
                {loadingMessage}
            </h1>
            <div className="w-64 h-4 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full animate-progress-bar"></div>
            </div>
            <style>
                {`
                    @keyframes progress-bar {
                        0% { width: 0%; }
                        100% { width: 100%; }
                    }
                    .animate-progress-bar {
                        animation: progress-bar 15s linear forwards;
                    }
                `}
            </style>
        </div>
    );
};
