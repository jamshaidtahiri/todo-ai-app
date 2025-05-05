import { useState } from 'react';

type SubtaskProps = {
  id: string;
  text: string;
  done: boolean;
  taskId: string; // Parent task ID
  onToggle: (taskId: string, subtaskId: string) => void;
  onDelete: (taskId: string, subtaskId: string) => void;
  darkMode?: boolean;
};

export default function Subtask({ id, text, done, taskId, onToggle, onDelete, darkMode = false }: SubtaskProps) {
  const [isHovering, setIsHovering] = useState(false);
  
  return (
    <li 
      className={`py-1 pl-6 flex items-center gap-2 transition-all duration-200 
                text-sm ${done ? 'opacity-70' : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="checkbox-container scale-90">
        <input 
          type="checkbox" 
          id={`subtask-${id}`}
          checked={done} 
          onChange={() => onToggle(taskId, id)} 
          className="checkbox"
        />
        <span className="checkmark">
          <svg width="8" height="6" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 1L3.5 6.5L1 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      
      <span className={`flex-1 ${done ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
        {text}
      </span>
      
      <button 
        onClick={() => onDelete(taskId, id)}
        className={`text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors ${isHovering ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Delete subtask"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </li>
  );
} 