import React from 'react';

type ProgressBarProps = {
  total: number;
  completed: number;
};

export default function ProgressBar({ total, completed }: ProgressBarProps) {
  if (total === 0) return null;
  
  const percentage = (completed / total) * 100;
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 mb-4 flex justify-between items-center animate-fade-in">
      <p className="text-gray-500 text-sm">
        {completed} of {total} tasks completed
        {percentage === 100 && '🎉'}
      </p>
      
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            percentage === 100 
              ? 'bg-green-500' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600'
          }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
} 