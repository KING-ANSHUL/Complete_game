import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }
}

type Step = 'LEVEL_SELECTION' | 'LOADING' | 'INSTRUCTIONS' | 'GAME';
type FeedbackState = 'CORRECT' | 'INCORRECT_RETRY' | 'INCORRECT_FINAL';
type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Random';

interface VocabVaultGameProps {
  onBack: (completed: boolean) => void;
  addTime: (seconds: number) => void;
}

export const VocabVaultGame: React.FC<VocabVaultGameProps> = ({ onBack, addTime }) => {
  const [step, setStep] = useState<Step>('LEVEL_SELECTION');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const hasProcessed = useRef(false);
  
  const speechRecognizer = useMemo(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setRecognitionError('Speech recognition is not supported in your browser.');
      return null;
    }
    const recognizer = new SpeechRecognitionAPI();
    recognizer.continuous = true;
    recognizer.lang = 'en-IN';
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    return recognizer;
  }, []);

  const cleanWord = (word: string) => word.trim().toLowerCase().replace(/[.,?!]/g, '');

  const generateWords = useCallback(async (level: Difficulty) => {
    setIsLoading(true);
    setError(null);
    setStep('LOADING');
    const systemInstruction = "You are a vocabulary API. Your only purpose is to generate a JSON array of 10 unique English words for a child learning English. Do NOT include markdown code fences or any other text, just the JSON array. Ensure the list is different and truly random each time this prompt is called.";
    const prompt = `Generate 10 new, unique, and random vocabulary words for a 5-year-old at a '${level}' difficulty level. The words should be common and easy to pronounce.`;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: { systemInstruction, responseMimeType: "application/json" }
      });
      let jsonStr = response.text.trim();
      const fenceMatch = jsonStr.match(/^```(\w*)?\s*\n?(.*?)\n?\s*```$/s);
      if (fenceMatch && fenceMatch[2]) jsonStr = fenceMatch[2].trim();
      let parsedWords = JSON.parse(jsonStr);
      if (Array.isArray(parsedWords) && parsedWords.every(item => typeof item === 'string')) {
        parsedWords.sort(() => Math.random() - 0.5);
        setWords(parsedWords);
        setCurrentWordIndex(0);
        setFeedback(null);
        setAttemptCount(0);
        setStep('INSTRUCTIONS');
      } else { throw new Error('Received invalid word list format.'); }
    } catch (e) {
      console.error(e);
      setError('Sorry, I couldn\'t generate words. Please try again.');
      setStep('LEVEL_SELECTION');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLevelSelect = (level: Difficulty) => {
    setDifficulty(level);
    generateWords(level);
  };
  
  const handleSuccess = useCallback(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    speechRecognizer?.stop();
    addTime(30);
    setFeedback('CORRECT');
  }, [addTime, speechRecognizer]);
  
  const handleFailure = useCallback(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    speechRecognizer?.stop();
    if (attemptCount === 0) {
      setAttemptCount(1);
      setFeedback('INCORRECT_RETRY');
    } else {
      setFeedback('INCORRECT_FINAL');
    }
  }, [attemptCount, speechRecognizer]);

  const startRecognition = useCallback(() => {
    if (step !== 'GAME' || feedback || !speechRecognizer || isRecognitionActive) return;
    hasProcessed.current = false;
    try {
        setIsRecognitionActive(true);
        setRecognitionError(null);
        speechRecognizer.start();
    } catch (e: any) {
        if (e.name !== 'InvalidStateError') {
            setRecognitionError("Mic could not be started.");
            setIsRecognitionActive(false);
        }
    }
  }, [step, feedback, speechRecognizer, isRecognitionActive]);

  useEffect(() => {
    if (!speechRecognizer || words.length === 0) return;

    const handleResult = (event: SpeechRecognitionEvent) => {
        if (hasProcessed.current) return;

        const transcript = event.results[event.results.length - 1][0].transcript;
        const targetWord = cleanWord(words[currentWordIndex]);

        if (cleanWord(transcript).includes(targetWord)) {
            handleSuccess();
        }
    };
    
    const handleError = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setRecognitionError(`Mic error: ${event.error}`);
        }
    };
    
    const handleEnd = () => {
        setIsRecognitionActive(false);
        if (!hasProcessed.current) {
            handleFailure();
        }
    };

    speechRecognizer.onstart = () => setIsRecognitionActive(true);
    speechRecognizer.addEventListener('result', handleResult);
    speechRecognizer.addEventListener('error', handleError);
    speechRecognizer.addEventListener('end', handleEnd);

    return () => {
      speechRecognizer.onstart = null;
      speechRecognizer.removeEventListener('result', handleResult);
      speechRecognizer.removeEventListener('error', handleError);
      speechRecognizer.removeEventListener('end', handleEnd);
    };
  }, [speechRecognizer, words, currentWordIndex, handleSuccess, handleFailure]);

  const moveToNextWord = useCallback(() => {
    setFeedback(null);
    setAttemptCount(0);
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(prevIndex => prevIndex + 1);
    } else {
      setStep('LEVEL_SELECTION');
      setWords([]);
      setCurrentWordIndex(0);
    }
  }, [currentWordIndex, words.length]);

  const changeLevel = useCallback(() => {
    setStep('LEVEL_SELECTION');
    setWords([]);
    setCurrentWordIndex(0);
    setFeedback(null);
    setAttemptCount(0);
  }, []);

  const handleTryAgain = useCallback(() => {
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (step === 'INSTRUCTIONS') {
      const timer = setTimeout(() => {
        setStep('GAME');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);
  
  const renderFeedbackContent = () => {
      switch(feedback) {
          case 'CORRECT':
              return (
                  <div className="text-center animate-fade-in">
                      <p className="text-3xl font-bold text-green-400 mb-4">Correct!</p>
                      <div className="flex gap-4">
                        <button onClick={moveToNextWord} className="px-6 py-3 bg-cyan-600 rounded-lg font-bold text-lg hover:bg-cyan-700 transition-colors">Next Word</button>
                        <button onClick={changeLevel} className="px-6 py-3 bg-indigo-600 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors">Change Level</button>
                      </div>
                  </div>
              );
          case 'INCORRECT_RETRY':
              return (
                <div className="text-center animate-fade-in">
                    <p className="text-3xl font-bold text-yellow-400 mb-4">Not quite, give it another shot!</p>
                    <div className="flex flex-wrap justify-center gap-4">
                      <button onClick={handleTryAgain} className="px-6 py-3 bg-yellow-600 rounded-lg font-bold text-lg hover:bg-yellow-700 transition-colors">Try Again</button>
                      <button onClick={moveToNextWord} className="px-6 py-3 bg-cyan-600 rounded-lg font-bold text-lg hover:bg-cyan-700 transition-colors">Next Word</button>
                      <button onClick={changeLevel} className="px-6 py-3 bg-indigo-600 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors">Change Level</button>
                    </div>
                </div>
              );
          case 'INCORRECT_FINAL':
              return (
                <div className="text-center animate-fade-in">
                    <p className="text-3xl font-bold text-red-500 mb-4">Oops! The word was "{words[currentWordIndex]}"</p>
                    <div className="flex gap-4">
                      <button onClick={moveToNextWord} className="px-6 py-3 bg-cyan-600 rounded-lg font-bold text-lg hover:bg-cyan-700 transition-colors">Next Word</button>
                      <button onClick={changeLevel} className="px-6 py-3 bg-indigo-600 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors">Change Level</button>
                    </div>
                </div>
              );
          default:
              return (
                 <div className="flex flex-col items-center justify-center animate-fade-in text-center h-full">
                    <button onClick={startRecognition} disabled={isRecognitionActive} className="flex items-center gap-3 text-2xl px-6 py-4 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed">
                      <MicrophoneIcon />
                      <span className={isRecognitionActive ? 'animate-pulse' : ''}>
                        {isRecognitionActive ? 'Listening...' : 'Click to Speak'}
                      </span>
                    </button>
                 </div>
              );
      }
  }

  const renderContent = () => {
    switch(step) {
      case 'LEVEL_SELECTION':
        return (
          <div className="p-8 text-center">
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">Select a Difficulty</h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <div className="flex flex-wrap justify-center gap-4">
              {(['Easy', 'Medium', 'Hard', 'Random'] as Difficulty[]).map(level => (
                <button key={level} onClick={() => handleLevelSelect(level)} className="px-8 py-4 bg-slate-800 rounded-lg font-bold text-2xl hover:bg-cyan-700 transition-colors transform hover:scale-105">
                  {level}
                </button>
              ))}
            </div>
          </div>
        );
      case 'LOADING':
        return <div className="text-center text-slate-300 animate-pulse text-2xl">Brewing some words...</div>;
      case 'INSTRUCTIONS':
        return (
            <div className="p-8 text-center animate-fade-in">
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">Get Ready!</h2>
            <p className="text-xl">Words will appear one by one. Read each one aloud as you see it.</p>
            </div>
        );
      case 'GAME':
        return (
            <div className="flex flex-col items-center justify-center gap-12 h-full">
                <p className="text-7xl font-extrabold" style={{textShadow: '3px 3px 10px rgba(0,0,0,0.5)'}}>
                    {words.length > 0 ? words[currentWordIndex] : ''}
                </p>
                <div className="h-24">
                    {renderFeedbackContent()}
                </div>
                {recognitionError && <p className="text-red-500 mt-4">{recognitionError}</p>}
            </div>
        );
    }
  };

  return (
    <div className="w-full h-full bg-purple-900 text-white relative flex flex-col justify-center animate-fade-in p-4">
      <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400 text-center absolute top-6 left-1/2 -translate-x-1/2" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.7)'}}>Vocab Vault</h1>
      <button onClick={() => onBack(false)} className="absolute top-6 left-6 text-slate-300 hover:text-white transition-colors z-20 font-bold flex items-center gap-2">
        <span className="text-2xl">&larr;</span> Back
      </button>
      <div className="flex-grow flex flex-col justify-center">
        {renderContent()}
      </div>
    </div>
  );
};