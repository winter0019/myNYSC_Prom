/// <reference lib="dom" />
import React, { useState, useCallback, useEffect } from 'react';
import { AppState, DocumentType } from './types';
import type { Feedback, Question, HistoryEntry } from './types';
import { getTextFromFile, generateEssayQuestions, evaluateAnswer, classifyDocument, extractQuestionsFromPaper } from './services/geminiService';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { QuestionDisplay } from './components/QuestionDisplay';
import { AnswerInput } from './components/AnswerInput';
import { FeedbackDisplay } from './components/FeedbackDisplay';
import { GradeLevelSelector } from './components/GradeLevelSelector';
import { QuestionSelection } from './components/QuestionSelection';
import { HistoryDisplay } from './components/HistoryDisplay';

const ApiKeyMissingBanner = () => (
    <div className="w-full p-6 my-4 text-sm text-yellow-800 rounded-xl bg-yellow-50 dark:bg-slate-900 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 shadow-sm" role="alert">
        <h2 className="font-bold text-lg mb-2">Missing API Key</h2>
        <p>The AI service requires a Gemini API key. Please ensure GEMINI_API_KEY is set in your environment variables.</p>
    </div>
);

const ApiKeyInvalidBanner = () => (
    <div className="w-full p-6 my-4 text-sm text-red-800 rounded-xl bg-red-50 dark:bg-slate-900 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-sm" role="alert">
        <h2 className="font-bold text-lg mb-2">Invalid API Key</h2>
        <p>The provided API key is invalid or lacks permissions. Please check your Google AI Studio dashboard for a valid key.</p>
    </div>
);

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.AWAITING_UPLOAD);
  const [apiKeyStatus, setApiKeyStatus] = useState<'VALID' | 'MISSING' | 'INVALID'>('VALID');
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [essayQuestions, setEssayQuestions] = useState<Question[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!process.env.API_KEY) {
        setApiKeyStatus('MISSING');
    }
    // Fix: Use window object with any assertion to access global DOM APIs like localStorage and matchMedia.
    const savedTheme = (window as any).localStorage.getItem('theme');
    const prefersDark = (window as any).matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      (window as any).document.documentElement.classList.add('dark');
    }
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode(prev => {
      const newIsDark = !prev;
      // Fix: Use window.document to access the document object and apply the dark class.
      (window as any).document.documentElement.classList.toggle('dark', newIsDark);
      (window as any).localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
      return newIsDark;
    });
  };

  const handleError = (errorMessage: string, returnToUpload = false) => {
    setError(errorMessage);
    if (returnToUpload) {
       setAppState(AppState.AWAITING_UPLOAD);
       setEssayQuestions([]);
       setSelectedQuestionIndex(null);
       setFeedback(null);
    }
  };

  const handleFileReceived = useCallback(async (file: File) => {
    if (!gradeLevel) {
      setError("Please select a grade level before uploading.");
      return;
    }
    setError(null);
    setFileName(file.name);
    setAppState(AppState.PROCESSING_FILE);
    
    try {
      const text = await getTextFromFile(file);
      setDocumentText(text);

      setAppState(AppState.CLASSIFYING_DOCUMENT);
      const docType = await classifyDocument(text);
      setDocumentType(docType);

      setAppState(AppState.GENERATING_QUESTIONS);
      
      let questionPool: string[];
      if (docType === DocumentType.QUESTION_PAPER) {
          questionPool = await extractQuestionsFromPaper(text);
      } else {
          questionPool = await generateEssayQuestions(text, gradeLevel);
      }
      
      if (!questionPool || questionPool.length === 0) {
        throw new Error("No questions could be generated from this document. Try a different file.");
      }

      const shuffledQuestions = [...questionPool].sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffledQuestions.slice(0, Math.min(3, shuffledQuestions.length));
      
      setEssayQuestions(selectedQuestions.map(q => ({ text: q })));
      setAppState(AppState.AWAITING_QUESTION_SELECTION);
    } catch (err: any) {
      if (err.message?.startsWith("API_KEY_INVALID")) {
          setApiKeyStatus('INVALID');
          setAppState(AppState.AWAITING_UPLOAD);
      } else {
          handleError(err.message || 'Error processing document.', true);
      }
    }
  }, [gradeLevel]);

  const handleQuestionSelect = (index: number) => {
    setSelectedQuestionIndex(index);
    setAppState(AppState.AWAITING_ANSWER);
  };

  const handleAnswerSubmit = useCallback(async (answer: string) => {
    if (!documentText || selectedQuestionIndex === null || documentType === null) return;
    setError(null);
    setUserAnswer(answer);
    setAppState(AppState.EVALUATING);
    try {
      const result = await evaluateAnswer(documentText, essayQuestions[selectedQuestionIndex].text, answer, documentType);

      const newHistoryEntry: HistoryEntry = {
          question: essayQuestions[selectedQuestionIndex].text,
          answer: answer,
          feedback: result
      };
      setHistory(prev => [...prev, newHistoryEntry]);
      setFeedback(result);

      setEssayQuestions(prevQuestions => {
          const newQuestions = [...prevQuestions];
          if (selectedQuestionIndex !== null) {
            newQuestions[selectedQuestionIndex] = {
              ...newQuestions[selectedQuestionIndex],
              feedback: result,
            };
          }
          return newQuestions;
        });

      setAppState(AppState.SHOWING_FEEDBACK);
    } catch (err: any) {
        if (err.message?.startsWith("API_KEY_INVALID")) {
            setApiKeyStatus('INVALID');
            setAppState(AppState.AWAITING_ANSWER);
        } else {
            handleError(err.message || 'Evaluation failed. Please try again.', false);
            setAppState(AppState.AWAITING_ANSWER);
        }
    }
  }, [documentText, essayQuestions, selectedQuestionIndex, documentType]);

  const handleStartOver = () => {
    setAppState(AppState.AWAITING_UPLOAD);
    setGradeLevel('');
    setDocumentText(null);
    setDocumentType(null);
    setEssayQuestions([]);
    setSelectedQuestionIndex(null);
    setUserAnswer('');
    setFeedback(null);
    setError(null);
    setFileName(null);
  };

  const handleAnswerAnother = () => {
    setAppState(AppState.AWAITING_QUESTION_SELECTION);
    setSelectedQuestionIndex(null);
    setUserAnswer('');
    setFeedback(null);
    setError(null);
  }
  
  const renderContent = () => {
    if (apiKeyStatus === 'MISSING') return <ApiKeyMissingBanner />;
    if (apiKeyStatus === 'INVALID') return <ApiKeyInvalidBanner />;
      
    switch (appState) {
      case AppState.AWAITING_UPLOAD:
        return (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-extrabold text-light-text dark:text-white">AI Grade Assistant</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                  Upload your study materials or an old exam paper. Our AI will challenge you with customized questions and provide instant, detailed feedback.
                </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 space-y-6">
              <GradeLevelSelector selectedGrade={gradeLevel} onGradeChange={setGradeLevel} disabled={false} />
              <FileUpload onFileSelect={handleFileReceived} disabled={!gradeLevel} />
            </div>
          </div>
        );
      case AppState.PROCESSING_FILE:
        return <Loader text={`Analyzing ${fileName}...`} />;
      case AppState.CLASSIFYING_DOCUMENT:
        return <Loader text="Identifying document context..." />;
      case AppState.GENERATING_QUESTIONS:
        return <Loader text="Crafting your exam questions..." />;
      case AppState.AWAITING_QUESTION_SELECTION:
        return <QuestionSelection questions={essayQuestions} onSelectQuestion={handleQuestionSelect} />;
      case AppState.AWAITING_ANSWER:
        return (
          <div className="w-full space-y-6 animate-fade-in">
            {selectedQuestionIndex !== null && <QuestionDisplay question={essayQuestions[selectedQuestionIndex].text} />}
            <AnswerInput onSubmit={handleAnswerSubmit} disabled={false} />
          </div>
        );
      case AppState.EVALUATING:
         return (
          <div className="w-full space-y-6">
            {selectedQuestionIndex !== null && <QuestionDisplay question={essayQuestions[selectedQuestionIndex].text} />}
            <AnswerInput onSubmit={handleAnswerSubmit} disabled={true} />
            <Loader text="Critiquing your answer with AI precision..." />
          </div>
        );
      case AppState.SHOWING_FEEDBACK:
        return feedback ? <FeedbackDisplay feedback={feedback} onStartOver={handleStartOver} onAnswerAnother={handleAnswerAnother} documentType={documentType} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-background text-light-text dark:text-dark-text transition-colors duration-300">
      <Header isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} />
      <div className="w-full max-w-4xl mx-auto p-4 pb-20">
        <main className="flex flex-col items-center">
            {error && apiKeyStatus === 'VALID' && (
              <div className="w-full p-4 mb-6 text-sm text-red-800 rounded-xl bg-red-100 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-900/30 flex items-center justify-between" role="alert">
                  <span><span className="font-bold">Error:</span> {error}</span>
                  <button onClick={() => setError(null)} className="ml-4 font-bold hover:opacity-70">&times;</button>
              </div>
            )}
            
            <div className="w-full">
                {renderContent()}
            </div>

            {history.length > 0 && (appState === AppState.AWAITING_QUESTION_SELECTION || appState === AppState.SHOWING_FEEDBACK || appState === AppState.AWAITING_UPLOAD) && (
              <HistoryDisplay history={history} />
            )}
        </main>
      </div>
    </div>
  );
}