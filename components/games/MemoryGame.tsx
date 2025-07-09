import React, { useState, useEffect, useCallback } from 'react';

interface GameProps {
  isGameOver: boolean;
}

type GameState = 'WATCHING' | 'PLAYING' | 'IDLE' | 'FAILED';

const COLORS = ['bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500'];

export const MemoryGame: React.FC<GameProps> = ({ isGameOver }) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [level, setLevel] = useState(0);

  const nextLevel = useCallback(() => {
    if (isGameOver) return;
    setGameState('WATCHING');
    setPlayerSequence([]);
    const newSequence = [...sequence, Math.floor(Math.random() * 4)];
    setSequence(newSequence);
    setLevel(newSequence.length);
  }, [isGameOver, sequence]);

  useEffect(() => {
    if (gameState === 'WATCHING' && sequence.length > 0) {
      let i = 0;
      const interval = setInterval(() => {
        setActiveButton(sequence[i]);
        setTimeout(() => setActiveButton(null), 400);
        i++;
        if (i >= sequence.length) {
          clearInterval(interval);
          setGameState('PLAYING');
        }
      }, 700);
      return () => clearInterval(interval);
    }
  }, [gameState, sequence]);

  const handlePlayerInput = (colorIndex: number) => {
    if (gameState !== 'PLAYING' || isGameOver) return;

    const newPlayerSequence = [...playerSequence, colorIndex];
    setPlayerSequence(newPlayerSequence);
    
    // Check if the current move is correct
    if (newPlayerSequence[newPlayerSequence.length - 1] !== sequence[newPlayerSequence.length - 1]) {
      setGameState('FAILED');
      setTimeout(() => {
        setSequence([]);
        setPlayerSequence([]);
        setLevel(0);
        setGameState('IDLE');
      }, 1500);
      return;
    }

    // Check if the sequence is complete
    if (newPlayerSequence.length === sequence.length) {
      setTimeout(() => {
        nextLevel();
      }, 1000);
    }
  };

  const startGame = useCallback(() => {
    setSequence([]);
    setPlayerSequence([]);
    setLevel(0);
    setGameState('IDLE');
    setTimeout(() => nextLevel(), 500);
  }, [nextLevel]);
  
  useEffect(() => {
      if(!isGameOver) {
          startGame();
      }
  }, [isGameOver, startGame]);

  const getMessage = () => {
    switch (gameState) {
      case 'IDLE':
        return 'Press Start';
      case 'WATCHING':
        return 'Watch the sequence...';
      case 'PLAYING':
        return 'Your turn!';
      case 'FAILED':
        return 'Wrong Sequence! Resetting...';
      default:
        return '';
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold text-cyan-400">Memory Test</h2>
        <p className="text-slate-400 mt-2">Repeat the sequence of colors.</p>
        <p className="text-2xl font-semibold mt-4">Level: <span className="text-amber-400">{level}</span></p>
      </div>
      
      <div className="h-12 flex items-center justify-center">
        <p className="text-xl font-medium text-slate-300">{getMessage()}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 my-4">
        {COLORS.map((color, index) => (
          <button
            key={index}
            onClick={() => handlePlayerInput(index)}
            disabled={gameState !== 'PLAYING'}
            className={`w-32 h-32 sm:w-40 sm:h-40 rounded-lg transition-all duration-200 
            ${color} 
            ${activeButton === index ? 'opacity-100 scale-105 ring-4 ring-white' : 'opacity-50'}
            ${gameState === 'PLAYING' ? 'hover:opacity-100 cursor-pointer' : 'cursor-not-allowed'}`}
          />
        ))}
      </div>
       {gameState === 'IDLE' && level === 0 && (
         <button onClick={startGame} className="mt-4 px-6 py-3 bg-green-600 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors">
            Start Game
         </button>
       )}
    </div>
  );
};
