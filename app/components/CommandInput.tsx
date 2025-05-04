import React from 'react';

type CommandInputProps = {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onAddTask: () => void;
  onCommand: () => void;
};

export default function CommandInput({
  input,
  isLoading,
  onInputChange,
  onKeyDown,
  onAddTask,
  onCommand
}: CommandInputProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 transition-all duration-300 transform hover:shadow-xl">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            &gt;
          </span>
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-gray-50 border border-gray-200 p-4 pl-8 pr-16 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Type a command (e.g., add buy milk #errand)"
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
            onClick={onAddTask}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-70"
          >
            Add/Execute
          </button>
          <button
            onClick={() => onInputChange('help')}
            disabled={isLoading}
            className="bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-all shadow-sm hover:shadow-md disabled:opacity-70"
          >
            Help
          </button>
        </div>
      </div>
    </div>
  );
} 