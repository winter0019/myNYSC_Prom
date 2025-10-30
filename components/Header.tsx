import React from 'react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
    isDarkMode: boolean;
    onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDarkMode, onToggleTheme }) => {
  return (
    <header className="w-full max-w-5xl mx-auto p-4">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-light-text dark:text-dark-text tracking-tight">
                MyNYSC prom
            </h1>
            <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleTheme} />
        </div>
    </header>
  );
};