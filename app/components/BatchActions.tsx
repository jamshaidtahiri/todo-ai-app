import React, { useState } from 'react';

type BatchActionsProps = {
  onBatchComplete: () => void;
  onBatchDelete: () => void;
  onBatchTag: (tag: string) => void;
  taskCount: number;
};

export default function BatchActions({ 
  onBatchComplete, 
  onBatchDelete, 
  onBatchTag,
  taskCount 
}: BatchActionsProps) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagValue, setTagValue] = useState('');
  
  const handleTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagValue.trim()) {
      onBatchTag(tagValue.trim());
      setTagValue('');
      setShowTagInput(false);
    }
  };
  
  if (taskCount === 0) return null;
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-700 mr-2">
          <span className="font-medium">{taskCount} task{taskCount !== 1 ? 's' : ''}</span> in current view
        </p>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={onBatchComplete}
            className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
          >
            Complete all
          </button>
          
          {!showTagInput ? (
            <button 
              onClick={() => setShowTagInput(true)}
              className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
            >
              Tag all
            </button>
          ) : (
            <form onSubmit={handleTagSubmit} className="flex">
              <input
                type="text"
                value={tagValue}
                onChange={(e) => setTagValue(e.target.value)}
                placeholder="Tag name"
                className="text-xs py-1 px-2 border rounded-l w-20 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button 
                type="submit"
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded-r hover:bg-blue-600"
              >
                Set
              </button>
              <button 
                type="button"
                onClick={() => setShowTagInput(false)}
                className="text-xs px-1 py-1 ml-1 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </form>
          )}
          
          <button 
            onClick={onBatchDelete}
            className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
          >
            Delete all
          </button>
        </div>
      </div>
    </div>
  );
} 