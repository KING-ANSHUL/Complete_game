import React, { useState } from 'react';
import { GameType } from '../types';
import { TimeProgressBar } from './TimeProgressBar';

interface GameMapProps {
  onSelectGame: (game: GameType) => void;
  remainingTime: number;
  maxTime: number;
}

interface IslandButtonProps {
    game: GameType;
    icon: string;
    position: { top: string; left: string };
    onSelect: (game: GameType) => void;
}

const IslandButton: React.FC<IslandButtonProps> = ({ game, icon, position, onSelect }) => (
    <button
        onClick={() => onSelect(game)}
        className="absolute flex items-center justify-center rounded-full transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 hover:scale-110"
        style={{ top: position.top, left: position.left }}
        aria-label={`Start ${game} game`}
    >
        <img src={icon} alt={`${game} icon`} className="w-32 h-32 object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.4)]" />
    </button>
);

export const GameMap: React.FC<GameMapProps> = ({ onSelectGame, remainingTime, maxTime }) => {
  const [comingSoonMessage, setComingSoonMessage] = useState<string | null>(null);
  
  const islands = [
    {
      game: GameType.Reaction,
      icon: '/icons/reaction-game.png',
      position: { top: '25%', left: '20%' },
    },
    {
      game: GameType.ColorMatch,
      icon: '/icons/colormatch-game.png',
      position: { top: '50%', left: '35%' },
    },
    {
      game: GameType.Memory,
      icon: '/icons/memory-game.png',
      position: { top: '75%', left: '20%' },
    },
    {
      game: GameType.Tetris,
      icon: '/icons/tetris-game.png',
      position: { top: '30%', left: '80%' },
    },
    {
      game: GameType.FlappyBird,
      icon: '/icons/flappybird-game.png',
      position: { top: '65%', left: '75%' },
    },
  ];

  const handleSelect = (game: GameType) => {
    if (game === GameType.Tetris) {
      setComingSoonMessage(`${game} is coming soon!`);
      setTimeout(() => {
        setComingSoonMessage(null);
      }, 2500);
    } else {
      onSelectGame(game);
    }
  };


  return (
    <div
      className="w-full h-full relative animate-fade-in"
    >
        <img src="/game-map-bg.png" alt="Game Map" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />

        <div data-tutorial-id="time-progress-bar" className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-20">
            <TimeProgressBar currentTime={remainingTime} maxTime={maxTime} />
        </div>

        <div className="relative w-full h-full">
            {comingSoonMessage && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-lg font-bold px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in">
                    {comingSoonMessage}
                </div>
            )}
            <h2 className="text-center text-3xl sm:text-4xl font-bold text-white pt-24" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.7)'}}>Select the game you want to play</h2>
            {islands.map(island => (
                <IslandButton
                    key={island.game}
                    {...island}
                    onSelect={handleSelect}
                />
            ))}
        </div>
    </div>
  );
};