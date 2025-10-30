import React from 'react';

interface GradeLevelSelectorProps {
  selectedGrade: string;
  onGradeChange: (grade: string) => void;
  disabled: boolean;
}

const gradeLevels = ["Grade 8", "Grade 9", "Grade 10", "Grade 12", "Grade 13", "Grade 14", "Grade 15"];

export const GradeLevelSelector: React.FC<GradeLevelSelectorProps> = ({ selectedGrade, onGradeChange, disabled }) => {
  return (
    <div className="w-full">
      <label htmlFor="grade-level" className="block mb-2 text-sm font-medium text-light-text dark:text-gray-300">
        1. Select Grade Level
      </label>
      <select
        id="grade-level"
        value={selectedGrade}
        onChange={(e) => onGradeChange(e.target.value)}
        disabled={disabled}
        className="bg-gray-50 border border-gray-300 text-light-text text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-slate-800 dark:border-slate-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 transition"
      >
        <option value="" disabled>Choose a grade level...</option>
        {gradeLevels.map((level) => (
          <option key={level} value={level}>{level}</option>
        ))}
      </select>
    </div>
  );
};