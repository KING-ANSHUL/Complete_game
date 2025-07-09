import React from 'react';

interface GameOverProps {
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ onRestart }) => {
  return (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-center items-center z-10 animate-fade-in">
      <h2 className="text-6xl font-bold text-red-500 mb-8">Game Over</h2>
      <button
        onClick={onRestart}
        className="px-8 py-4 bg-cyan-500 text-white font-bold rounded-lg text-2xl hover:bg-cyan-600 transition-transform transform hover:scale-105"
      >
        Play Again
      </button>
    </div>
  );
};

export default GameOver;