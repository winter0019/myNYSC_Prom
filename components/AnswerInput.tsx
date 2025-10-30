import React, { useState } from 'react';

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({ onSubmit, disabled }) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmit(answer);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
       <label htmlFor="answer-textarea" className="sr-only">Your Answer</label>
      <textarea
        id="answer-textarea"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Write your answer here..."
        className="w-full h-64 p-4 text-light-text bg-background border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:placeholder-gray-400 dark:text-dark-text dark:focus:ring-primary-500 dark:focus:border-primary-500 transition"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !answer.trim()}
        className="w-full px-5 py-3 text-base font-medium text-center text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 disabled:bg-primary-400 dark:disabled:bg-primary-800 dark:disabled:text-gray-400 disabled:cursor-not-allowed dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 transition-colors"
      >
        {disabled ? 'Evaluating...' : 'Submit for Feedback'}
      </button>
    </form>
  );
};