import React, { useState } from 'react';
import { TalkersCaveGame } from './TalkersCaveGame';
import { WonderlandGame } from './WonderlandGame';
import { VocabVaultGame } from './VocabVaultGame';
import { ReadingArenaGame } from './ReadingArenaGame';
import { GrammarGrootGame } from './GrammarGrootGame';
import { TimeProgressBar } from './TimeProgressBar';

interface IslandButtonProps {
    name: string;
    icon: string;
    position: { top: string; left: string };
    onClick: (name: string) => void;
    animationDelay: string;
}

const IslandButton: React.FC<IslandButtonProps> = ({ name, icon, position, onClick, animationDelay }) => (
    <button
        onClick={() => onClick(name)}
        className="absolute flex items-center justify-center rounded-full transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 hover:scale-110"
        style={{ top: position.top, left: position.left }}
        aria-label={`Visit ${name}`}
    >
        <img 
            src={icon} 
            alt={`${name} icon`} 
            className="w-48 h-48 object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.4)] animate-float"
            style={{ animationDelay }}
        />
    </button>
);

interface PlayingIslandProps {
    addTime: (seconds: number) => void;
    remainingTime: number;
    maxTime: number;
    userName: string | null;
    userClass: string | null;
}


const PlayingIsland: React.FC<PlayingIslandProps> = ({ addTime, remainingTime, maxTime, userName, userClass }) => {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [comingSoonMessage, setComingSoonMessage] = useState<string | null>(null);
  
  const islands = [
    { name: 'Vocab Vault', icon: '/icons/vocab-vault.png', position: { top: '25%', left: '20%' } },
    { name: "Talker's Cave", icon: '/icons/talkers-cave.png', position: { top: '50%', left: '35%' } },
    { name: 'Grammar Groot', icon: '/icons/grammar-groot.png', position: { top: '75%', left: '20%' } },
    { name: 'Reading Arena', icon: '/icons/reading-arena.png', position: { top: '30%', left: '80%' } },
    { name: 'Wonderland', icon: '/icons/wonderland.png', position: { top: '65%', left: '75%' } },
  ];

  const handleIslandClick = (name: string) => {
    if (["Talker's Cave", "Wonderland", "Vocab Vault", "Reading Arena", "Grammar Groot"].includes(name)) {
      setActiveGame(name);
    } else {
      setComingSoonMessage(`${name} is coming soon!`);
      setTimeout(() => {
        setComingSoonMessage(null);
      }, 2500);
    }
  };

  const handleBackFromGame = (completed: boolean) => {
    if (completed) {
      addTime(30);
    }
    setActiveGame(null);
  }

  if (activeGame === "Talker's Cave") {
    return <TalkersCaveGame onBack={handleBackFromGame} />
  }

  if (activeGame === "Wonderland") {
    return <WonderlandGame onBack={handleBackFromGame} />;
  }
  
  if (activeGame === "Vocab Vault") {
    return <VocabVaultGame onBack={handleBackFromGame} addTime={addTime} />;
  }
  
  if (activeGame === "Reading Arena") {
    return <ReadingArenaGame onBack={() => setActiveGame(null)} userName={userName} userClass={userClass} addTime={addTime} remainingTime={remainingTime} maxTime={maxTime} />;
  }

  if (activeGame === "Grammar Groot") {
    return <GrammarGrootGame onBack={() => setActiveGame(null)} addTime={addTime} userClass={userClass} remainingTime={remainingTime} maxTime={maxTime} />
  }

  return (
    <div 
        data-tutorial-id="island-area"
        className="w-full h-full relative animate-fade-in overflow-hidden"
    >
        <video 
            src="/playing-island-bg.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover" 
        />
      
        <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-white">
            {comingSoonMessage && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-lg font-bold px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in">
                    {comingSoonMessage}
                </div>
            )}
            <div className="text-center absolute top-24 left-1/2 -translate-x-1/2 w-full px-4">
                <h1 
                    className="text-4xl sm:text-5xl font-bold text-cyan-400" 
                    style={{textShadow: '2px 2px 8px rgba(0,0,0,0.7)'}}
                >
                    Welcome to Playing Island!
                </h1>
                 <div className="mt-4 max-w-lg mx-auto">
                    <TimeProgressBar currentTime={remainingTime} maxTime={maxTime} />
                </div>
            </div>

            <div className="w-full h-full relative">
                {islands.map((island, index) => (
                    <IslandButton 
                        key={island.name}
                        {...island}
                        onClick={handleIslandClick}
                        animationDelay={`${index * 300}ms`}
                    />
                ))}
            </div>
        </div>
    </div>
  );
};

export default PlayingIsland;
