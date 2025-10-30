import React from 'react';
import type { Question } from '../types';
import { CheckCircleIcon } from './IconComponents';

interface QuestionSelectionProps {
  questions: Question[];
  onSelectQuestion: (index: number) => void;
}

const getScoreColor = (score: number) => {
    if (score < 50) {
        return { text: 'text-red-500 dark:text-red-400' };
    }
    if (score < 75) {
        return { text: 'text-yellow-500 dark:text-yellow-400' };
    }
    return { text: 'text-green-500 dark:text-green-400' };
};


export const QuestionSelection: React.FC<QuestionSelectionProps> = ({ questions, onSelectQuestion }) => {
  return (
    <div className="w-full space-y-4">
      <h2 className="text-2xl font-semibold text-center text-light-text dark:text-white">
        Choose a Question to Answer
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {questions.map((q, index) => (
          <button
            key={index}
            onClick={() => onSelectQuestion(index)}
            className="w-full text-left p-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-lg hover:border-primary-500 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:-translate-y-1"
          >
            <div className="flex justify-between items-center gap-4">
                <p className="flex-grow font-serif italic text-lg text-gray-700 dark:text-gray-200">"{q.text}"</p>
                {q.feedback && (
                  <div className="flex-shrink-0 flex items-center gap-2" aria-label={`Score: ${q.feedback.confidence}%`}>
                    <CheckCircleIcon className={`w-7 h-7 ${getScoreColor(q.feedback.confidence).text}`} />
                    <span className={`text-xl font-bold ${getScoreColor(q.feedback.confidence).text}`}>
                      {q.feedback.confidence}%
                    </span>
                  </div>
                )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
