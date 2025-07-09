
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { GRAMMAR_GROOT_TOPICS } from '../constants';
import { SoundIcon } from './icons/SoundIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { TimeProgressBar } from './TimeProgressBar';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface GrammarGrootGameProps {
  onBack: () => void;
  addTime: (seconds: number) => void;
  userClass: string | null;
  remainingTime: number;
  maxTime: number;
}

type Step = 'TOPIC_SELECTION' | 'MODE_SELECTION' | 'LOADING' | 'LEARN' | 'PRACTICE' | 'FEEDBACK' | 'PRACTICE_COMPLETE';
type Mistake = { said: string; expected: string; };
interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
}

const levenshteinDistance = (a: string, b: string): number => {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) return bn;
    if (bn === 0) return an;
    const matrix = Array(bn + 1).fill(null).map(() => Array(an + 1).fill(null));
    for (let i = 0; i <= an; i += 1) { matrix[0][i] = i; }
    for (let j = 0; j <= bn; j += 1) { matrix[j][0] = j; }
    for (let j = 1; j <= bn; j += 1) {
      for (let i = 1; i <= an; i += 1) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    return matrix[bn][an];
};

const calculateMistakes = (spoken: string[], target: string[]): Mistake[] => {
    if (spoken.length === 0 || target.length === 0) return [];
    const isMatch = (s1: string, s2: string) => {
        if (!s1 || !s2) return false;
        const threshold = s2.length > 5 ? 2 : 1;
        return levenshteinDistance(s1, s2) <= threshold;
    };
    const dp = Array(spoken.length + 1).fill(null).map(() => Array(target.length + 1).fill(0));
    for (let i = 1; i <= spoken.length; i++) {
        for (let j = 1; j <= target.length; j++) {
            if (isMatch(spoken[i - 1], target[j - 1])) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    const mistakes: Mistake[] = [];
    let i = spoken.length; let j = target.length;
    while (i > 0 || j > 0) {
        if (i === 0) { j--; continue; }
        if (j === 0) { i--; continue; }
        if (isMatch(spoken[i - 1], target[j - 1])) { i--; j--; }
        else if (dp[i - 1][j] > dp[i][j - 1]) { i--; }
        else if (dp[i][j - 1] > dp[i - 1][j]) { j--; }
        else { mistakes.unshift({ said: spoken[i - 1], expected: target[j - 1] }); i--; j--; }
    }
    return mistakes;
};

export const GrammarGrootGame: React.FC<GrammarGrootGameProps> = ({ onBack, addTime, userClass, remainingTime, maxTime }) => {
  const [step, setStep] = useState<Step>('TOPIC_SELECTION');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 'Learn' mode states
  const [segments, setSegments] = useState<string[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [learnMistakesBySegment, setLearnMistakesBySegment] = useState<{ [key: number]: Mistake[] }>({});
  const [unattemptedLearnIndices, setUnattemptedLearnIndices] = useState<number[]>([]);
  const [matchedWordCount, setMatchedWordCount] = useState(0);
  const finalTranscriptRef = useRef('');
  const [resumePromptTopic, setResumePromptTopic] = useState<string | null>(null);
  const [attemptedLearnSegments, setAttemptedLearnSegments] = useState<Set<number>>(new Set());
  const hasProcessedSegment = useRef(false);

  // 'Practice' mode states
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [practiceScore, setPracticeScore] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'correct' | 'incorrect' | 'info', text: string } | null>(null);
  const [userSpokenText, setUserSpokenText] = useState<string | null>(null);
  const hasProcessedAnswer = useRef(false);

  // Common states
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const speechRecognizer = useMemo(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setRecognitionError('Speech recognition is not supported in this browser.');
      return null;
    }
    const recognizer = new SpeechRecognitionAPI();
    recognizer.continuous = true;
    recognizer.lang = 'en-IN';
    recognizer.interimResults = true;
    return recognizer;
  }, []);

  const getProgressKey = useCallback((topic: string | null) => {
    if (!userClass || !topic) return null;
    return `grammar-groot-progress-${userClass}-${topic}`;
  }, [userClass]);

  useEffect(() => {
    if (step === 'LEARN' && selectedTopic) {
        const key = getProgressKey(selectedTopic);
        if (key) {
            try { localStorage.setItem(key, String(currentSegmentIndex)); }
            catch (e) { console.warn("Could not save progress to localStorage.", e); }
        }
    }
  }, [currentSegmentIndex, step, selectedTopic, getProgressKey]);

  const cleanWord = (word: string) => word.trim().toLowerCase().replace(/[.,?!]/g, '');
  
  const processLearnSegmentMistakes = useCallback(() => {
    if (!attemptedLearnSegments.has(currentSegmentIndex)) return;
    const spokenWords = finalTranscriptRef.current.split(' ').map(cleanWord).filter(Boolean);
    const targetWords = segments[currentSegmentIndex]?.split(' ').map(cleanWord).filter(Boolean) || [];
    const segmentMistakes = calculateMistakes(spokenWords, targetWords);
    setLearnMistakesBySegment(prev => ({...prev, [currentSegmentIndex]: segmentMistakes}));
  }, [currentSegmentIndex, segments, attemptedLearnSegments]);
  
  const compileLearnReportAndFinish = useCallback((isEarly: boolean) => {
    speechRecognizer?.abort();
    processLearnSegmentMistakes();

    const finalAttempted = new Set(attemptedLearnSegments);
    const finalUnattempted = [...Array(segments.length).keys()].filter(i => !finalAttempted.has(i));
    setUnattemptedLearnIndices(finalUnattempted);

    const key = getProgressKey(selectedTopic);
    if (key) try { localStorage.removeItem(key); } catch (e) { }

    const allAttempted = finalUnattempted.length === 0;
    if (allAttempted && !isEarly) {
        addTime(60);
    }
    setStep('FEEDBACK');
  }, [speechRecognizer, processLearnSegmentMistakes, attemptedLearnSegments, segments.length, getProgressKey, selectedTopic, addTime]);

  const startLearnMode = useCallback(async (topic: string, startIndex = 0) => {
    setIsLoading(true);
    setError(null);
    setStep('LOADING');
    setSelectedTopic(topic);
    setLearnMistakesBySegment({});
    setUnattemptedLearnIndices([]);
    setAttemptedLearnSegments(new Set());

    const systemInstruction = `You are an AI that creates educational content for children. Your task is to generate a detailed, multi-paragraph explanation of a grammar rule.
**RULES:**
1. The language must be very simple, suitable for a child in Class ${userClass || '6th'}.
2. The explanation must be comprehensive enough to be broken into multiple paragraphs.
3. The tone should be encouraging and simple.
4. Your response must be ONLY the text of the lesson. Do not include any titles, greetings, or extra formatting.`;
    const prompt = `Generate a detailed lesson about "${topic}".`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-preview-04-17', contents: prompt, config: { systemInstruction } });
        const fullText = response.text;
        const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
        const newSegments: string[] = [];
        let currentSegment = '';
        sentences.forEach((sentence, index) => {
            currentSegment += sentence + ' ';
            if ((index + 1) % 3 === 0 || index === sentences.length - 1) {
                newSegments.push(currentSegment.trim());
                currentSegment = '';
            }
        });

        setSegments(newSegments.filter(s => s));
        setCurrentSegmentIndex(startIndex);
        setStep('LEARN');
    } catch (e) {
        console.error(e);
        setError(`Sorry, I couldn't generate a lesson for "${topic}". Please try another one.`);
        setStep('TOPIC_SELECTION');
    } finally {
        setIsLoading(false);
    }
  }, [userClass]);

  const startPracticeMode = useCallback(async (topic: string) => {
    setIsLoading(true);
    setError(null);
    setStep('LOADING');
    setSelectedTopic(topic);
    setMcqs([]);
    setCurrentMcqIndex(0);
    setPracticeScore(0);
    setFeedbackMessage(null);
    setUserSpokenText(null);

    const systemInstruction = `You are a quiz generation AI. Create a list of 10 multiple-choice questions (MCQs) for a child.
**RULES:**
1. The questions must be about the provided grammar topic.
2. The difficulty should be appropriate for a student in Class ${userClass || '6th'}.
3. The response MUST be a single, valid JSON array of 10 unique objects with no markdown.
4. JSON format for each object: { "question": string, "options": string[], "correctAnswer": string }
5. The 'correctAnswer' MUST be one of the strings in the 'options' array.
6. Ensure the questions are varied and not repetitive. Generate a new, unique set of questions each time.`;
    const prompt = `Generate 10 unique MCQs about "${topic}".`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash-preview-04-17',
             contents: prompt,
             config: { systemInstruction, responseMimeType: "application/json" }
        });
        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) jsonStr = match[2].trim();
        
        const parsedData = JSON.parse(jsonStr);
        if (Array.isArray(parsedData) && parsedData.length > 0 && parsedData.every(q => q.question && Array.isArray(q.options) && q.correctAnswer)) {
            setMcqs(parsedData);
            setStep('PRACTICE');
        } else {
            throw new Error("Invalid MCQ format received.");
        }
    } catch (e) {
        console.error(e);
        setError(`Failed to generate practice questions for "${topic}". Please try again.`);
        setStep('TOPIC_SELECTION');
    } finally {
        setIsLoading(false);
    }
  }, [userClass]);

  const processPracticeAnswer = useCallback((transcript: string) => {
    if (hasProcessedAnswer.current) return;
    hasProcessedAnswer.current = true;
    speechRecognizer?.stop();
    
    setUserSpokenText(transcript);
    const cleanedTranscript = cleanWord(transcript);
    const currentMcq = mcqs[currentMcqIndex];
    if (!currentMcq) return;

    let bestMatch = { option: '', distance: Infinity };

    currentMcq.options.forEach(option => {
        const distance = levenshteinDistance(cleanedTranscript, cleanWord(option));
        if (distance < bestMatch.distance) {
            bestMatch = { option, distance };
        }
    });
    
    const threshold = Math.max(3, Math.floor(cleanWord(bestMatch.option).length / 2));

    if (bestMatch.distance < threshold) {
        if (bestMatch.option === currentMcq.correctAnswer) {
            setPracticeScore(s => s + 1);
            setFeedbackMessage({ type: 'correct', text: `Correct! It was "${bestMatch.option}".` });
        } else {
            setFeedbackMessage({ type: 'incorrect', text: `Not quite. The correct answer was: "${currentMcq.correctAnswer}".` });
        }
    } else {
        setFeedbackMessage({ type: 'info', text: "I didn't recognize that as one of the options. Please try speaking the answer again." });
        hasProcessedAnswer.current = false;
    }
  }, [mcqs, currentMcqIndex, speechRecognizer]);

  const handleNextSegment = useCallback(() => {
    speechRecognizer?.abort();
    processLearnSegmentMistakes();
    
    if (currentSegmentIndex < segments.length - 1) {
        setCurrentSegmentIndex(prev => prev + 1);
    } else {
        compileLearnReportAndFinish(false);
    }
  }, [speechRecognizer, currentSegmentIndex, segments.length, processLearnSegmentMistakes, compileLearnReportAndFinish]);

  const startRecognition = useCallback(() => {
    if (!speechRecognizer || isRecognitionActive) return;
    try {
        setRecognitionError(null);
        if (step === 'LEARN') {
            finalTranscriptRef.current = ''; 
            setMatchedWordCount(0);
            hasProcessedSegment.current = false;
            setAttemptedLearnSegments(prev => new Set(prev).add(currentSegmentIndex));
        } else if (step === 'PRACTICE') {
            hasProcessedAnswer.current = false;
            setUserSpokenText(null);
            setFeedbackMessage(null);
        }
        speechRecognizer.start();
    } catch (e: any) {
        if (e.name !== 'InvalidStateError') {
            console.error("Could not start recognition:", e);
            setRecognitionError("Failed to start microphone.");
        }
    }
  }, [speechRecognizer, isRecognitionActive, step, currentSegmentIndex]);
  
  useEffect(() => {
    setMatchedWordCount(0);
    finalTranscriptRef.current = '';
    hasProcessedSegment.current = false;
    speechRecognizer?.abort();
  }, [currentSegmentIndex, speechRecognizer]);

  useEffect(() => {
    if (!speechRecognizer) return;

    const resultHandler = (event: SpeechRecognitionEvent) => {
        if (step === 'LEARN') {
            if (hasProcessedSegment.current) return;
            let interim = '', final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
                else interim += event.results[i][0].transcript;
            }
            if (final.trim()) finalTranscriptRef.current = final;
            
            const spokenText = (final + interim).trim();
            const spokenWords = spokenText.split(' ').map(cleanWord).filter(Boolean);
            const targetWords = segments[currentSegmentIndex]?.split(' ').map(cleanWord).filter(Boolean) || [];

            setMatchedWordCount(spokenWords.length);

            const isComplete = spokenWords.length >= targetWords.length;
            if (isComplete) {
                hasProcessedSegment.current = true;
                speechRecognizer?.stop();
                setTimeout(() => {
                    handleNextSegment();
                }, 1200);
            }
        } else if (step === 'PRACTICE') {
            if (hasProcessedAnswer.current) return;
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript.trim()) {
                processPracticeAnswer(finalTranscript.trim());
            }
        }
    };
    
    const handleEnd = () => setIsRecognitionActive(false);
    const handleStart = () => setIsRecognitionActive(true);
    const handleError = (e: any) => { if (e.error !== 'no-speech' && e.error !== 'aborted') { setRecognitionError(`Mic error: ${e.error}`); } setIsRecognitionActive(false); };

    speechRecognizer.addEventListener('result', resultHandler);
    speechRecognizer.addEventListener('start', handleStart);
    speechRecognizer.addEventListener('end', handleEnd);
    speechRecognizer.addEventListener('error', handleError);

    return () => {
      speechRecognizer.removeEventListener('result', resultHandler);
      speechRecognizer.removeEventListener('start', handleStart);
      speechRecognizer.removeEventListener('end', handleEnd);
      speechRecognizer.removeEventListener('error', handleError);
    };
  }, [speechRecognizer, step, currentSegmentIndex, segments, handleNextSegment, processPracticeAnswer]);

  useEffect(() => {
      if (!['LEARN', 'PRACTICE'].includes(step) && isRecognitionActive) {
          speechRecognizer?.abort();
      }
  }, [step, isRecognitionActive, speechRecognizer]);

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    const key = getProgressKey(topic);
    let savedIndex = null;
    if (key) { try { savedIndex = localStorage.getItem(key); } catch (e) { } }
    if (savedIndex !== null) { setResumePromptTopic(topic); }
    setStep('MODE_SELECTION');
  };

  const handleResume = () => {
    if (!resumePromptTopic) return;
    const key = getProgressKey(resumePromptTopic);
    let savedIndex = null;
    if (key) { try { savedIndex = localStorage.getItem(key); } catch (e) { } }
    startLearnMode(resumePromptTopic, savedIndex ? parseInt(savedIndex, 10) : 0);
    setResumePromptTopic(null);
  };

  const handleStartOver = () => {
    if (!resumePromptTopic) return;
    const key = getProgressKey(resumePromptTopic);
    if (key) { try { localStorage.removeItem(key); } catch (e) { } }
    startLearnMode(resumePromptTopic, 0);
    setResumePromptTopic(null);
  };

  const handleNextMcq = () => {
    if (currentMcqIndex < mcqs.length - 1) {
        setCurrentMcqIndex(i => i + 1);
        setFeedbackMessage(null);
        setUserSpokenText(null);
        hasProcessedAnswer.current = false;
    } else {
        if (practiceScore >= 10) {
            addTime(60);
        }
        setStep('PRACTICE_COMPLETE');
    }
  };
  
  const pronounceWord = (text: string) => {
    if (!window.speechSynthesis || voices.length === 0) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices.find(v => v.lang.startsWith('en')) || null;
    window.speechSynthesis.speak(utterance);
  };
  
  const resetToTopics = () => {
    setStep('TOPIC_SELECTION');
    setSelectedTopic(null);
    setLearnMistakesBySegment({});
    setUnattemptedLearnIndices([]);
  };

  const renderContent = () => {
    switch (step) {
      case 'TOPIC_SELECTION': return (
        <div className="p-8 w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto pr-2">
            {GRAMMAR_GROOT_TOPICS.map(topic => (
              <button key={topic} onClick={() => handleTopicSelect(topic)} className="p-4 bg-lime-900/70 rounded-lg border-2 border-lime-700 hover:bg-lime-800 hover:border-lime-500 transition-all transform hover:scale-105 text-lg font-semibold text-white">
                {topic}
              </button>
            ))}
          </div>
        </div>
      );
      case 'MODE_SELECTION': return (
        <div className="text-center flex flex-col items-center justify-center h-full p-4 animate-fade-in">
          <h2 className="text-4xl font-bold text-lime-300 mb-4">Topic: {selectedTopic}</h2>
          <p className="text-xl text-slate-200 mb-8">What would you like to do?</p>
          <div className="flex flex-col sm:flex-row gap-6">
            <button onClick={() => resumePromptTopic ? handleResume() : startLearnMode(selectedTopic!)} className="px-8 py-4 bg-cyan-600 text-white font-bold rounded-lg text-2xl hover:bg-cyan-700 transition-transform transform hover:scale-105">
              Learn about the Topic
              {resumePromptTopic && <span className="block text-sm font-normal text-yellow-300">(Resume)</span>}
            </button>
            <button onClick={() => startPracticeMode(selectedTopic!)} className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg text-2xl hover:bg-green-700 transition-transform transform hover:scale-105">
              Let's Practice
            </button>
          </div>
           {resumePromptTopic && (
              <button onClick={handleStartOver} className="mt-6 text-slate-400 hover:text-white underline">Or start over</button>
           )}
        </div>
      );
      case 'LOADING': return (
        <div className="text-center text-slate-300 text-2xl flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-lime-400"></div>
          <p>Groot is preparing content about <strong className="text-lime-300">{selectedTopic}</strong>...</p>
        </div>
      );
      case 'LEARN': return (
        <div className="p-4 sm:p-8 w-full max-w-4xl mx-auto flex flex-col h-full">
            <div className="pt-4 mb-4">
                <p className="text-center text-3xl font-bold mb-2" style={{ color: '#a55a0a' }}>{currentSegmentIndex + 1} / {segments.length}</p>
                <div className="w-full bg-slate-700 rounded-full h-4"><div className="bg-green-500 h-4 rounded-full transition-all duration-300" style={{ width: `${((currentSegmentIndex + 1) / segments.length) * 100}%` }}></div></div>
            </div>
            <div className="flex-grow flex items-center justify-center">
                <div className="max-h-[50vh] overflow-y-auto no-scrollbar px-4">
                    <p className="text-4xl md:text-5xl font-medium leading-relaxed text-center">
                        {segments[currentSegmentIndex]?.split(' ').map((word, index) => <span key={index} className={`transition-colors duration-200 ${index < matchedWordCount ? 'text-green-400 font-bold' : 'text-[#633e0b]'}`}>{word} </span>)}
                    </p>
                </div>
            </div>
            <div className="mt-8 flex flex-col items-center justify-center">
                {recognitionError && <p className="text-red-400">{recognitionError}</p>}
                <div className="flex items-center justify-center w-full gap-8">
                    <button onClick={() => currentSegmentIndex > 0 && setCurrentSegmentIndex(p => p-1)} disabled={currentSegmentIndex === 0} className="px-6 py-3 bg-slate-600 rounded-full font-bold text-lg hover:bg-slate-700 disabled:opacity-50">Back</button>
                    <button onClick={startRecognition} disabled={isRecognitionActive} className="text-lg px-6 py-2 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 flex items-center gap-2">
                        <MicrophoneIcon /> <span className={isRecognitionActive ? 'animate-pulse' : ''}>{isRecognitionActive ? 'Listening...' : 'Click to Read'}</span>
                    </button>
                    <button onClick={handleNextSegment} className="px-6 py-3 bg-green-600 rounded-full font-bold text-lg hover:bg-green-700"> {currentSegmentIndex === segments.length - 1 ? 'Finish' : 'Next'} </button>
                </div>
                <button onClick={() => compileLearnReportAndFinish(true)} className="mt-4 text-sm text-slate-400 hover:text-red-400 transition-colors"> End & See Report </button>
            </div>
        </div>
      );
      case 'PRACTICE': {
        const currentMcq = mcqs[currentMcqIndex];
        if (!currentMcq) return <div className="text-center text-red-500">Error: No question loaded.</div>;
        
        const getFeedbackColor = () => {
            if (!feedbackMessage) return 'text-slate-300';
            switch (feedbackMessage.type) {
                case 'correct': return 'text-green-400';
                case 'incorrect': return 'text-red-400';
                case 'info': return 'text-yellow-400';
            }
        };

        return (
            <div className="text-center flex flex-col items-center justify-center h-full p-4 animate-fade-in w-full max-w-4xl mx-auto">
                <div className="w-full mb-6">
                    <p className="text-lg text-slate-300">Question {currentMcqIndex + 1} of {mcqs.length}</p>
                    <h3 className="text-2xl md:text-3xl font-semibold text-white mt-2">{currentMcq.question}</h3>
                </div>
                <div className="w-full max-w-2xl bg-slate-800/50 p-4 rounded-lg border border-lime-800 mb-6">
                    <h4 className="text-xl font-semibold mb-2 text-lime-400">Options:</h4>
                    <ul className="list-decimal list-inside text-lg space-y-2 text-left text-slate-200">
                        {currentMcq.options.map((option) => <li key={option}>{option}</li>)}
                    </ul>
                </div>
                <div className="mt-4 flex flex-col items-center gap-4 h-32">
                    {feedbackMessage ? (
                        <div className='flex flex-col items-center gap-4 animate-fade-in'>
                            {userSpokenText && <p className="text-slate-400">You said: "{userSpokenText}"</p>}
                            <p className={`text-2xl font-bold ${getFeedbackColor()}`}>{feedbackMessage.text}</p>
                            <button onClick={handleNextMcq} className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-lg text-xl hover:bg-cyan-700">
                                {currentMcqIndex < mcqs.length - 1 ? 'Next Question' : 'See Results'}
                            </button>
                        </div>
                    ) : (
                        <button onClick={startRecognition} disabled={isRecognitionActive} className="text-xl px-8 py-4 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 flex items-center gap-3">
                            <MicrophoneIcon />
                            <span className={isRecognitionActive ? 'animate-pulse' : ''}>
                                {isRecognitionActive ? 'Listening...' : 'Speak Answer'}
                            </span>
                        </button>
                    )}
                    {recognitionError && <p className="text-red-400 mt-2">{recognitionError}</p>}
                </div>
            </div>
        );
      }
      case 'PRACTICE_COMPLETE': return (
        <div className="text-center flex flex-col items-center justify-center h-full p-4 animate-fade-in">
          <h2 className="text-5xl font-bold text-lime-300 mb-4">Quiz Complete!</h2>
          <p className="text-3xl text-white mb-2">Your Score</p>
          <p className="text-7xl font-extrabold text-green-400 mb-8">{practiceScore} / {mcqs.length}</p>
          {practiceScore >= 10 && (
             <div className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg text-xl mb-4 animate-float">
                Excellent! +60 seconds added!
            </div>
          )}
          <div className="flex gap-4 mt-4">
            <button onClick={() => startPracticeMode(selectedTopic!)} className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg text-xl hover:bg-cyan-700">Play Again</button>
            <button onClick={resetToTopics} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg text-xl hover:bg-indigo-700">Change Topic</button>
          </div>
        </div>
      );
      case 'FEEDBACK':
        const relevantMistakes = Object.values(learnMistakesBySegment).flat().filter(m => m.expected && m.expected !== '...' && m.said && m.said !== '...');
        const allLearnSegmentsUnattempted = attemptedLearnSegments.size === 0 && segments.length > 0;
        const allLearnAttemptedPerfectly = relevantMistakes.length === 0 && unattemptedLearnIndices.length === 0 && !allLearnSegmentsUnattempted;

        return (
          <div className="text-center flex flex-col items-center justify-center h-full p-4 animate-fade-in">
             <div className="w-full max-w-4xl mx-auto">
                {allLearnAttemptedPerfectly && (
                    <TimeProgressBar currentTime={remainingTime + 60} maxTime={maxTime} />
                )}
            </div>
            {allLearnSegmentsUnattempted ? (
                 <h2 className="text-4xl font-bold text-yellow-400 my-6">You did not read this lesson.</h2>
            ) : (
                <>
                    <h2 className="text-5xl font-bold text-lime-300 my-6">{allLearnAttemptedPerfectly ? 'Amazing!' : 'Great Try!'}</h2>
                    {!allLearnAttemptedPerfectly && <p className="text-2xl text-slate-200 mb-6">"Let's review your reading."</p>}
                </>
            )}

            {unattemptedLearnIndices.length > 0 && !allLearnSegmentsUnattempted && (
                <div className="w-full max-w-2xl bg-yellow-900/50 rounded-lg p-3 mb-4 border border-yellow-700">
                    <p className="text-yellow-300">You did not attempt to read segment(s): {unattemptedLearnIndices.map(i => i + 1).join(', ')}</p>
                </div>
            )}
            
            {relevantMistakes.length > 0 && (
              <div className="w-full max-w-2xl bg-slate-800/50 rounded-lg p-4 space-y-3 max-h-[40vh] overflow-y-auto border border-lime-800">
                {Object.entries(learnMistakesBySegment).map(([segmentIndex, segmentMistakes]) => {
                  const relevantSegmentMistakes = segmentMistakes.filter(m => m.expected && m.expected !== '...' && m.said && m.said !== '...');
                  if (relevantSegmentMistakes.length === 0) return null;
                  return (
                    <div key={segmentIndex} className="mb-4">
                      <h4 className="font-bold text-lg text-lime-400 mb-2 border-b border-lime-700 pb-1">Segment {parseInt(segmentIndex) + 1}</h4>
                      {relevantSegmentMistakes.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-900/70 p-3 rounded-md mb-2 text-left">
                           <div>
                              <p className="text-sm text-slate-400">You said: <span className="font-bold text-red-400">{item.said}</span></p>
                              <p className="text-lg">Correct is: <span className="font-bold text-green-400">{item.expected}</span></p>
                          </div>
                          <button onClick={() => pronounceWord(item.expected)} className="p-2 rounded-full bg-cyan-600 hover:bg-cyan-500 transition-colors" aria-label={`Listen to ${item.expected}`}><SoundIcon /></button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-4 mt-8">
              <button onClick={resetToTopics} className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg text-xl hover:bg-cyan-700">Try a New Topic</button>
              <button onClick={onBack} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg text-xl hover:bg-indigo-700">Back to Island</button>
            </div>
          </div>
        );
    }
  };

  const isReadingOral = step === 'LEARN';

  return (
    <div 
        className={`w-full h-full text-white relative flex flex-col justify-center animate-fade-in p-4 overflow-hidden ${isReadingOral ? 'bg-cover bg-center' : 'bg-green-900'}`}
        style={isReadingOral ? { backgroundImage: "url('/complete-background.png')" } : {}}
    >
        {!isReadingOral && (
            <div className="absolute inset-0 bg-contain bg-no-repeat opacity-10" style={{ backgroundImage: `url('/icons/grammar-groot-bg.png')`}} ></div>
        )}
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
            { !['LEARN', 'PRACTICE', 'PRACTICE_COMPLETE'].includes(step) &&
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center w-full px-4">
                    <h1 className="text-4xl sm:text-5xl font-bold text-lime-400" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>Grammar Groot</h1>
                </div>
            }
            {step === 'TOPIC_SELECTION' && (
                <button onClick={onBack} className="absolute top-6 left-6 text-slate-300 hover:text-white transition-colors z-20 font-bold flex items-center gap-2">
                    <span className="text-2xl">&larr;</span> Back to Island
                </button>
            )}
            {step !== 'TOPIC_SELECTION' && (
             <button onClick={resetToTopics} className="absolute top-6 left-6 text-slate-300 hover:text-white transition-colors z-20 font-bold flex items-center gap-2">
                <span className="text-2xl">&larr;</span> Topics
            </button>
            )}
            <div className="flex-grow flex flex-col justify-center w-full">{renderContent()}</div>
        </div>
    </div>
  );
};
