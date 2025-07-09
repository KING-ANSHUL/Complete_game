

import React, { useState } from 'react';

interface GlobalNavBotProps {
    onGoToIsland: () => void;
    onGoToMap: () => void;
    onLogout: () => void;
}

export const GlobalNavBot: React.FC<GlobalNavBotProps> = ({ onGoToIsland, onGoToMap, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuClick = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="fixed top-6 right-2 z-[60] w-20 h-20 rounded-full hover:scale-110 transition-transform duration-300 flex items-center justify-center"
                aria-label="Open Navigation Menu"
            >
                <video src="/bird.webm" autoPlay loop muted playsInline className="w-16 h-16 object-contain drop-shadow-lg" />
            </button>

            {isMenuOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm animate-fade-in" onClick={() => setIsMenuOpen(false)}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-28 right-4 bg-slate-800 border-2 border-cyan-500 rounded-2xl shadow-2xl p-4 w-64 flex flex-col gap-3 animate-fade-in"
                    >
                        <h3 className="text-lg font-bold text-center text-cyan-400 mb-2">Navigation</h3>
                        <button
                            onClick={() => handleMenuClick(onGoToIsland)}
                            className="w-full text-left px-4 py-3 bg-slate-700/80 rounded-lg font-semibold text-lg hover:bg-indigo-600 transition-colors"
                        >
                            🏝️ Go to Playing Island
                        </button>
                        <button
                            onClick={() => handleMenuClick(onGoToMap)}
                            className="w-full text-left px-4 py-3 bg-slate-700/80 rounded-lg font-semibold text-lg hover:bg-indigo-600 transition-colors"
                        >
                            🎮 Go to Gaming Zone
                        </button>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="w-full text-left px-4 py-3 bg-slate-700/80 rounded-lg font-semibold text-lg hover:bg-slate-600 transition-colors"
                        >
                            Resume
                        </button>
                        <div className="border-t border-slate-600 my-2"></div>
                        <button
                            onClick={() => handleMenuClick(onLogout)}
                            className="w-full text-left px-4 py-3 bg-red-800/80 rounded-lg font-semibold text-lg hover:bg-red-700 transition-colors"
                        >
                            🚪 Log Out
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};