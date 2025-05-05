import React, { useState } from 'react';

export type CommandInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isLoading: boolean;
  placeholder?: string;
  useNaturalLanguage?: boolean;
};

export default function CommandInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = "Type a command (e.g., add buy milk #errand)",
  useNaturalLanguage = true
}: CommandInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      onSubmit(value);
    }
  };

  const naturalLanguagePlaceholder = "Try natural language: 'Call mom tomorrow at 5pm #family !high'";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 transition-all duration-300 transform hover:shadow-xl">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
            &gt;
          </span>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 p-4 pl-8 pr-16 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
            placeholder={useNaturalLanguage ? naturalLanguagePlaceholder : placeholder}
            disabled={isLoading}
          />
          {isLoading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSubmit(value)}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-70"
          >
            Add/Execute
          </button>
          <button
            onClick={() => onChange('help')}
            disabled={isLoading}
            className="bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-all shadow-sm hover:shadow-md disabled:opacity-70"
          >
            Help
          </button>
        </div>
        {useNaturalLanguage && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
            Now with natural language understanding! Try typing full sentences like "Remind me to call mom tomorrow at 5pm"
          </div>
        )}
      </div>
    </div>
  );
} 