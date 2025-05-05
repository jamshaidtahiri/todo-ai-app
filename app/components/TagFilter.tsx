import React from 'react';
import { getTagColor } from '../utils/helpers';

export type TagFilterProps = {
  currentTag: string | null;
  tags: string[];
  onSelectTag: (tag: string | null) => void;
};

export default function TagFilter({ currentTag, tags, onSelectTag }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button 
        onClick={() => onSelectTag(null)}
        className={`text-xs px-3 py-1 rounded-full transition-all ${
          currentTag === null 
            ? 'bg-gray-800 dark:bg-gray-700 text-white' 
            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
        }`}
      >
        All
      </button>
      
      {tags.map(tag => (
        <button 
          key={tag} 
          onClick={() => onSelectTag(tag === currentTag ? null : tag)}
          className={`text-xs px-3 py-1 rounded-full transition-all ${
            tag === currentTag 
              ? 'bg-gray-800 dark:bg-gray-700 text-white' 
              : `${getTagColor(tag)} opacity-80 hover:opacity-100`
          }`}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
} 