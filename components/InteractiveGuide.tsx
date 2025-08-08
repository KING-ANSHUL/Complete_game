

import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
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

  interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    abort: () => void;
    start: () => void;
    stop: () => void;
  }
}

type GuidePhase = 
  'IDLE' | 
  'ASKING_NAME' | 
  'CONFIRMING_NAME' | 
  'TYPING_NAME' | 
  'ASKING_CLASS' | 
  'CONFIRMING_CLASS' | 
  'TYPING_CLASS';

interface InteractiveGuideProps {
  step: number;
  onNext: () => void;
  onEnd: () => void;
  guideName: string | null;
  setGuideName: (name: string) => void;
  userClass: string | null;
  setUserClass: (c: string) => void;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface HighlightBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STEPS_CONFIG: { [key: number]: any } = {
  1: { text: (name: string) => `${name}! This is the Gaming Zone, where you can explore the games.`, bubblePosition: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', botPosition: 'top-1/2 left-[110px] -translate-y-[190px]', buttonText: 'Next', hasAction: false, selector: '[data-tutorial-id="game-area"]' },
  2: { text: () => "This is your playtime clock! Watch it to see how much time you have left.", bubblePosition: 'top-24 left-1/2 -translate-x-1/2', botPosition: 'top-24 left-1/2 -translate-x-[250px] -translate-y-8', buttonText: 'Got it!', hasAction: false, selector: '[data-tutorial-id="time-progress-bar"]' },
  3: { text: () => 'Great! Now, click on any game island to start playing.', bubblePosition: 'top-32 left-1/2 -translate-x-1/2', botPosition: 'top-32 left-1/2 -translate-x-[220px] -translate-y-10', hasAction: true, selector: '[data-tutorial-id="game-area"]' },
  4: { text: () => "See? The clock is ticking down as you play. But don't worry!", bubblePosition: 'top-24 left-1/2 -translate-x-1/2', botPosition: 'top-24 left-1/2 -translate-x-[250px] -translate-y-8', buttonText: 'Next', hasAction: false, selector: '[data-tutorial-id="time-progress-bar"]' },
  5: { text: () => 'To get more time, click here to visit the Playing Island!', bubblePosition: 'bottom-24 left-1/2 -translate-x-1/2', botPosition: 'bottom-24 left-1/2 translate-x-[150px] -translate-y-8', hasAction: true, selector: '[data-tutorial-id="playing-island-button"]' },
  6: { text: (name: string) => `Bye bye, see you soon, ${name}!`, bubblePosition: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', botPosition: 'top-1/2 left-1/2 -translate-x-[260px] -translate-y-[100px]', buttonText: 'Start Playing!', hasAction: false, selector: '[data-tutorial-id="island-area"]' },
};

const CLASS_OPTIONS = ['6th', '7th', '8th', '9th', '10th'];

const extractNameFromTranscript = async (transcript: string): Promise<string> => {
    if (!transcript) return "unknown";
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const systemInstruction = `You are an AI assistant designed to interact with children. Your only job is to extract a person's first name from a sentence. The child might speak in English, Hinglish, or a mix. 
Your response MUST be a single word: the extracted name, correctly capitalized. 
If no name is found, you MUST return the single word "unknown". 
Do not add any other words, sentences, or explanations.

**Examples:**
- User Input: "mera naam anshul h"
- Your Output: Anshul

- User Input: "i am anshika"
- Your Output: Anshika

- User Input: "my name is Rohan"
- Your Output: Rohan

- User Input: "call me ria"
- Your Output: Ria

- User Input: "the big brown fox is running"
- Your Output: unknown`;
        const prompt = `Utterance: "${transcript}"`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { systemInstruction } });
        const name = response.text.trim();
        return name.toLowerCase() === 'unknown' ? 'unknown' : name;
    } catch (e) {
        console.error("AI name extraction failed:", e);
        return "unknown";
    }
};

const extractClassFromTranscript = async (transcript: string): Promise<string> => {
    if (!transcript) return "unknown";
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const systemInstruction = `You are an AI assistant designed to interact with children. Your only job is to extract a student's class from a sentence. The child might speak in English or Hinglish.
Your response MUST be ONLY the class number in the format "Nth" (e.g., "6th", "7th"). 
The class must be one of: 6th, 7th, 8th, 9th, 10th. 
Do not add any other text or explanations. If you cannot find a valid class in that range, you MUST return the single word "unknown".

**Examples:**
- User Input: "mai 6th class mei hu"
- Your Output: 6th

- User Input: "i am in seventh grade"
- Your Output: 7th

- User Input: "class 9"
- Your Output: 9th

- User Input: "tenth"
- Your Output: 10th

- User Input: "I like dogs"
- Your Output: unknown`;
        const prompt = `Utterance: "${transcript}"`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { systemInstruction } });
        const extractedClass = response.text.trim();
        return CLASS_OPTIONS.includes(extractedClass) ? extractedClass : "unknown";
    } catch (e) {
        console.error("AI class extraction failed:", e);
        return "unknown";
    }
};

export const InteractiveGuide: React.FC<InteractiveGuideProps> = ({ step, onNext, onEnd, guideName, setGuideName, userClass, setUserClass }) => {
  const [highlightBox, setHighlightBox] = useState<HighlightBox | null>(null);
  
  const [guidePhase, setGuidePhase] = useState<GuidePhase>('IDLE');
  const [capturedValue, setCapturedValue] = useState('');
  const [typedValue, setTypedValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const speechRecognizer = useRef<SpeechRecognition | null>(null);
  const speechTimeout = useRef<number | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string, onEndCallback?: () => void) => {
    if (!window.speechSynthesis) {
      if (onEndCallback) setTimeout(onEndCallback, 1000);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
    utterance.onend = () => { if (onEndCallback) onEndCallback(); };
    utterance.onerror = utterance.onend;
    window.speechSynthesis.speak(utterance);
  }, [voices]);
  
  const processTranscript = useCallback(async (transcript: string) => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    speechRecognizer.current?.stop();
    
    setIsProcessing(true);
    try {
        const currentPhase = guideName === null ? 'ASKING_NAME' : 'ASKING_CLASS';
        
        if (currentPhase === 'ASKING_NAME') {
          const name = await extractNameFromTranscript(transcript);
          if (name !== 'unknown') {
            setCapturedValue(name);
            setGuidePhase('CONFIRMING_NAME');
          } else {
            setGuidePhase('TYPING_NAME');
          }
        } else { // ASKING_CLASS
          const extractedClass = await extractClassFromTranscript(transcript);
          if (extractedClass !== 'unknown') {
            setCapturedValue(extractedClass);
            setGuidePhase('CONFIRMING_CLASS');
          } else {
            setGuidePhase('TYPING_CLASS');
          }
        }
    } catch (e) {
        console.error("Error processing transcript with AI:", e);
        const currentPhase = guideName === null ? 'ASKING_NAME' : 'ASKING_CLASS';
        setGuidePhase(currentPhase === 'ASKING_NAME' ? 'TYPING_NAME' : 'TYPING_CLASS');
    } finally {
        setIsProcessing(false);
    }
  }, [guideName]);

  const startListening = useCallback(() => {
    if (!speechRecognizer.current || isListening) return;
    try {
      hasProcessed.current = false;
      speechRecognizer.current.start();
    } catch (e) {
      console.error("Speech recognition could not be started:", e);
      setIsListening(false);
    }
  }, [isListening]);
  
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
        setRecognitionError("Speech recognition is not supported by this browser.");
        return;
    }
    
    speechRecognizer.current = new SpeechRecognitionAPI();
    const recognizer = speechRecognizer.current;
    if (!recognizer) return;
    
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = 'en-IN';

    recognizer.onstart = () => setIsListening(true);
    recognizer.onend = () => setIsListening(false);
    recognizer.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setRecognitionError(`Mic error: ${event.error}. Please enable it.`);
      }
    };
    recognizer.onresult = (event: SpeechRecognitionEvent) => {
      if (hasProcessed.current) return;
      if (speechTimeout.current) clearTimeout(speechTimeout.current);

      let fullTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }

      speechTimeout.current = window.setTimeout(() => {
        if (fullTranscript.trim()) {
          processTranscript(fullTranscript.trim());
        }
      }, 800);
    };
    
    return () => {
        recognizer.abort();
        if(speechTimeout.current) clearTimeout(speechTimeout.current);
    };
  }, [processTranscript]);

  useEffect(() => {
    if (guideName === null && guidePhase === 'IDLE') {
        setGuidePhase('ASKING_NAME');
    }
    if (guideName !== null && userClass === null && ['IDLE', 'CONFIRMING_NAME'].includes(guidePhase)) {
        setGuidePhase('ASKING_CLASS');
    }
  }, [guideName, userClass, guidePhase]);
  
  useEffect(() => {
      switch(guidePhase) {
        case 'ASKING_NAME': speak("Hello! What is your name?"); break;
        case 'CONFIRMING_NAME': speak(`I heard ${capturedValue}. Is that correct?`); break;
        case 'TYPING_NAME': speak("My apologies. Please type your name."); setTypedValue(''); break;
        case 'ASKING_CLASS': speak(`Great, ${guideName}! What class are you in?`); break;
        case 'CONFIRMING_CLASS': speak(`I heard ${capturedValue}. Is that correct?`); break;
        case 'TYPING_CLASS': speak("My apologies. Please select your class."); setTypedValue('6th'); break;
        default: break;
      }
  }, [guidePhase, speak, capturedValue, guideName]);
  
  const handleConfirm = (isCorrect: boolean) => {
    const isName = guidePhase === 'CONFIRMING_NAME';
    if (isCorrect) {
      if(isName) {
        setGuideName(capturedValue);
      } else {
        setUserClass(capturedValue);
      }
    } else {
      setGuidePhase(isName ? 'TYPING_NAME' : 'TYPING_CLASS');
    }
  };

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedValue.trim()) {
      if (guidePhase === 'TYPING_NAME') {
        setGuideName(typedValue.trim());
      } else {
        setUserClass(typedValue.trim());
      }
    }
  };

  const config = STEPS_CONFIG[step];

  useIsomorphicLayoutEffect(() => {
    if (!guideName || !userClass || !config?.selector) {
      setHighlightBox(null);
      return;
    }
    
    const updateBox = () => {
        const element = document.querySelector<HTMLElement>(config.selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          setHighlightBox({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
        } else {
            setHighlightBox(null);
        }
    };
    
    const timerId = setTimeout(updateBox, 100);
    window.addEventListener('resize', updateBox);
    
    return () => {
      clearTimeout(timerId);
      window.removeEventListener('resize', updateBox);
    };
}, [step, config?.selector, guideName, userClass]);
  
  useEffect(() => {
    if (guideName && userClass && config) {
        speak(config.text(guideName));
    }
  }, [step, guideName, userClass, config, speak]);


  const guideBotVideo = <video src="/bird.webm" autoPlay loop muted playsInline className="w-28 h-32 drop-shadow-lg object-contain animate-float" />;

  const renderGuideContent = () => {
      const microphoneButton = (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-sm text-slate-400">Click the mic to answer</p>
            <div className="w-16 h-16 flex items-center justify-center">
              {isProcessing ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              ) : (
                <button 
                  onClick={startListening} 
                  disabled={isListening}
                  className={`p-4 bg-cyan-500 rounded-full transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${isListening ? 'animate-pulse scale-110' : ''}`}
                  aria-label="Start listening"
                >
                  <MicrophoneIcon />
                </button>
              )}
            </div>
          </div>
      );

      switch (guidePhase) {
          case 'ASKING_NAME':
            return <> <p className="text-lg text-slate-200 text-center">Hello! What is your name?</p> {microphoneButton} </>;
          case 'CONFIRMING_NAME':
          case 'CONFIRMING_CLASS':
            return (
              <>
                <p className="text-lg text-slate-200 text-center">I heard <strong className="text-cyan-400">"{capturedValue}"</strong>. Is that correct?</p>
                <div className="flex gap-4 mt-4">
                  <button onClick={() => handleConfirm(true)} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Yes</button>
                  <button onClick={() => handleConfirm(false)} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">No</button>
                </div>
              </>
            );
          case 'TYPING_NAME':
            return (
              <>
                <p className="text-lg text-slate-200 text-center">My apologies. Please type your name.</p>
                <form onSubmit={handleTypedSubmit} className="flex flex-col items-center gap-3 w-full mt-2">
                  <input type="text" value={typedValue} onChange={(e) => setTypedValue(e.target.value)} className="w-full px-3 py-2 rounded-md bg-slate-700 text-white border border-slate-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                  <button type="submit" className="px-6 py-2 bg-cyan-500 text-white font-bold rounded-lg hover:bg-cyan-600">Confirm</button>
                </form>
              </>
            );
          case 'ASKING_CLASS':
            return <> <p className="text-lg text-slate-200 text-center">{`Great, ${guideName}! What class are you in?`}</p> {microphoneButton} </>;
          case 'TYPING_CLASS':
            return (
              <>
                <p className="text-lg text-slate-200 text-center">My apologies. Please select your class.</p>
                <form onSubmit={handleTypedSubmit} className="flex flex-col items-center gap-3 w-full mt-2">
                  <select value={typedValue} onChange={(e) => setTypedValue(e.target.value)} className="w-full px-3 py-2 rounded-md bg-slate-700 text-white border border-slate-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button type="submit" className="px-6 py-2 bg-cyan-500 text-white font-bold rounded-lg hover:bg-cyan-600">Confirm</button>
                </form>
              </>
            );
          default:
            return null;
        }
  };

  if (!guideName || !userClass) {
     return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex justify-center items-center animate-fade-in pointer-events-auto">
            <div className="flex items-center gap-4">
                {guideBotVideo}
                <div className="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-cyan-500 shadow-2xl shadow-cyan-500/20 flex flex-col items-center gap-4 min-h-[210px] justify-center">
                    {guidePhase === 'IDLE' ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div> : renderGuideContent()}
                    {recognitionError && <p className="text-xs text-red-400 mt-2 text-center">{recognitionError}</p>}
                </div>
            </div>
        </div>
     );
  }

  if (!config) return null;
  
  const handleButtonClick = () => {
    if (step === 6) onEnd();
    else onNext();
  }

  const padding = 8;
  const radius = 16;

  return (
    <div className="fixed inset-0 z-50 animate-fade-in pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
            <defs>
                <mask id="guide-mask">
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    {highlightBox && <rect x={highlightBox.x - padding} y={highlightBox.y - padding} width={highlightBox.width + padding * 2} height={highlightBox.height + padding * 2} rx={radius} fill="black" />}
                </mask>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="rgba(15, 23, 42, 0.8)" mask="url(#guide-mask)" />
        </svg>

        {highlightBox && (
            <div className="absolute border-4 border-cyan-400 border-dashed rounded-2xl shadow-[0_0_30px_10px] shadow-cyan-500/50 transition-all duration-300 pointer-events-none" style={{ left: `${highlightBox.x - padding}px`, top: `${highlightBox.y - padding}px`, width: `${highlightBox.width + padding * 2}px`, height: `${highlightBox.height + padding * 2}px` }} />
        )}
      
      <div className={`absolute flex items-center gap-4 transition-all duration-500 ${config.bubblePosition}`}>
        <div className={`absolute transition-all duration-500 ${config.botPosition}`}>{guideBotVideo}</div>
        <div className="bg-slate-800 p-6 rounded-2xl max-w-xs w-full border border-cyan-500 shadow-2xl shadow-cyan-500/20 pointer-events-auto flex flex-col items-center gap-4">
          <p className="text-lg text-slate-200 text-center">{config.text(guideName)}</p>
          {!config.hasAction && ( <button onClick={handleButtonClick} className="px-6 py-2 bg-cyan-500 text-white font-bold rounded-lg text-lg hover:bg-cyan-600 transition-transform transform hover:scale-105">{config.buttonText}</button>)}
        </div>
      </div>
    </div>
  );
};
