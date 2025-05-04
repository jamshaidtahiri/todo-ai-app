import { useState } from 'react';
import { getTagColor, formatRelativeTime } from '../utils/helpers';

type TaskProps = {
  id: string;
  text: string;
  done: boolean;
  tag: string;
  createdAt?: number;
  priority?: 'high' | 'medium' | 'low';
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function Task({ id, text, done, tag, createdAt, priority, onToggle, onDelete }: TaskProps) {
  const [isHovering, setIsHovering] = useState(false);
  
  const getPriorityColor = (priority?: string) => {
    if (!priority) return '';
    
    const priorityColors: Record<string, string> = {
      'high': 'border-l-4 border-red-500',
      'medium': 'border-l-4 border-yellow-500',
      'low': 'border-l-4 border-green-500'
    };
    
    return priorityColors[priority] || '';
  };
  
  const priorityClass = getPriorityColor(priority);
  
  return (
    <li 
      className={`bg-white border rounded-lg shadow-sm p-4 flex items-center gap-3 transition-all duration-300 ${
        done ? 'opacity-60' : 'hover:shadow-md'
      } ${isHovering ? 'border-gray-300' : 'border-gray-200'} animate-fade-in ${priorityClass}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="checkbox-container">
        <input 
          type="checkbox" 
          id={`task-${id}`}
          checked={done} 
          onChange={() => onToggle(id)} 
          className="checkbox"
        />
        <span className="checkmark">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 1L3.5 6.5L1 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-gray-900 ${done ? 'line-through text-gray-500' : ''}`}>
          {text}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {tag && (
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${getTagColor(tag)}`}>
              #{tag}
            </span>
          )}
          {priority && (
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
              priority === 'high' ? 'bg-red-100 text-red-800' :
              priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {priority === 'high' ? '!urgent' : priority === 'medium' ? '!medium' : '!low'}
            </span>
          )}
          {createdAt && (
            <span className="text-xs text-gray-400">
              {formatRelativeTime(createdAt)}
            </span>
          )}
        </div>
      </div>
      
      <button 
        onClick={() => onDelete(id)}
        className={`text-gray-400 hover:text-red-500 transition-colors ${isHovering ? 'opacity-100' : 'opacity-70'}`}
        aria-label="Delete task"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </button>
    </li>
  );
} 