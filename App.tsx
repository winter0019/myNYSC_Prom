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
    <div className="w-full p-4 my-4 text-sm text-yellow-800 rounded-lg bg-yellow-100 dark:bg-slate-900 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800" role="alert">
        <h2 className="font-bold mb-2">Configuration Error: API Key is Missing</h2>
        <p>
            The application cannot connect to the AI service because the API key has not been configured.
        </p>
        <p className="mt-2">
            <strong>To fix this:</strong> Go to your project's settings on Render, navigate to the "Environment" section, and add a new environment variable with the key <code className="font-mono bg-yellow-200 dark:bg-slate-700 p-1 rounded">GEMINI_API_KEY</code> and your Gemini API key as the value. The deployment will automatically restart.
        </p>
    </div>
);

const ApiKeyInvalidBanner = () => (
    <div className="w-full p-4 my-4 text-sm text-red-800 rounded-lg bg-red-100 dark:bg-slate-900 dark:text-red-300 border border-red-200 dark:border-red-800" role="alert">
        <h2 className="font-bold mb-2">Configuration Error: API Key is Invalid</h2>
        <p>
            The application failed to connect to the AI service. The provided API key is invalid, has been leaked, or lacks the necessary permissions.
        </p>
        <p className="mt-2">
            <strong>To fix this:</strong> Please generate a new key from Google AI Studio. Then, go to your project's settings on Render, navigate to the "Environment" section, and update the environment variable with the key <code className="font-mono bg-red-200 dark:bg-slate-700 p-1 rounded">GEMINI_API_KEY</code> to your new API key value. The deployment will automatically restart.
        </p>
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
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode(prev => {
      const newIsDark = !prev;
      if (newIsDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newIsDark;
    });
  };

  const handleError = (errorMessage: string, finishAction = true) => {
    setError(errorMessage);
    if(finishAction){
      setError(prev => `${prev} Finish what you were doing.`);
    } else {
       setAppState(AppState.AWAITING_UPLOAD);
       setEssayQuestions([]);
       setSelectedQuestionIndex(null);
       setFeedback(null);
    }
  };

  const handleFileReceived = useCallback(async (file: File) => {
    if (!gradeLevel) {
      setError("Please select a grade level before uploading a file.");
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
      
      const shuffledQuestions = [...questionPool].sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffledQuestions.slice(0, Math.min(3, shuffledQuestions.length));
      
      setEssayQuestions(selectedQuestions.map(q => ({ text: q })));
      setAppState(AppState.AWAITING_QUESTION_SELECTION);
    } catch (err: any) {
      if (err instanceof Error && err.message.startsWith("API_KEY_INVALID")) {
          setApiKeyStatus('INVALID');
          setError(null);
          setAppState(AppState.AWAITING_UPLOAD);
      } else {
          handleError(err.message || 'An unknown error occurred while processing the file.', false);
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
        if (err instanceof Error && err.message.startsWith("API_KEY_INVALID")) {
            setApiKeyStatus('INVALID');
            setError(null);
            setAppState(AppState.AWAITING_ANSWER);
        } else {
            handleError(err.message || 'An unexpected error occurred.', true);
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
    setHistory([]);
  };

  const handleAnswerAnother = () => {
    setAppState(AppState.AWAITING_QUESTION_SELECTION);
    setSelectedQuestionIndex(null);
    setUserAnswer('');
    setFeedback(null);
    setError(null);
  }
  
  const renderContent = () => {
    if (apiKeyStatus === 'MISSING') {
        return <ApiKeyMissingBanner />;
    }
    if (apiKeyStatus === 'INVALID') {
        return <ApiKeyInvalidBanner />;
    }
      
    switch (appState) {
      case AppState.AWAITING_UPLOAD:
        return (
          <div className="w-full space-y-6">
            <p className="text-center text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Begin by selecting your grade level and uploading your study document. We'll then create practice questions from its content to help you prepare.
            </p>
            <div className="w-full space-y-4">
              <GradeLevelSelector selectedGrade={gradeLevel} onGradeChange={setGradeLevel} disabled={false} />
              <FileUpload onFileSelect={handleFileReceived} disabled={!gradeLevel} />
            </div>
          </div>
        );
      case AppState.PROCESSING_FILE:
        return <Loader text={`Processing ${fileName}...`} />;
      case AppState.CLASSIFYING_DOCUMENT:
        return <Loader text="Analyzing document type..." />;
      case AppState.GENERATING_QUESTIONS:
        return <Loader text={documentType === DocumentType.QUESTION_PAPER ? "Extracting questions..." : "Generating exam questions..."} />;
      case AppState.AWAITING_QUESTION_SELECTION:
        return <QuestionSelection questions={essayQuestions} onSelectQuestion={handleQuestionSelect} />;
      case AppState.AWAITING_ANSWER:
        return (
          <div className="w-full space-y-6">
            {selectedQuestionIndex !== null && <QuestionDisplay question={essayQuestions[selectedQuestionIndex].text} />}
            <AnswerInput onSubmit={handleAnswerSubmit} disabled={false} />
          </div>
        );
      case AppState.EVALUATING:
         return (
          <div className="w-full space-y-6">
            {selectedQuestionIndex !== null && <QuestionDisplay question={essayQuestions[selectedQuestionIndex].text} />}
            <AnswerInput onSubmit={handleAnswerSubmit} disabled={true} />
            <Loader text="Evaluating your answer..." />
          </div>
        );
      case AppState.SHOWING_FEEDBACK:
        return feedback ? <FeedbackDisplay feedback={feedback} onStartOver={handleStartOver} onAnswerAnother={handleAnswerAnother} documentType={documentType} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-light-text dark:text-dark-text flex flex-col items-center">
      <Header isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} />
      <div className="w-full max-w-3xl mx-auto space-y-6 p-4">
        <main className="flex flex-col items-center">
            {error && apiKeyStatus === 'VALID' && (
            <div className="w-full p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-100 dark:bg-slate-900 dark:text-red-300 border border-red-200 dark:border-red-800" role="alert">
                <span className="font-medium">Error:</span> {error}
            </div>
            )}
            {renderContent()}

            {history.length > 0 && (appState === AppState.AWAITING_QUESTION_SELECTION || appState === AppState.SHOWING_FEEDBACK) && (
              <HistoryDisplay history={history} />
            )}
        </main>
      </div>
    </div>
  );
}