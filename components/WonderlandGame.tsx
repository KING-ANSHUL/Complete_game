


import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';
import { WONDERLAND_TOPICS, WONDERLAND_SUBTOPICS } from '../constants';
import { SoundIcon } from './icons/SoundIcon';
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

type Step = 'TOPIC_SELECTION' | 'LOADING' | 'READING' | 'FEEDBACK';
type Mistake = { said: string; expected: string };

interface WonderlandGameProps {
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


export const WonderlandGame: React.FC<WonderlandGameProps> = ({ onBack }) => {
  const [step, setStep] = useState<Step>('TOPIC_SELECTION');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [matchedWordCount, setMatchedWordCount] = useState(0);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const speechTimeout = useRef<number | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) setVoices(availableVoices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const speechRecognizer = useMemo(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setRecognitionError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
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

  const handleTopicSelect = async (topic: string) => {
    const subtopics = WONDERLAND_SUBTOPICS[topic];
    if (!subtopics || subtopics.length === 0) {
      setError(`No specific topics found for ${topic}.`);
      setStep('TOPIC_SELECTION');
      return;
    }
    const randomSubtopic = subtopics[Math.floor(Math.random() * subtopics.length)];

    setSelectedTopic(randomSubtopic);
    setStep('LOADING');
    setIsLoading(true);
    setError(null);
    setMistakes([]);
    setGeneratedText('');
    setGeneratedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const textPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a very short, simple paragraph (2-3 sentences) for a 5-year-old about ${randomSubtopic}. Use simple words and sentence structure. The text should be easy to read aloud.`,
      });
      
      const imagePromise = ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: `A simple, colorful, and child-friendly illustration of: ${randomSubtopic}. The style should be like a cartoon or a children's book drawing, very cute and simple.`,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
      });

      const [textResponse, imageResponse] = await Promise.all([textPromise, imagePromise]);

      setGeneratedText(textResponse.text);
      
      if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
        const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        setGeneratedImage(imageUrl);
      }
      
      setStep('READING');
    } catch (e) {
      console.error(e);
      setError(`Sorry, something went wrong while generating content for "${randomSubtopic}". Please try again.`);
      setStep('TOPIC_SELECTION');
    } finally {
      setIsLoading(false);
    }
  };
  
  const processFinalTranscript = useCallback(async (transcript: string) => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    if (speechRecognizer) {
        try { speechRecognizer.stop(); } catch(e){}
    }
    
    setIsLoading(true);
    const newMistakes = await analyzeReadingWithAI(transcript, generatedText);
    setMistakes(newMistakes);
    setIsLoading(false);
    setStep('FEEDBACK');
  }, [generatedText, speechRecognizer]);

  const startRecognition = useCallback(() => {
    if (!speechRecognizer || isRecognitionActive) return;
    try {
      hasProcessed.current = false;
      setMatchedWordCount(0);
      speechRecognizer.start();
    } catch (e: any) {
      if (e.name !== 'InvalidStateError') {
        setRecognitionError("Failed to start microphone.");
        console.error(e);
      }
    }
  }, [speechRecognizer, isRecognitionActive]);

  useEffect(() => {
    if (!speechRecognizer) return;

    const handleResult = (event: SpeechRecognitionEvent) => {
        if (hasProcessed.current) return;
        if (speechTimeout.current) clearTimeout(speechTimeout.current);

        let fullTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            fullTranscript += event.results[i][0].transcript;
        }
        
        const spokenWordsForHighlight = fullTranscript.split(' ').map(cleanWord).filter(Boolean);
        setMatchedWordCount(spokenWordsForHighlight.length);
        
        speechTimeout.current = window.setTimeout(() => {
            if (fullTranscript.trim()) {
                processFinalTranscript(fullTranscript.trim());
            }
        }, 800); // Process after 800ms of silence
    };

    const handleError = (event: SpeechRecognitionErrorEvent) => {
        if (speechTimeout.current) clearTimeout(speechTimeout.current);
        const errorType = event.error;
        if (!['no-speech', 'aborted'].includes(errorType)) {
            setRecognitionError(`Mic error: ${errorType}`);
        }
        setIsRecognitionActive(false);
    };

    const handleStart = () => {
        setIsRecognitionActive(true);
        hasProcessed.current = false;
    };

    const handleEnd = () => setIsRecognitionActive(false);

    speechRecognizer.addEventListener('result', handleResult);
    speechRecognizer.addEventListener('error', handleError);
    speechRecognizer.addEventListener('start', handleStart);
    speechRecognizer.addEventListener('end', handleEnd);

    return () => {
        speechRecognizer.removeEventListener('result', handleResult);
        speechRecognizer.removeEventListener('error', handleError);
        speechRecognizer.removeEventListener('start', handleStart);
        speechRecognizer.removeEventListener('end', handleEnd);
        if (speechTimeout.current) clearTimeout(speechTimeout.current);
    };
  }, [speechRecognizer, processFinalTranscript]);

  useEffect(() => () => {
      speechRecognizer?.abort()
      if (speechTimeout.current) clearTimeout(speechTimeout.current);
    }, [speechRecognizer]);


  const pronounceWord = (text: string) => {
    if (!window.speechSynthesis || voices.length === 0) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
    window.speechSynthesis.speak(utterance);
  };
  
  const renderContent = () => {
    switch(step) {
      case 'TOPIC_SELECTION':
        return (
            <div className="p-8">
                <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400 text-center mb-8" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.7)'}}>Choose a Topic to Read About</h1>
                {error && <p className="text-center text-red-400 mb-4">{error}</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {WONDERLAND_TOPICS.map(({name, icon: Icon}) => (
                        <button key={name} onClick={() => handleTopicSelect(name)} className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-800/70 rounded-2xl border border-slate-600 hover:bg-cyan-500/50 hover:border-cyan-400 transition-all transform hover:scale-105">
                            <Icon />
                            <span className="font-bold text-white text-center">{name}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
      case 'LOADING':
        return <div className="text-center text-slate-300 animate-pulse text-2xl">{isLoading ? "Generating your reading adventure..." : "Analyzing your reading..."}</div>;
      case 'READING':
        return (
          <div className="flex flex-col items-center justify-center h-full p-4 gap-4 relative z-10">
            {recognitionError && <p className="text-center text-red-400 mb-4">{recognitionError}</p>}
            
            {generatedImage ? (
              <img src={generatedImage} alt={selectedTopic || 'AI generated image'} className="w-full max-w-sm h-64 object-cover rounded-lg shadow-2xl mb-4" />
            ) : (
              <div className="w-full max-w-sm h-64 bg-slate-700 border-2 border-dashed border-slate-500 flex items-center justify-center text-slate-400 p-4 text-center rounded-lg shadow-2xl mb-4">
                  <p>No image was generated for: {selectedTopic}</p>
              </div>
            )}

            <p className="text-xl md:text-2xl font-medium leading-relaxed text-center bg-slate-900/50 p-4 rounded-lg max-w-3xl">
              {generatedText.split(' ').map((word, index) => (
                <span key={index} className={`transition-colors duration-200 ${index < matchedWordCount ? 'text-green-400 font-bold' : 'text-slate-200'}`}>{word} </span>
              ))}
            </p>
            <button onClick={startRecognition} disabled={isRecognitionActive} className="flex items-center gap-3 text-lg mt-4 px-6 py-3 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed">
              <MicrophoneIcon/>
              <span className={isRecognitionActive ? 'animate-pulse' : ''}>
                {isRecognitionActive ? 'Listening...' : 'Click to Read Aloud'}
              </span>
            </button>
          </div>
        );
      case 'FEEDBACK':
        return (
            <div className="text-center flex flex-col items-center justify-center h-full p-4">
                <h2 className="text-4xl font-bold text-green-400 mb-2">{mistakes.length === 0 ? 'Perfect!' : 'Great Effort!'}</h2>
                <p className="text-lg text-slate-300 mb-6">{mistakes.length === 0 ? "You read everything perfectly!" : "Here are some words to practice."}</p>
                {mistakes.length > 0 && (
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
                )}
                <button onClick={() => onBack(true)} className="mt-8 px-8 py-4 bg-green-600 text-white font-bold rounded-lg text-2xl hover:bg-green-700 transition-transform transform hover:scale-105">Finish</button>
            </div>
        );
    }
  };

  return (
    <div 
        className="w-full h-full text-white relative flex flex-col justify-center animate-fade-in p-4 bg-indigo-900"
    >
      <div className="flex-grow flex flex-col justify-center overflow-auto">
        {renderContent()}
      </div>
       {step !== 'TOPIC_SELECTION' && (
             <button onClick={() => setStep('TOPIC_SELECTION')} className="absolute top-6 left-6 text-slate-300 hover:text-white transition-colors z-20 font-bold flex items-center gap-2">
                <span className="text-2xl">&larr;</span> Back to Topics
            </button>
        )}
    </div>
  );
};