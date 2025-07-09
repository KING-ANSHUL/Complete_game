import React from 'react';

interface TimeProgressBarProps {
  currentTime: number;
  maxTime: number;
}

export const TimeProgressBar: React.FC<TimeProgressBarProps> = ({ currentTime, maxTime }) => {
  const percentage = maxTime > 0 ? (currentTime / maxTime) * 100 : 0;

  const getBarColor = () => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full bg-slate-700 rounded-full h-6 overflow-hidden border-2 border-slate-600">
      <div
        className={`h-full rounded-full ${getBarColor()} transition-all duration-300 ease-linear flex items-center justify-end pr-2`}
        style={{ width: `${percentage}%` }}
      >
        <span className="font-bold text-white text-sm">
          {Math.ceil(currentTime)}s
        </span>
      </div>
    </div>
  );
};
