






import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { EnglishIcon } from './icons/EnglishIcon';
import { HindiIcon } from './icons/HindiIcon';
import { ScienceIcon } from './icons/ScienceIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { GeographyIcon } from './icons/GeographyIcon';
import { CivicsIcon } from './icons/CivicsIcon';
import { EconomicsIcon } from './icons/EconomicsIcon';
import { SoundIcon } from './icons/SoundIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { NCERT_BOOKS } from '../ncertData';
import { TimeProgressBar } from './TimeProgressBar';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ReadingArenaGameProps {
  onBack: () => void;
  userName: string | null;
  userClass: string | null;
  addTime: (seconds: number) => void;
  remainingTime: number;
  maxTime: number;
}

type Step = 'SUBJECT_SELECTION' | 'CHAPTER_SELECTION' | 'LOADING_SEGMENTS' | 'READING' | 'FEEDBACK';
type Mistake = { said: string; expected: string; };
interface Chapter { title: string; content?: string }

const subjects = [
    { name: 'English', icon: EnglishIcon },
    { name: 'Hindi', icon: HindiIcon },
    { name: 'Science', icon: ScienceIcon },
    { name: 'History', icon: HistoryIcon },
    { name: 'Geography', icon: GeographyIcon },
    { name: 'Civics', icon: CivicsIcon },
    { name: 'Economics', icon: EconomicsIcon },
];

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
        const threshold = s2.length > 5 ? 3 : 2;
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

const pathCoordinates = [
    { top: '79%', left: '23%' },   // Corresponds to '1' in the image
    { top: '68%', left: '43%' },   // Corresponds to '2' in the image
    { top: '60%', left: '50%' },   // Corresponds to '3' in the image
    { top: '65%', left: '68%' },   // Corresponds to '4' in the image
    { top: '52%', left: '83%' },   // Corresponds to '5' in the image
    { top: '35%', left: '80%' },   // Extra point near top-right palm
    { top: '40%', left: '60%' },   // Extra point on the straight path
    { top: '48%', left: '38%' },   // Extra point on upper S-curve
    { top: '75%', left: '30%' },   // Extra point on lower S-curve
    { top: '85%', left: '15%' },   // Extra point at path start
    { top: '25%', left: '70%' },   // Extra point near watchtower
    { top: '30%', left: '50%' },   // Extra point near the hut
];


export const ReadingArenaGame: React.FC<ReadingArenaGameProps> = ({ onBack, userName, userClass, addTime, remainingTime, maxTime }) => {
    const [step, setStep] = useState<Step>('SUBJECT_SELECTION');
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
    const [bookDetails, setBookDetails] = useState<{ bookName: string, chapters: Chapter[] } | null>(null);
    const [noContentMessage, setNoContentMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [segments, setSegments] = useState<string[]>([]);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
    const [mistakesBySegment, setMistakesBySegment] = useState<{ [key: number]: Mistake[] }>({});
    const [unattemptedIndices, setUnattemptedIndices] = useState<number[]>([]);
    const [isRecognitionActive, setIsRecognitionActive] = useState(false);
    const [recognitionError, setRecognitionError] = useState<string | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [matchedWordCount, setMatchedWordCount] = useState(0);
    const [resumePromptChapter, setResumePromptChapter] = useState<Chapter | null>(null);
    const finalTranscriptRef = useRef('');
    const [attemptedSegments, setAttemptedSegments] = useState<Set<number>>(new Set());
    const hasProcessedSegment = useRef(false);

    const getProgressKey = useCallback((subject: string | null, chapterTitle: string | null) => {
        if (!userClass || !subject || !chapterTitle) return null;
        return `reading-progress-${userClass}-${subject}-${chapterTitle}`;
    }, [userClass]);

    useEffect(() => {
        if (!window.speechSynthesis) return;
        const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    useEffect(() => {
        if (step === 'READING' && selectedChapter) {
            const key = getProgressKey(selectedSubject, selectedChapter.title);
            if (key) {
                try {
                    localStorage.setItem(key, String(currentSegmentIndex));
                } catch (e) {
                    console.warn("Could not save reading progress to localStorage.", e);
                }
            }
        }
    }, [currentSegmentIndex, step, selectedChapter, selectedSubject, getProgressKey]);
    
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

    const cleanWord = (word: string) => word.trim().toLowerCase().replace(/[.,?!]/g, '');

    const processCurrentSegmentMistakes = useCallback(() => {
        if (!attemptedSegments.has(currentSegmentIndex)) return;
        
        const spokenWords = finalTranscriptRef.current.split(' ').map(cleanWord).filter(Boolean);
        const targetWords = segments[currentSegmentIndex]?.split(' ').map(cleanWord).filter(Boolean) || [];

        const segmentMistakes = calculateMistakes(spokenWords, targetWords);
        setMistakesBySegment(prev => ({ ...prev, [currentSegmentIndex]: segmentMistakes }));
    }, [attemptedSegments, currentSegmentIndex, segments]);

    const compileReportAndFinish = useCallback((isEarly: boolean) => {
        speechRecognizer?.abort();
        processCurrentSegmentMistakes();

        const finalAttempted = new Set(attemptedSegments);
        const finalUnattempted = [...Array(segments.length).keys()].filter(i => !finalAttempted.has(i));
        setUnattemptedIndices(finalUnattempted);

        const key = getProgressKey(selectedSubject, selectedChapter?.title);
        if (key) {
            try { localStorage.removeItem(key); }
            catch(e) { console.warn("Could not remove progress from localStorage.", e); }
        }

        const allAttempted = finalUnattempted.length === 0;
        if (allAttempted && !isEarly) {
            addTime(300);
        }
        setStep('FEEDBACK');
    }, [speechRecognizer, processCurrentSegmentMistakes, attemptedSegments, segments.length, getProgressKey, selectedSubject, selectedChapter?.title, addTime]);


    const handleGoForward = useCallback(() => {
        speechRecognizer?.abort();
        processCurrentSegmentMistakes();
        
        if (currentSegmentIndex < segments.length - 1) {
            setCurrentSegmentIndex(prev => prev + 1);
        } else {
            compileReportAndFinish(false);
        }
    }, [speechRecognizer, processCurrentSegmentMistakes, currentSegmentIndex, segments.length, compileReportAndFinish]);

    const handleGoBackward = () => {
        if (currentSegmentIndex > 0) {
            speechRecognizer?.abort();
            processCurrentSegmentMistakes();
            setCurrentSegmentIndex(prev => prev - 1);
        }
    };

    const handleEndEarly = () => {
        compileReportAndFinish(true);
    };

    const startRecognition = useCallback(() => {
        if (!speechRecognizer || isRecognitionActive) return;
        setAttemptedSegments(prev => new Set(prev).add(currentSegmentIndex));
        try {
            setRecognitionError(null);
            hasProcessedSegment.current = false;
            finalTranscriptRef.current = '';
            setMatchedWordCount(0);
            speechRecognizer?.start();
        } catch (e: any) {
            if (e.name !== 'InvalidStateError') {
                console.error("Could not start recognition:", e);
                setRecognitionError("Failed to start microphone.");
            }
        }
    }, [isRecognitionActive, speechRecognizer, currentSegmentIndex]);

    useEffect(() => {
        setMatchedWordCount(0);
        finalTranscriptRef.current = '';
        hasProcessedSegment.current = false;
        speechRecognizer?.abort();
    }, [currentSegmentIndex, speechRecognizer]);

    useEffect(() => {
        if (!speechRecognizer) return;

        const handleResult = (event: any) => {
            if (step !== 'READING' || hasProcessedSegment.current) return;
            
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) finalTranscriptRef.current = finalTranscript;
            
            const spokenText = (finalTranscript + interimTranscript).trim();
            const spokenWords = spokenText.split(' ').map(cleanWord).filter(Boolean);
            const targetWords = segments[currentSegmentIndex]?.split(' ').map(cleanWord).filter(Boolean) || [];
            
            setMatchedWordCount(spokenWords.length);

            const isComplete = spokenWords.length >= targetWords.length;
            if (isComplete) {
                hasProcessedSegment.current = true;
                speechRecognizer?.stop();
                setTimeout(() => {
                    handleGoForward();
                }, 1200);
            }
        };
        const handleEnd = () => setIsRecognitionActive(false);
        const handleStart = () => setIsRecognitionActive(true);
        const handleError = (e: any) => { 
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
              setRecognitionError(`Mic error: ${e.error}`);
            }
            setIsRecognitionActive(false);
        };
        speechRecognizer.addEventListener('result', handleResult);
        speechRecognizer.addEventListener('start', handleStart);
        speechRecognizer.addEventListener('end', handleEnd);
        speechRecognizer.addEventListener('error', handleError);
        return () => {
            speechRecognizer.removeEventListener('result', handleResult);
            speechRecognizer.removeEventListener('start', handleStart);
            speechRecognizer.removeEventListener('end', handleEnd);
            speechRecognizer.removeEventListener('error', handleError);
        };
    }, [speechRecognizer, step, currentSegmentIndex, segments, handleGoForward]);

    useEffect(() => {
        if (step !== 'READING' && isRecognitionActive) {
            speechRecognizer?.abort();
        }
    }, [step, isRecognitionActive, speechRecognizer]);

    const segmentChapter = useCallback((text: string, startIndex = 0) => {
        setStep('LOADING_SEGMENTS');
        setIsLoading(true);
        setError(null);
        
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
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
        setMistakesBySegment({});
        setUnattemptedIndices([]);
        setAttemptedSegments(new Set());
        setStep('READING');
        setIsLoading(false);
    }, []);

    const handleSubjectSelect = (subjectName: string) => {
        if (!userClass) {
            setNoContentMessage("We couldn't determine your class. Please complete the guide first.");
            setTimeout(() => setNoContentMessage(null), 3000);
            return;
        }
        const classData = NCERT_BOOKS[userClass as keyof typeof NCERT_BOOKS];
        const subjectData = classData ? classData[subjectName] : undefined;
        if (subjectData && subjectData.chapters.length > 0) {
            setSelectedSubject(subjectName); setBookDetails(subjectData); setStep('CHAPTER_SELECTION');
        } else {
            setNoContentMessage(`Sorry, no chapters for ${subjectName} in ${userClass} class.`);
            setTimeout(() => setNoContentMessage(null), 3000);
        }
    };

    const handleChapterSelect = (chapter: Chapter) => {
        if (chapter.content) {
            setSelectedChapter(chapter);
            const key = getProgressKey(selectedSubject, chapter.title);
            let savedIndex = null;
            if (key) {
                try {
                    savedIndex = localStorage.getItem(key);
                } catch (e) {
                    console.warn("Could not read reading progress from localStorage.", e);
                }
            }
            if (savedIndex !== null) {
                setResumePromptChapter(chapter);
            } else {
                segmentChapter(chapter.content, 0);
            }
        } else {
            setNoContentMessage("Sorry, the content for this chapter is not available yet.");
            setTimeout(() => setNoContentMessage(null), 3000);
        }
    };

    const handleResume = () => {
        if (!resumePromptChapter?.content) return;
        const key = getProgressKey(selectedSubject, resumePromptChapter.title);
        let savedIndex = null;
        if (key) {
            try {
                savedIndex = localStorage.getItem(key);
            } catch (e) {
                console.warn("Could not read reading progress from localStorage.", e);
            }
        }
        segmentChapter(resumePromptChapter.content, savedIndex ? parseInt(savedIndex, 10) : 0);
        setResumePromptChapter(null);
    };

    const handleStartOver = () => {
        if (!resumePromptChapter?.content) return;
        const key = getProgressKey(selectedSubject, resumePromptChapter.title);
        if (key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn("Could not remove reading progress from localStorage.", e);
            }
        }
        segmentChapter(resumePromptChapter.content, 0);
        setResumePromptChapter(null);
    };

    const pronounceWord = (text: string) => {
        if (!window.speechSynthesis || voices.length === 0) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voices.find(v => v.lang.startsWith('en')) || null;
        window.speechSynthesis.speak(utterance);
    };

    const renderContent = () => {
        switch (step) {
            case 'SUBJECT_SELECTION': return (
                <div className="p-8 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-2">Hello, {userName || 'Student'}!</h2>
                    <p className="text-xl text-slate-300 mb-8">Please select a subject to read from.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {subjects.map(({ name, icon: Icon }) => (
                            <button key={name} onClick={() => handleSubjectSelect(name)} className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-800/70 rounded-2xl border border-slate-600 hover:bg-cyan-500/50 hover:border-cyan-400 transition-all transform hover:scale-105">
                                <Icon /> <span className="font-bold text-white text-center">{name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            );
            case 'CHAPTER_SELECTION': return (
                <div className="relative w-full h-full">
                    <div className="absolute top-0 left-0 right-0 p-4 bg-black/30 z-10">
                        <button onClick={() => { setStep('SUBJECT_SELECTION'); setSelectedChapter(null); }} className="absolute top-1/2 -translate-y-1/2 left-4 flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-lg font-bold">
                            &larr; Back
                        </button>
                        <div className="text-center w-full max-w-xl mx-auto">
                            <h2 className="text-xl sm:text-2xl font-bold text-white" style={{textShadow: '2px 2px 4px #000'}}>{selectedSubject} - <span className="text-cyan-400">{bookDetails?.bookName}</span></h2>
                            <p className="text-sm text-slate-200 mt-1" style={{textShadow: '1px 1px 2px #000'}}>Select a chapter to begin your adventure!</p>
                        </div>
                    </div>
            
                    <div className="w-full h-full">
                        {bookDetails?.chapters.map((chapter, index) => {
                            if (index >= pathCoordinates.length) return null;
            
                            const pos = pathCoordinates[index];
                            const key = getProgressKey(selectedSubject, chapter.title);
                            let savedIndex = null;
                            if (key) {
                                try { savedIndex = localStorage.getItem(key); } catch (e) { /* ignore */ }
                            }
            
                            return (
                                <div 
                                    key={index}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                                    style={{ top: pos.top, left: pos.left }}
                                >
                                    <button 
                                        onClick={() => handleChapterSelect(chapter)}
                                        disabled={!chapter.content}
                                        className="relative w-12 h-12 bg-[#D2B48C] rounded-full flex items-center justify-center font-bold text-xl text-slate-800 border-4 border-[#8B4513] shadow-lg transition-all duration-300 hover:scale-110 hover:border-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        aria-label={`Chapter ${index + 1}: ${chapter.title}`}
                                    >
                                        {index + 1}
                                        {savedIndex !== null && (
                                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border-2 border-white" title="Resume progress">R</span>
                                        )}
                                    </button>
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs bg-slate-800 text-white text-sm rounded-md px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 shadow-lg text-center">
                                        <p className="font-bold">{chapter.title}</p>
                                        {!chapter.content && <p className="text-xs text-red-400">(Not Available)</p>}
                                        {savedIndex !== null && <p className="text-xs text-yellow-400">(Progress saved)</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
            case 'LOADING_SEGMENTS': return <div className="text-center text-slate-300 animate-pulse text-2xl">Preparing your chapter...</div>;
            case 'READING': return (
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
                    <div className="flex-shrink-0 pt-4 pb-8 flex flex-col items-center justify-center">
                        {recognitionError && <p className="text-red-400">{recognitionError}</p>}
                        <div className="flex items-center justify-center w-full gap-8">
                            <button onClick={handleGoBackward} disabled={currentSegmentIndex === 0} className="px-6 py-3 bg-slate-600 rounded-full font-bold text-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Back
                            </button>
                            <button onClick={startRecognition} disabled={isRecognitionActive} className="text-lg px-6 py-2 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed">
                                <span className={isRecognitionActive ? 'animate-pulse' : ''}>{isRecognitionActive ? 'Listening...' : 'Click to Read'}</span>
                            </button>
                            <button onClick={handleGoForward} className="px-6 py-3 bg-green-600 rounded-full font-bold text-lg hover:bg-green-700 transition-colors">
                                {currentSegmentIndex === segments.length - 1 ? 'Finish' : 'Next'}
                            </button>
                        </div>
                        <button onClick={handleEndEarly} className="mt-4 text-sm text-slate-400 hover:text-red-400 transition-colors">
                            End & See Report
                        </button>
                    </div>
                </div>
            );
            case 'FEEDBACK':
                const allSegmentsUnattempted = attemptedSegments.size === 0 && segments.length > 0;
                const relevantMistakes = Object.values(mistakesBySegment).flat().filter(m => m.expected && m.expected !== '...' && m.said && m.said !== '...');
                const allAttemptedPerfectly = relevantMistakes.length === 0 && unattemptedIndices.length === 0 && !allSegmentsUnattempted;

                return (
                    <div className="text-center flex flex-col items-center justify-center h-full p-4 animate-fade-in">
                         <div className="w-full max-w-4xl mx-auto">
                            {allAttemptedPerfectly && (
                                <TimeProgressBar currentTime={remainingTime} maxTime={maxTime} />
                            )}
                        </div>
                        {allSegmentsUnattempted ? (
                            <h2 className="text-4xl font-bold text-yellow-400 my-6">You haven't read anything from this chapter.</h2>
                        ) : (
                             <>
                                <h2 className="text-4xl font-bold text-green-400 my-6">{allAttemptedPerfectly ? 'Perfect!' : 'Great Effort!'}</h2>
                                { !allAttemptedPerfectly && <p className="text-lg text-slate-300 mb-6">Here's your reading report.</p> }
                            </>
                        )}
                        
                        {unattemptedIndices.length > 0 && !allSegmentsUnattempted && (
                            <div className="w-full max-w-2xl bg-yellow-900/50 rounded-lg p-3 mb-4 border border-yellow-700">
                                <p className="text-yellow-300">You did not attempt to read segment(s): {unattemptedIndices.map(i => i + 1).join(', ')}</p>
                            </div>
                        )}

                        {relevantMistakes.length > 0 && (
                            <div className="w-full max-w-2xl bg-slate-800 rounded-lg p-4 space-y-3 max-h-[40vh] overflow-y-auto">
                                {Object.entries(mistakesBySegment).map(([segmentIndex, segmentMistakes]) => {
                                    const relevantSegmentMistakes = segmentMistakes.filter(m => m.expected && m.expected !== '...' && m.said && m.said !== '...');
                                    if (relevantSegmentMistakes.length === 0) return null;
                                    return (
                                        <div key={segmentIndex} className="mb-4">
                                            <h4 className="font-bold text-lg text-cyan-400 mb-2 border-b border-cyan-700 pb-1">Segment {parseInt(segmentIndex) + 1}</h4>
                                            {relevantSegmentMistakes.map((mistake, index) => (
                                                <div key={index} className="flex items-center justify-between bg-slate-700 p-3 rounded-md mb-2 transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-cyan-500">
                                                    <div className="flex-grow text-left">
                                                        <p className="text-sm text-slate-400">You said: <span className="font-bold text-red-400">{mistake.said}</span></p>
                                                        <p className="text-lg">Correct word: <span className="font-bold text-green-400">{mistake.expected}</span></p>
                                                    </div>
                                                    <button onClick={() => pronounceWord(mistake.expected)} className="p-3 ml-4 rounded-full bg-cyan-600 hover:bg-cyan-500 transition-colors" aria-label={`Listen to ${mistake.expected}`}><SoundIcon /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        <button onClick={onBack} className="mt-8 px-8 py-4 bg-green-600 text-white font-bold rounded-lg text-2xl hover:bg-green-700">Finish</button>
                    </div>
                );
            default: return null;
        }
    };

    const getBackgroundClasses = () => {
        if (step === 'CHAPTER_SELECTION') return 'bg-cover bg-center';
        if (step === 'READING') return 'bg-cover bg-center';
        return 'bg-gradient-to-br from-indigo-900 to-slate-900';
    }

    return (
        <div className="w-full h-full text-white relative flex flex-col justify-center animate-fade-in">
            {step === 'CHAPTER_SELECTION' && (
                <video 
                    src="/pirate-island-bg.mp4" 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0" 
                />
            )}
             {step === 'READING' && (
                <div className="absolute inset-0 w-full h-full bg-cover bg-center z-0" style={{ backgroundImage: "url('/complete-background.png')" }}></div>
            )}
            {step !== 'CHAPTER_SELECTION' && step !== 'READING' && (
                 <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 z-0"></div>
            )}

            <div className="relative z-10 h-full flex flex-col">
                {resumePromptChapter && (
                    <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center animate-fade-in">
                        <div className="bg-slate-800 p-8 rounded-2xl max-w-sm w-full border border-cyan-500 shadow-2xl shadow-cyan-500/20 flex flex-col items-center gap-4">
                            <h3 className="text-2xl font-bold">Resume Reading?</h3>
                            <p className="text-slate-300 text-center">
                                You have existing progress for "{resumePromptChapter.title}".
                            </p>
                            <div className="flex gap-4 mt-4">
                                <button onClick={handleResume} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Resume</button>
                                <button onClick={handleStartOver} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Start Over</button>
                            </div>
                        </div>
                    </div>
                )}
                {noContentMessage && <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white text-lg font-bold px-6 py-3 rounded-full shadow-lg z-50">{noContentMessage}</div>}
                {isLoading && <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-yellow-600 text-white text-lg font-bold px-6 py-3 rounded-full shadow-lg z-50 animate-pulse"> {error || 'Loading...'}</div>}
                {step !== 'READING' && step !== 'CHAPTER_SELECTION' && <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400 text-center absolute top-6 left-1/2 -translate-x-1/2" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.7)'}}>Reading Arena</h1>}
                <div className="flex-grow flex flex-col justify-center overflow-auto">{renderContent()}</div>
            </div>
        </div>
    );
};
