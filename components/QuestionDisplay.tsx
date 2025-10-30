import React from 'react';

interface QuestionDisplayProps {
  question: string;
  isStreaming?: boolean;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, isStreaming }) => {
  return (
    <div className="w-full p-6 bg-white border border-gray-200 rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Your Essay Question:</h2>
      <blockquote className="border-l-4 border-primary-500 pl-4">
        <p className="text-xl italic font-serif text-gray-800 dark:text-gray-100 min-h-[2.5rem]">
          "{question}"
          {isStreaming && <span className="inline-block w-2 h-6 ml-1 bg-primary-500 animate-pulse" aria-hidden="true"></span>}
        </p>
      </blockquote>
    </div>
  );
};