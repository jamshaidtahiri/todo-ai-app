import React, { useState } from 'react';

export type BatchActionsProps = {
  onComplete: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onSort: () => void;
  sortCriteria: 'priority' | 'dueDate' | 'createdAt' | 'alphabetical';
  onToggleDarkMode: () => void;
  darkMode: boolean;
};

export default function BatchActions({ 
  onComplete,
  onArchive,
  onDelete,
  onSort,
  sortCriteria,
  onToggleDarkMode,
  darkMode
}: BatchActionsProps) {
  // Format sort criteria for display
  const getSortLabel = (criteria: string): string => {
    switch (criteria) {
      case 'priority': return 'Priority';
      case 'dueDate': return 'Due Date';
      case 'createdAt': return 'Created';
      case 'alphabetical': return 'Alphabetical';
      default: return criteria;
    }
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-3 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
          <button 
            onClick={onToggleDarkMode}
            className="text-xs px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          
          <button 
            onClick={onSort}
            className="text-xs px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            Sorted by: {getSortLabel(sortCriteria)}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={onComplete}
            className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
            Complete All
          </button>
          
          <button 
            onClick={onArchive}
            className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            Archive Completed
          </button>
          
          <button 
            onClick={onDelete}
            className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Delete Archived
          </button>
        </div>
      </div>
    </div>
  );
} 