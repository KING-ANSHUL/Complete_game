



import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';
import { TALKERS_CAVE_SCENES, TALKERS_CAVE_SCENE_IMAGES, TALKERS_CAVE_CHARACTER_IMAGES } from '../constants';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { SoundIcon } from './icons/SoundIcon';

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

type Step = 'SCENE' | 'CHARACTER' | 'LOADING_SCRIPT' | 'GAME' | 'FEEDBACK' | 'COMPLETE';
type Scene = keyof typeof TALKERS_CAVE_SCENES;
type ScriptLine = { character: string; line: string };
type Mistake = { said: string; expected: string };

interface TalkersCaveGameProps {
  onBack: (completed: boolean) => void;
}

const analyzeReadingWithAI = async (spokenText: string, targetText: string): Promise<Mistake[]> => {
    if (!spokenText.trim()) return targetText.split(' ').map(word => ({ said: '', expected: word }));

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const systemInstruction = `You are an expert English pronunciation analyst for children. Your task is to compare a 'target text' with a 'spoken text' from a speech-to-text service and identify mistakes. Be forgiving of minor speech-to-text errors that don't change the word's meaning.

**Rules:**
- Identify mispronounced words, omitted (skipped) words, and inserted (extra) words.
- For omitted words, the "said" property in the JSON object should be an empty string ("").
- For inserted words, the "expected" property should be an empty string ("").
- If there are no mistakes, return an empty array.
- Your response MUST be a single, valid JSON array of objects.
- Each object must have two properties: "said" (string) and "expected" (string).
- Do not use markdown code fences.`;

        const prompt = `Target Text: "${targetText}"\nSpoken Text: "${spokenText}"`;

        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    said: { type: Type.STRING },
                    expected: { type: Type.STRING },
                },
                required: ['said', 'expected'],
            },
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
            },
        });

        const result = JSON.parse(response.text);
        if (Array.isArray(result)) {
            return result as Mistake[];
        }
        return [];
    } catch (e) {
        console.error("AI analysis failed:", e);
        return []; 
    }
};


export const TalkersCaveGame: React.FC<TalkersCaveGameProps> = ({ onBack }) => {
  const [step, setStep] = useState<Step>('SCENE');
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [centeredScene, setCenteredScene] = useState<Scene | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [matchedWordCount, setMatchedWordCount] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sceneElementsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const speechTimeout = useRef<number | null>(null);
  const hasProcessedTurn = useRef(false);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) setVoices(availableVoices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    if (step !== 'SCENE' || !scrollContainerRef.current) return;
    const scenes = Object.keys(TALKERS_CAVE_SCENES) as Scene[];
    if (scenes.length > 0 && !centeredScene) {
      setCenteredScene(scenes[0]);
    }
    const options = { root: scrollContainerRef.current, rootMargin: '0px', threshold: 0.8 };
    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sceneName = entry.target.getAttribute('data-scene-name') as Scene;
          setCenteredScene(sceneName);
        }
      });
    };
    observerRef.current = new IntersectionObserver(handleIntersect, options);
    Object.values(sceneElementsRef.current).forEach(el => {
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, [step, centeredScene]);

  const speechRecognizer = useMemo(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;
    const recognizer = new SpeechRecognitionAPI();
    recognizer.continuous = true;
    recognizer.lang = 'en-IN';
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    return recognizer;
  }, []);
  
  useEffect(() => {
    if (!speechRecognizer) {
      setRecognitionError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
    }
  }, [speechRecognizer]);

  const cleanWord = (word: string) => word.trim().toLowerCase().replace(/[.,?!]/g, '');

  const processUserTurn = useCallback(async (transcript: string) => {
    if (hasProcessedTurn.current) return;
    hasProcessedTurn.current = true;
    
    if (speechRecognizer) {
        try { speechRecognizer.stop(); } catch(e){}
    }
    
    setIsAnalyzing(true);
    const targetLine = script[currentTurn].line;
    const currentMistakes = await analyzeReadingWithAI(transcript, targetLine);
    setIsAnalyzing(false);

    if (currentMistakes.length > 0) {
        setMistakes(prev => [...prev, ...currentMistakes]);
    }
    
    if (currentTurn < script.length - 1) {
      setCurrentTurn(prev => prev + 1);
    } else {
      setStep(mistakes.length + currentMistakes.length > 0 ? 'FEEDBACK' : 'COMPLETE');
    }
  }, [script, currentTurn, mistakes, speechRecognizer]);

  useEffect(() => {
    if (!speechRecognizer || step !== 'GAME') return;

    const handleResult = (event: SpeechRecognitionEvent) => {
      if (hasProcessedTurn.current) return;

      if (speechTimeout.current) clearTimeout(speechTimeout.current);

      let fullTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }
      const spokenWordsForHighlight = fullTranscript.split(' ').map(cleanWord).filter(w => w);
      setMatchedWordCount(spokenWordsForHighlight.length);

      speechTimeout.current = window.setTimeout(() => {
        if (fullTranscript.trim()) {
          processUserTurn(fullTranscript.trim());
        }
      }, 800);
    };

    const handleError = (event: SpeechRecognitionErrorEvent) => {
      if (speechTimeout.current) clearTimeout(speechTimeout.current);
      const errorType = event.error;
      if (['aborted', 'no-speech'].includes(errorType)) { setIsRecognitionActive(false); return; }
      if (errorType === 'not-allowed' || errorType === 'service-not-allowed') { setRecognitionError('Microphone access denied.'); } 
      else { setRecognitionError(`Mic error: "${errorType}".`); }
      setIsRecognitionActive(false);
    };
    
    const handleStart = () => setIsRecognitionActive(true);
    const handleEnd = () => setIsRecognitionActive(false);

    speechRecognizer.addEventListener('result', handleResult);
    speechRecognizer.addEventListener('start', handleStart);
    speechRecognizer.addEventListener('end', handleEnd);
    speechRecognizer.addEventListener('error', handleError);
    return () => {
      speechRecognizer.removeEventListener('result', handleResult);
      speechRecognizer.removeEventListener('start', handleStart);
      speechRecognizer.removeEventListener('end', handleEnd);
      speechRecognizer.removeEventListener('error', handleError);
      if (speechTimeout.current) clearTimeout(speechTimeout.current);
    };
  }, [speechRecognizer, step, processUserTurn]);
  
  const speak = useCallback((text: string, onEndCallback: () => void) => {
    if (!window.speechSynthesis || voices.length === 0) {
      setTimeout(onEndCallback, text.length * 50);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => { setIsAiSpeaking(false); onEndCallback(); };
    utterance.onerror = () => { setIsAiSpeaking(false); onEndCallback(); };
    window.speechSynthesis.speak(utterance);
  }, [voices]);


  const generateScript = useCallback(async (scene: Scene, character: string) => {
    setError(null);
    setStep('LOADING_SCRIPT');
    const aiCharacter = TALKERS_CAVE_SCENES[scene].find(c => c !== character);
    const systemInstruction = `You are a script writing API. Your only purpose is to generate a conversation script for a game designed for young children learning English (ages 4-7).
**REQUIREMENTS**
- Use simple vocabulary and short sentences. Avoid complex words, idioms, or slang.
- The conversation should be natural, easy to follow, and exactly 8 turns long.
- The theme should be fun and engaging for kids.
**RESPONSE FORMAT**
- Your entire response MUST be a single, valid JSON array.
- Do NOT include markdown code fences.
- The array must contain exactly 8 objects.
- The AI character must speak first.
- Each object must have two string properties: "character" and "line".
**EXAMPLE**
[{"character": "Doctor","line": "Hello, how are you?"},{"character": "Patient","line": "I have a tummy ache."},{"character": "Doctor","line": "Oh no. Let me help."},{"character": "Patient","line": "Yes, please."},{"character": "Doctor","line": "What did you eat today?"},{"character": "Patient","line": "I ate a big chocolate cake."},{"character": "Doctor","line": "I see. Too much cake can hurt."},{"character": "Patient","line": "Okay, thank you doctor."}]`;
    const prompt = `Generate a simple, 8-line script for kids for the scene "${scene}" with the user playing as "${character}" and the AI playing as "${aiCharacter}".`;
    
    const scriptSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            character: { type: Type.STRING },
            line: { type: Type.STRING },
          },
          required: ['character', 'line'],
        },
    };

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            systemInstruction, 
            responseMimeType: "application/json",
            responseSchema: scriptSchema,
        }
      });
      let jsonStr = response.text.trim();
      const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
      const fenceMatch = jsonStr.match(fenceRegex);
      if (fenceMatch && fenceMatch[1]) {
        jsonStr = fenceMatch[1].trim();
      } else {
        const firstBracket = jsonStr.indexOf('[');
        const lastBracket = jsonStr.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket > firstBracket) {
          jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
        }
      }
      const parsedScript = JSON.parse(jsonStr);
      if (Array.isArray(parsedScript) && parsedScript.every(item => 'character' in item && 'line' in item)) {
        setScript(parsedScript); setStep('GAME'); setCurrentTurn(0);
      } else { throw new Error('Received invalid script format from API.'); }
    } catch (e) {
      console.error(e); setError('Sorry, I couldn\'t create a script. Please try again.'); setStep('CHARACTER');
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!speechRecognizer || isRecognitionActive) return;
    try {
        hasProcessedTurn.current = false;
        setMatchedWordCount(0);
        speechRecognizer.start();
    } catch(e: any) {
        if (e.name === 'InvalidStateError') {
            console.warn("Speech recognition has already started.");
        } else {
            console.error("Could not start recognition:", e);
            setRecognitionError("Failed to start microphone.");
        }
    }
  }, [speechRecognizer, isRecognitionActive]);

  useEffect(() => {
    if (step !== 'GAME' || !script.length || currentTurn >= script.length || recognitionError || isAiSpeaking) return;
    
    const currentLine = script[currentTurn];
    const isUserTurn = currentLine.character === selectedCharacter;
    
    if (isUserTurn) {
        hasProcessedTurn.current = false;
        setMatchedWordCount(0);
    } else {
        if (speechRecognizer) try { speechRecognizer.stop(); } catch (e) {}
        const handleAiTurnEnd = () => {
            if (currentTurn < script.length - 1) {
                setCurrentTurn(prev => prev + 1);
            } else {
                setStep(mistakes.length > 0 ? 'FEEDBACK' : 'COMPLETE');
            }
        };
        const timeoutId = setTimeout(() => speak(currentLine.line, handleAiTurnEnd), 700);
        return () => clearTimeout(timeoutId);
    }
  }, [step, script, currentTurn, selectedCharacter, speak, speechRecognizer, recognitionError, isAiSpeaking, mistakes]);

  useEffect(() => () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (speechRecognizer) { speechRecognizer.abort(); }
    if (speechTimeout.current) clearTimeout(speechTimeout.current);
  }, [speechRecognizer]);

  const handleSceneSelect = (scene: Scene) => { setSelectedScene(scene); setStep('CHARACTER'); };
  const handleCharacterSelect = (character: string) => { 
    setMistakes([]); 
    setSelectedCharacter(character); 
    generateScript(selectedScene!, character); 
  };
  const handleBackToScenes = () => { setStep('SCENE'); setSelectedCharacter(null); setSelectedScene(null); setCenteredScene(null); };

  const pronounceWord = (text: string) => {
    if (!window.speechSynthesis || voices.length === 0) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
    window.speechSynthesis.speak(utterance);
  };

  const renderTitle = () => {
    switch (step) {
      case 'SCENE': return 'Select Scene';
      case 'CHARACTER': return 'Select Character';
      case 'LOADING_SCRIPT': return 'Creating Your Story...';
      case 'GAME': return selectedScene;
      case 'COMPLETE': return 'Great Job!';
      case 'FEEDBACK': return 'Let\'s Practice!';
      default: return '';
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'SCENE': {
        const scenes = Object.keys(TALKERS_CAVE_SCENES) as Scene[];
        return (
          <div className="flex-grow flex flex-col justify-center items-center w-full h-full overflow-hidden">
            <div ref={scrollContainerRef} className="flex w-full h-full items-center gap-8 md:gap-12 px-[37.5%] overflow-x-auto snap-x snap-mandatory no-scrollbar" style={{ scrollbarWidth: 'none' }}>
              {scenes.map((scene) => {
                const isCentered = centeredScene === scene;
                return (
                  <button key={scene} ref={(el) => { sceneElementsRef.current[scene] = el; }} data-scene-name={scene} onClick={() => handleSceneSelect(scene)}
                    className={`relative w-1/4 max-w-[350px] min-w-[250px] md:min-w-[300px] flex-shrink-0 snap-center flex flex-col rounded-2xl shadow-xl hover:shadow-cyan-400/30 transition-all duration-500 ease-in-out transform ${isCentered ? 'scale-100 opacity-100' : 'scale-75 opacity-60'} hover:!scale-105 hover:!opacity-100`}>
                    <div className="aspect-[4/3] w-full rounded-t-lg overflow-hidden bg-slate-700">
                      <img src={TALKERS_CAVE_SCENE_IMAGES[scene]} alt={scene} className="w-full h-full object-cover" />
                    </div>
                    <div className="relative p-3 bg-[#6d4c41] rounded-b-lg border-t-4 border-[#4e342e]">
                      <div className="absolute -top-4 left-0 w-full h-5 bg-green-600 rounded-t-lg z-10">
                        <div className="absolute top-1/2 left-0 w-full h-3 bg-green-700 opacity-50"></div>
                      </div>
                      <h3 className="text-white font-bold text-sm md:text-base text-center truncate px-1 z-20 relative" style={{ textShadow: '1px 1px 3px #000' }}> {scene} </h3>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
      case 'CHARACTER':
        if (!selectedScene) return null;
        return <div className="flex flex-col items-center justify-center h-full">
            {error && <p className="text-center text-red-400 mb-4">{error}</p>}
            <div className="flex justify-center items-end gap-8">
              {TALKERS_CAVE_SCENES[selectedScene].map((character) => (
                  <button key={character} onClick={() => handleCharacterSelect(character)} className="flex flex-col items-center gap-4 transition-transform transform hover:scale-105 group">
                    <div className="w-48 h-96">
                       <img src={TALKERS_CAVE_CHARACTER_IMAGES[character]} alt={character} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xl font-bold px-4 py-2 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 transition-colors">{character}</span>
                  </button>
                )
              )}
            </div>
            <button onClick={handleBackToScenes} className="mt-8 text-slate-400 hover:text-white transition-colors">&larr; Back to Scenes</button>
        </div>;

      case 'LOADING_SCRIPT': return <div className="text-center text-slate-300 animate-pulse text-2xl">Please wait...</div>;

      case 'GAME': {
        if (!script.length || !selectedCharacter) return null;
        const aiCharacterName = TALKERS_CAVE_SCENES[selectedScene!].find(c => c !== selectedCharacter)!;
        const currentLine = script[currentTurn];
        const isUserTurn = currentLine.character === selectedCharacter;
        return <div 
            className='w-full h-full relative overflow-hidden flex flex-col'
          >
            <div className="flex-grow relative flex items-end justify-center p-4">
              <div className="absolute bottom-0 left-[5%] md:left-[10%] w-2/5 md:w-1/4 h-3/5 md:h-2/3">
                <img src={TALKERS_CAVE_CHARACTER_IMAGES[aiCharacterName]} alt={aiCharacterName} className="w-full h-full object-contain" />
              </div>
              <div className="absolute bottom-0 right-[5%] md:right-[10%] w-2/5 md:w-1/4 h-3/5 md:h-2/3">
                <img src={TALKERS_CAVE_CHARACTER_IMAGES[selectedCharacter]} alt={selectedCharacter} className="w-full h-full object-contain" />
              </div>
              <div className={`absolute top-1/4 w-3/5 md:w-2/5 transition-all duration-300 ${isUserTurn ? 'left-auto right-[15%] md:right-[20%]' : 'left-[15%] md:left-[20%] right-auto'}`}>
                  <div className={`relative bg-white text-slate-900 p-4 rounded-2xl shadow-2xl ${isUserTurn ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                      {isUserTurn ? (
                           <p className="text-lg font-medium leading-relaxed">
                              {currentLine.line.split(' ').map((word, wordIndex) => (
                                  <span key={wordIndex} className={`transition-colors duration-200 ${wordIndex < matchedWordCount ? 'text-green-600 font-bold' : 'text-slate-800'}`}>{word}{' '}</span>
                              ))}
                          </p>
                      ) : <p className="text-lg font-medium">{currentLine.line}</p>}
                      <div className={`absolute bottom-0 h-0 w-0 border-solid border-transparent border-t-white ${isUserTurn ? 'right-4 border-r-[15px] border-l-0 border-t-[15px] -mb-[15px]' : 'left-4 border-l-[15px] border-r-0 border-t-[15px] -mb-[15px]'}`}></div>
                  </div>
              </div>
            </div>
            <div className="h-16 flex-shrink-0 bg-slate-900/50 flex items-center justify-center text-slate-300 relative">
               {recognitionError ? <p className="text-red-400 font-semibold">{recognitionError}</p> : (isUserTurn ? (
                  isAnalyzing ? (
                    <p className="text-lg animate-pulse text-cyan-400">Analyzing your speech...</p>
                  ) : (
                    <button onClick={startRecognition} disabled={isRecognitionActive} className="flex items-center gap-3 text-lg px-6 py-2 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed">
                        <MicrophoneIcon />
                        <span className={isRecognitionActive ? 'animate-pulse' : ''}>
                          {isRecognitionActive ? 'Listening...' : 'Click to Speak'}
                        </span>
                    </button>
                  )
               ) : <p className="text-lg animate-pulse">{isAiSpeaking ? 'AI is speaking...' : 'AI is thinking...'}</p>)}
            </div>
        </div>;
      }
      case 'FEEDBACK': 
        return (
            <div className="text-center flex flex-col items-center justify-center h-full p-4">
                <p className="text-lg text-slate-300 mb-6">Here are some words to practice.</p>
                <div className="w-full max-w-md bg-slate-800 rounded-lg p-4 space-y-3">
                    {mistakes.map((mistake, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-700 p-3 rounded-md">
                            <div>
                                <p className="text-sm text-slate-400">You said: <span className="font-bold text-red-400">{mistake.said || '(skipped)'}</span></p>
                                <p className="text-lg">Correct is: <span className="font-bold text-green-400">{mistake.expected || '(extra word)'}</span></p>
                            </div>
                            <button onClick={() => pronounceWord(mistake.expected)} className="p-2 rounded-full bg-cyan-600 hover:bg-cyan-500 transition-colors" aria-label={`Listen to ${mistake.expected}`}>
                                <SoundIcon />
                            </button>
                        </div>
                    ))}
                </div>
                <button onClick={() => onBack(true)} className="mt-8 px-8 py-4 bg-green-600 text-white font-bold rounded-lg text-2xl hover:bg-green-700 transition-transform transform hover:scale-105">Finish</button>
            </div>
        );
      case 'COMPLETE': return <div className="text-center flex flex-col items-center justify-center h-full">
            <p className="text-4xl text-green-400 mb-2">Perfect!</p>
            <p className="text-xl text-slate-300 mb-8">You said everything correctly. Great job!</p>
            <button onClick={() => onBack(true)} className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg text-2xl hover:bg-green-700 transition-transform transform hover:scale-105">Finish</button>
        </div>;
      default: return null;
    }
  };

  return (
    <div className="w-full h-full bg-cyan-900 text-white relative flex flex-col justify-center animate-fade-in">
        {step !== 'GAME' && <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full px-4 text-center z-20">
             <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.7)'}}>{renderTitle()}</h1>
        </div>}
        {step === 'CHARACTER' && (
             <button onClick={handleBackToScenes} className="absolute top-6 left-6 text-slate-300 hover:text-white transition-colors z-20 font-bold flex items-center gap-2">
                <span className="text-2xl">&larr;</span> Back
            </button>
        )}
        <div className="flex-grow flex flex-col justify-center overflow-hidden">
            {renderContent()}
        </div>
    </div>
  );
};