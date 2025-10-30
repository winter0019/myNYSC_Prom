import React, { useState } from 'react';
import type { HistoryEntry } from '../types';
import { ChevronDownIcon, ExportIcon } from './IconComponents';

interface HistoryDisplayProps {
  history: HistoryEntry[];
}

const getScoreColor = (score: number) => {
    if (score < 50) return 'text-red-500 dark:text-red-400 border-red-200 dark:border-red-700';
    if (score < 75) return 'text-yellow-500 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
    return 'text-green-500 dark:text-green-400 border-green-300 dark:border-green-700';
};

export const HistoryDisplay: React.FC<HistoryDisplayProps> = ({ history }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = () => {
    const content = history
      .map((entry, index) => {
        return `
# Question ${index + 1}

> ${entry.question}

## Your Answer

${entry.answer.split('\n').map(line => `> ${line}`).join('\n')}

## Feedback

- **Score:** ${entry.feedback.confidence}%
- **Assessment:** ${entry.feedback.assessment}

### Comparison Analysis

${entry.feedback.comparison}

### Suggested Answer #1

${entry.feedback.suggestion1}

### Suggested Answer #2

${entry.feedback.suggestion2}
        `.trim();
      })
      .join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MyNYSC-prom-session-history.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="w-full border-t border-gray-200 dark:border-slate-700 pt-6 mt-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left p-4 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-expanded={isOpen}
        aria-controls="history-panel"
      >
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">Session History ({history.length} answered)</h3>
        <ChevronDownIcon className={`w-6 h-6 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div id="history-panel" className="mt-4 space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-primary-900/80 dark:text-primary-300 dark:hover:bg-primary-900 dark:focus:ring-offset-dark-background transition-colors"
                title="Export history as a Markdown file"
              >
              <ExportIcon className="w-4 h-4" />
              Export
            </button>
          </div>
          {history.map((entry, index) => (
            <div key={index} className="p-4 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="font-semibold text-light-text dark:text-dark-text italic font-serif pr-4">"{entry.question}"</p>
                <div className={`flex-shrink-0 text-lg font-bold p-2 rounded-md ${getScoreColor(entry.feedback.confidence)}`}>
                  {entry.feedback.confidence}%
                </div>
              </div>
              <details>
                  <summary className="text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">
                      View Your Answer
                  </summary>
                  <blockquote className="mt-2 pl-4 border-l-2 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400">
                    {entry.answer}
                  </blockquote>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};