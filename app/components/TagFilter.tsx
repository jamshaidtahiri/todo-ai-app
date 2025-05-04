import React from 'react';
import { getTagColor } from '../utils/helpers';

type TagFilterProps = {
  filterTag: string | null;
  tags: string[];
  onFilterChange: (tag: string | null) => void;
};

export default function TagFilter({ filterTag, tags, onFilterChange }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button 
        onClick={() => onFilterChange(null)}
        className={`text-xs px-3 py-1 rounded-full transition-all ${
          filterTag === null 
            ? 'bg-gray-800 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        All
      </button>
      
      {tags.map(tag => (
        <button 
          key={tag} 
          onClick={() => onFilterChange(tag === filterTag ? null : tag)}
          className={`text-xs px-3 py-1 rounded-full transition-all ${
            tag === filterTag 
              ? 'bg-gray-800 text-white' 
              : `${getTagColor(tag)} opacity-80 hover:opacity-100`
          }`}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
} 