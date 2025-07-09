import React from 'react';

interface TimeUpScreenProps {
  onSwitch: () => void;
}

export const TimeUpScreen: React.FC<TimeUpScreenProps> = ({ onSwitch }) => {
  return (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-center items-center z-10 animate-fade-in text-center">
      <h2 className="text-5xl sm:text-6xl font-bold text-red-500 mb-4">Time's Up!</h2>
      <p className="text-xl sm:text-3xl font-semibold mb-8">To refill the progress bar,<br/>let's go to Playing Island!</p>
      <button
        onClick={onSwitch}
        className="px-6 sm:px-8 py-3 sm:py-4 bg-cyan-500 text-white font-bold rounded-lg text-lg sm:text-2xl hover:bg-cyan-600 transition-transform transform hover:scale-105"
      >
        Switch to Playing Island
      </button>
    </div>
  );
};
