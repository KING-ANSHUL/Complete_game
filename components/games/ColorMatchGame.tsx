import React, { useState, useEffect, useCallback } from 'react';
import { COLOR_MATCH_OPTIONS } from '../../constants';

interface GameProps {
  isGameOver: boolean;
}

export const ColorMatchGame: React.FC<GameProps> = ({ isGameOver }) => {
  const [correctColorName, setCorrectColorName] = useState('');
  const [displayColorHex, setDisplayColorHex] = useState('');
  const [shuffledOptions, setShuffledOptions] = useState(COLOR_MATCH_OPTIONS);
  const [feedback, setFeedback] = useState('');

  const generateNewRound = useCallback(() => {
    const newCorrectOption = COLOR_MATCH_OPTIONS[Math.floor(Math.random() * COLOR_MATCH_OPTIONS.length)];
    let newDisplayOption;
    do {
      newDisplayOption = COLOR_MATCH_OPTIONS[Math.floor(Math.random() * COLOR_MATCH_OPTIONS.length)];
    } while (newDisplayOption.name === newCorrectOption.name); // Ensure text color is different from word

    setCorrectColorName(newCorrectOption.name);
    setDisplayColorHex(newDisplayOption.hex);
    
    // Shuffle options for rendering buttons
    setShuffledOptions([...COLOR_MATCH_OPTIONS].sort(() => Math.random() - 0.5));
  }, []);

  useEffect(() => {
    if (!isGameOver) {
      generateNewRound();
    }
  }, [isGameOver, generateNewRound]);

  const handleChoice = (chosenColorName: string) => {
    if (isGameOver) return;

    if (chosenColorName === correctColorName) {
      setFeedback('Correct!');
    } else {
      setFeedback('Wrong!');
    }
    
    setTimeout(() => {
        setFeedback('');
        generateNewRound();
    }, 700);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-cyan-400">Color Match</h2>
        <p className="text-slate-400 mt-2">Click the button that matches the word, not its color!</p>
      </div>

      <div className="h-24 flex items-center justify-center">
         {feedback ? (
            <p className={`text-4xl font-bold ${feedback === 'Correct!' ? 'text-green-500' : 'text-red-500'}`}>{feedback}</p>
         ) : (
            <p className="text-6xl font-extrabold" style={{ color: displayColorHex }}>
                {correctColorName}
            </p>
         )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-8 w-full max-w-3xl">
        {shuffledOptions.map((option) => (
          <button
            key={option.name}
            onClick={() => handleChoice(option.name)}
            disabled={!!feedback}
            className="p-6 rounded-lg font-bold text-xl text-white transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: option.hex }}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
};
