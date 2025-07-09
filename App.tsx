


import React, { useState, useEffect, useCallback } from 'react';
import { GameType } from './types';
import { TOTAL_GAME_TIME } from './constants';
import { TimeProgressBar } from './components/TimeProgressBar';
import { ReactionGame } from './components/games/ReactionGame';
import { ColorMatchGame } from './components/games/ColorMatchGame';
import { MemoryGame } from './components/games/MemoryGame';
import { FlappyBirdGame } from './components/games/FlappyBirdGame';
import { TimeUpScreen } from './components/TimeUpScreen';
import PlayingIsland from './components/PlayingIsland';
import { GameMap } from './components/GameMap';
import { InteractiveGuide } from './components/InteractiveGuide';
import { GlobalNavBot } from './components/GlobalNavBot';
import { TimeAddedNotification } from './components/TimeAddedNotification';
import { Preloader } from './components/Preloader';

type View = 'GAUNTLET' | 'ISLAND';
type GauntletView = 'MAP' | 'GAME';

export const App: React.FC = () => {
  const [activeGame, setActiveGame] = useState<GameType>(GameType.Reaction);
  const [remainingTime, setRemainingTime] = useState(300);
  const [isGameOver, setIsGameOver] = useState(false);
  const [view, setView] = useState<View>('GAUNTLET');
  const [gauntletView, setGauntletView] = useState<GauntletView>('MAP');
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [guideName, setGuideName] = useState<string | null>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [isGuideVisible, setIsGuideVisible] = useState(true);
  const [showTimeAdded, setShowTimeAdded] = useState(false);
  const [timeAddedAmount, setTimeAddedAmount] = useState(0);
  const [islandKey, setIslandKey] = useState(0);
  const [isPreloading, setIsPreloading] = useState(true);

  const isFullscreenView = (view === 'GAUNTLET' && gauntletView === 'MAP') || view === 'ISLAND';
  const showTopProgressBar = view === 'GAUNTLET' && gauntletView === 'GAME' && !isGameOver;

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('ggg-tutorial-complete');
    if (!hasSeenTutorial) {
      setTutorialStep(1);
    }
  }, []);

  useEffect(() => {
    // Timer runs when a game is active. Paused on map, island, game over, or during most of the tutorial.
    // It is allowed to run during tutorial steps 3 & 4 to demonstrate the timer ticking down.
    if (isGameOver || view === 'ISLAND' || gauntletView !== 'GAME' || (tutorialStep !== null && tutorialStep !== 3 && tutorialStep !== 4)) {
      return;
    }

    const timerId = setInterval(() => {
      setRemainingTime(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [isGameOver, view, gauntletView, tutorialStep]);

  useEffect(() => {
    if (remainingTime <= 0) {
      setIsGameOver(true);
      setRemainingTime(0);
    }
  }, [remainingTime]);

  const addTime = useCallback((seconds: number) => {
    setRemainingTime(prev => Math.min(TOTAL_GAME_TIME, prev + seconds));
    setIsGameOver(false);
    setTimeAddedAmount(seconds);
    setShowTimeAdded(true);
    setTimeout(() => {
        setShowTimeAdded(false);
    }, 3000); // shows for 3 seconds
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('ggg-tutorial-complete');
    Object.keys(localStorage)
      .filter(key => key.startsWith('reading-progress-') || key.startsWith('grammar-groot-progress-'))
      .forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Could not remove item ${key} from localStorage`, e);
        }
      });
    window.location.reload();
  }, []);

  const handleNextTutorialStep = useCallback(() => {
    if (tutorialStep === 4) {
        setGauntletView('MAP');
        setTimeout(() => setTutorialStep(5), 500); // give time for view to change
    } else if (tutorialStep) {
        setTutorialStep(prev => prev ? prev + 1 : 1);
    }
  }, [tutorialStep]);

  const handleEndTutorial = useCallback(() => {
      setTutorialStep(null);
      localStorage.setItem('ggg-tutorial-complete', 'true');
  }, []);


  const handleSwitchToIsland = useCallback(() => {
    setView('ISLAND');
    setIslandKey(k => k + 1); // This remounts PlayingIsland and resets its internal state
    if (tutorialStep === 5) {
      setTimeout(() => setTutorialStep(6), 100);
    }
  }, [tutorialStep]);

  const handleBackToGauntlet = useCallback(() => {
    setView('GAUNTLET');
    setGauntletView('MAP');
  }, []);

  const handleSelectGame = useCallback((game: GameType) => {
    setActiveGame(game);
    setGauntletView('GAME');
    if (tutorialStep === 3) {
      setIsGuideVisible(false); // Hide guide to let user play
      setTimeout(() => {
        setTutorialStep(4);
        setIsGuideVisible(true); // Show guide for next step
      }, 10000); // 10 seconds of gameplay
    }
  }, [tutorialStep]);

  const handleBackToMap = useCallback(() => {
    setGauntletView('MAP');
  }, []);

  const renderActiveGame = () => {
    const gameProps = { isGameOver };
    switch (activeGame) {
      case GameType.Reaction:
        return <ReactionGame {...gameProps} />;
      case GameType.ColorMatch:
        return <ColorMatchGame {...gameProps} />;
      case GameType.Memory:
        return <MemoryGame {...gameProps} />;
      case GameType.FlappyBird:
        return <FlappyBirdGame {...gameProps} />;
      default:
        return null;
    }
  };

  if (isPreloading) {
    return <Preloader onLoaded={() => setIsPreloading(false)} />;
  }

  return (
    <main className={`h-screen w-screen bg-slate-900 text-white font-sans flex flex-col select-none ${!isFullscreenView ? 'p-4 sm:p-6 lg:p-8 gap-4' : ''}`}>
      {tutorialStep !== null && isGuideVisible && 
        <InteractiveGuide 
          step={tutorialStep} 
          onNext={handleNextTutorialStep} 
          onEnd={handleEndTutorial}
          guideName={guideName}
          setGuideName={setGuideName}
          userClass={userClass}
          setUserClass={setUserClass}
        />}
      
      {tutorialStep === null && <GlobalNavBot onGoToIsland={handleSwitchToIsland} onGoToMap={handleBackToGauntlet} onLogout={handleLogout} />}

      {showTimeAdded && <TimeAddedNotification amount={timeAddedAmount} />}
      
      {showTopProgressBar && (
        <div data-tutorial-id="time-progress-bar">
          <TimeProgressBar currentTime={remainingTime} maxTime={TOTAL_GAME_TIME} />
        </div>
      )}

      <div data-tutorial-id="game-area" className={`relative bg-slate-800 ${isFullscreenView ? 'h-full w-full' : 'flex-1 rounded-xl overflow-hidden'}`}>
        {view === 'GAUNTLET' ? (
          <>
            {isGameOver ? (
              <TimeUpScreen onSwitch={handleSwitchToIsland} />
            ) : (
              <>
                {gauntletView === 'MAP' && <GameMap onSelectGame={handleSelectGame} remainingTime={remainingTime} maxTime={TOTAL_GAME_TIME} />}
                {gauntletView === 'GAME' && (
                  <div className="w-full h-full relative">
                    <div className="w-full h-full">
                      {renderActiveGame()}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
           <PlayingIsland key={islandKey} addTime={addTime} remainingTime={remainingTime} maxTime={TOTAL_GAME_TIME} userName={guideName} userClass={userClass} />
        )}
      </div>

      {view === 'GAUNTLET' && !isGameOver && (tutorialStep === null || tutorialStep >= 5) && (
        <button
          onClick={handleSwitchToIsland}
          data-tutorial-id="playing-island-button"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-6 py-3 bg-indigo-600 text-white font-bold rounded-full text-base sm:text-lg hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
          aria-label="Switch to Playing Island"
        >
          <span>🏝️</span>
          <span>Go to Playing Island</span>
        </button>
      )}
    </main>
  );
};
