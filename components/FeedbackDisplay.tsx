import React from 'react';
import type { Feedback } from '../types';
import { DocumentComparisonIcon, LightBulbIcon } from './IconComponents';

interface FeedbackDisplayProps {
  feedback: Feedback;
  onStartOver: () => void;
  onAnswerAnother: () => void;
}

const FeedbackCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm p-6 ${className}`}>
        <div className="flex items-center mb-4">
            <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 rounded-full p-2">
                {icon}
            </div>
            <h3 className="ml-4 text-xl font-bold text-light-text dark:text-white">{title}</h3>
        </div>
        <div className="text-gray-600 dark:text-gray-300 space-y-4 prose prose-base dark:prose-invert max-w-none">
            {children}
        </div>
    </div>
);

const getConfidenceColors = (score: number) => {
    if (score < 50) {
        return {
            background: 'bg-red-50 dark:bg-slate-800/50 border-red-200 dark:border-red-800',
            assessmentText: 'text-red-800 dark:text-red-200',
            meter: 'stroke-red-500',
            scoreText: 'text-red-700 dark:text-red-200'
        };
    }
    if (score < 75) {
        return {
            background: 'bg-yellow-50 dark:bg-slate-800/50 border-yellow-200 dark:border-yellow-800',
            assessmentText: 'text-yellow-800 dark:text-yellow-200',
            meter: 'stroke-yellow-500',
            scoreText: 'text-yellow-700 dark:text-yellow-200'
        };
    }
    return {
        background: 'bg-green-50 dark:bg-slate-800/50 border-green-200 dark:border-green-800',
        assessmentText: 'text-green-800 dark:text-green-200',
        meter: 'stroke-green-500',
        scoreText: 'text-green-700 dark:text-green-200'
    };
};

const ConfidenceMeter: React.FC<{ score: number; meterColor: string; textColor: string }> = ({ score, meterColor, textColor }) => {
    const radius = 52;
    const strokeWidth = 12; // A bit thicker
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center w-56 h-56">
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
            <span className={`text-6xl font-extrabold ${textColor}`}>{score}<span className="text-4xl font-medium">%</span></span>
        </div>
    );
};


export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedback, onStartOver, onAnswerAnother }) => {
  const { background, assessmentText, meter, scoreText } = getConfidenceColors(feedback.confidence);

  return (
    <div className="w-full space-y-8 animate-fade-in">
      <div className={`border rounded-xl shadow-lg p-6 sm:p-8 flex flex-col items-center text-center transition-colors duration-300 ${background}`}>
        <h2 className="text-3xl font-bold text-light-text dark:text-white mb-6">Feedback Report</h2>
        <ConfidenceMeter score={feedback.confidence} meterColor={meter} textColor={scoreText} />
        <p className={`mt-6 text-xl md:text-2xl font-medium max-w-2xl ${assessmentText}`}>{feedback.assessment}</p>
      </div>

      <FeedbackCard title="Comparison Analysis" icon={<DocumentComparisonIcon className="w-6 h-6" />}>
        <p>{feedback.comparison}</p>
      </FeedbackCard>
      
      <FeedbackCard title="Suggested Answer #1" icon={<LightBulbIcon className="w-6 h-6" />}>
        <p>{feedback.suggestion1}</p>
      </FeedbackCard>

      <FeedbackCard title="Suggested Answer #2" icon={<LightBulbIcon className="w-6 h-6" />}>
        <p>{feedback.suggestion2}</p>
      </FeedbackCard>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
        <button
          onClick={onAnswerAnother}
          className="px-8 py-3 w-full sm:w-auto text-base font-medium text-center text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 focus:ring-4 focus:ring-primary-300 dark:bg-primary-900/80 dark:text-primary-300 dark:hover:bg-primary-900 transition-colors"
        >
          Answer Another Question
        </button>
        <button
          onClick={onStartOver}
          className="px-8 py-3 w-full sm:w-auto text-base font-medium text-center text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 transition-colors"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};