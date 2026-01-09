import React from 'react';
import type { Feedback } from '../types';
import { DocumentComparisonIcon, LightBulbIcon, LinkIcon } from './IconComponents';
import { DocumentType } from '../types';

interface FeedbackDisplayProps {
  feedback: Feedback;
  onStartOver: () => void;
  onAnswerAnother: () => void;
  documentType: DocumentType | null;
}

const FeedbackCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm p-6 ${className}`}>
        <div className="flex items-center mb-4">
            <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 rounded-full p-2">
                {icon}
            </div>
            <h3 className="ml-4 text-xl font-bold text-light-text dark:text-white">{title}</h3>
        </div>
        <div className="text-gray-600 dark:text-gray-300 space-y-4 prose prose-base dark:prose-invert max-w-none leading-relaxed">
            {children}
        </div>
    </div>
);

const getConfidenceColors = (score: number) => {
    if (score < 50) {
        return {
            background: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30',
            assessmentText: 'text-red-800 dark:text-red-200',
            meter: 'stroke-red-500',
            scoreText: 'text-red-700 dark:text-red-200'
        };
    }
    if (score < 75) {
        return {
            background: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30',
            assessmentText: 'text-yellow-800 dark:text-yellow-200',
            meter: 'stroke-yellow-500',
            scoreText: 'text-yellow-700 dark:text-yellow-200'
        };
    }
    return {
        background: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30',
        assessmentText: 'text-green-800 dark:text-green-200',
        meter: 'stroke-green-500',
        scoreText: 'text-green-700 dark:text-green-200'
    };
};

const ConfidenceMeter: React.FC<{ score: number; meterColor: string; textColor: string }> = ({ score, meterColor, textColor }) => {
    const radius = 52;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center w-48 h-48">
            <svg className="absolute w-full h-full" viewBox="0 0 120 120">
                <circle
                    className="text-gray-200 dark:text-slate-700"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="60"
                    cy="60"
                />
                <circle
                    className={`${meterColor} transition-all duration-1000 ease-out`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="60"
                    cy="60"
                    transform="rotate(-90 60 60)"
                />
            </svg>
            <div className="flex flex-col items-center">
                <span className={`text-5xl font-extrabold ${textColor}`}>{Math.round(score)}</span>
                <span className={`text-sm font-semibold opacity-70 ${textColor}`}>SCORE</span>
            </div>
        </div>
    );
};


export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedback, onStartOver, onAnswerAnother, documentType }) => {
  const { background, assessmentText, meter, scoreText } = getConfidenceColors(feedback.confidence);
  const analysisTitle = documentType === DocumentType.QUESTION_PAPER ? "Standard Comparison" : "Content Analysis";

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12">
      <div className={`border rounded-2xl shadow-xl p-8 flex flex-col items-center text-center transition-all duration-500 ${background}`}>
        <h2 className="text-2xl font-bold text-light-text dark:text-white mb-6 uppercase tracking-wider">Evaluation Report</h2>
        <ConfidenceMeter score={feedback.confidence} meterColor={meter} textColor={scoreText} />
        <p className={`mt-8 text-lg md:text-xl font-medium max-w-xl leading-snug ${assessmentText}`}>{feedback.assessment}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeedbackCard title={analysisTitle} icon={<DocumentComparisonIcon className="w-6 h-6" />} className="md:col-span-2">
            <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-100 dark:border-slate-700 italic">
                {feedback.comparison}
            </div>
        </FeedbackCard>

        {feedback.sources && feedback.sources.length > 0 && (
            <FeedbackCard title="Verified Sources" icon={<LinkIcon className="w-6 h-6" />} className="md:col-span-2">
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feedback.sources.map((source, index) => (
                        <li key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-900/30 rounded-lg border border-gray-100 dark:border-slate-700/50">
                            <LinkIcon className="w-4 h-4 flex-shrink-0 text-primary-500" />
                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline dark:text-primary-400 truncate">
                                {source.title}
                            </a>
                        </li>
                    ))}
                </ul>
            </FeedbackCard>
        )}
        
        <FeedbackCard title="Model Answer A" icon={<LightBulbIcon className="w-6 h-6" />}>
          <div className="text-sm sm:text-base">{feedback.suggestion1}</div>
        </FeedbackCard>

        <FeedbackCard title="Model Answer B" icon={<LightBulbIcon className="w-6 h-6" />}>
          <div className="text-sm sm:text-base">{feedback.suggestion2}</div>
        </FeedbackCard>
      </div>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
        <button
          onClick={onAnswerAnother}
          className="px-8 py-4 w-full sm:w-auto text-base font-bold text-center text-primary-700 bg-primary-100 rounded-xl hover:bg-primary-200 focus:ring-4 focus:ring-primary-300 dark:bg-primary-900/60 dark:text-primary-300 dark:hover:bg-primary-900 transition-all hover:scale-105"
        >
          Try Another Question
        </button>
        <button
          onClick={onStartOver}
          className="px-8 py-4 w-full sm:w-auto text-base font-bold text-center text-white bg-primary-600 rounded-xl hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 transition-all hover:scale-105 shadow-lg shadow-primary-500/20"
        >
          Upload New Document
        </button>
      </div>
    </div>
  );
};