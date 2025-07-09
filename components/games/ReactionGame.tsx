import React, { useState, useEffect, useCallback } from 'react';

interface GameProps {
  isGameOver: boolean;
}

export const ReactionGame: React.FC<GameProps> = ({ isGameOver }) => {
  const [targetVisible, setTargetVisible] = useState(false);
  const [position, setPosition] = useState({ top: '50%', left: '50%' });
  const [startTime, setStartTime] = useState(0);
  const [lastReactionTime, setLastReactionTime] = useState<number | null>(null);

  const showTarget = useCallback(() => {
    if (isGameOver) return;
    
    const top = `${Math.random() * 80 + 10}%`;
    const left = `${Math.random() * 80 + 10}%`;
    
    setPosition({ top, left });
    setTargetVisible(true);
    setStartTime(Date.now());
  }, [isGameOver]);

  useEffect(() => {
    if (!isGameOver) {
      const timeout = setTimeout(showTarget, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isGameOver, showTarget]);

  const handleTargetClick = () => {
    if (!targetVisible) return;
    
    const reactionTime = Date.now() - startTime;
    setLastReactionTime(reactionTime);
    setTargetVisible(false);

    setTimeout(showTarget, Math.random() * 2000 + 500);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-cyan-400">Reaction Test</h2>
        <p className="text-slate-400 mt-2">Click the target as fast as you can when it appears!</p>
      </div>

      <div className="w-full h-3/4 bg-slate-900/50 rounded-lg relative overflow-hidden">
        {targetVisible && (
          <button
            onClick={handleTargetClick}
            className="absolute w-20 h-20 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-red-500/50 animate-pulse"
            style={{ top: position.top, left: position.left }}
          />
        )}
        {!targetVisible && lastReactionTime !== null && (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-2xl font-semibold">Last Reaction: <span className="text-amber-400">{lastReactionTime}ms</span></p>
            </div>
        )}
         {!targetVisible && lastReactionTime === null && (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-2xl font-semibold text-slate-400 animate-pulse">Get ready...</p>
            </div>
        )}
      </div>
    </div>
  );
};
