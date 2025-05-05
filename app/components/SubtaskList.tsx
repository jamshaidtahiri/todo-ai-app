import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Subtask from './Subtask';

type SubtaskListProps = {
  taskId: string;
  subtasks: {
    id: string;
    text: string;
    done: boolean;
  }[] | undefined;
  onChange: (subtasks: {
    id: string;
    text: string;
    done: boolean;
  }[] | undefined) => void;
  className?: string;
  darkMode?: boolean;
};

export default function SubtaskList({ taskId, subtasks, onChange, className = '', darkMode = false }: SubtaskListProps) {
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const addSubtask = () => {
    if (!newSubtaskText.trim()) return;
    
    const newSubtask = {
      id: uuidv4(),
      text: newSubtaskText.trim(),
      done: false
    };
    
    onChange([...(subtasks || []), newSubtask]);
    setNewSubtaskText('');
    setIsAdding(false);
  };
  
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    if (!subtasks) return;
    
    const updatedSubtasks = subtasks.map(subtask => 
      subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask
    );
    
    onChange(updatedSubtasks);
  };
  
  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    if (!subtasks) return;
    
    const updatedSubtasks = subtasks.filter(subtask => subtask.id !== subtaskId);
    onChange(updatedSubtasks.length ? updatedSubtasks : undefined);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtask();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewSubtaskText('');
    }
  };
  
  return (
    <div className={className}>
      {subtasks && subtasks.length > 0 && (
        <ul className="mb-2">
          {subtasks.map(subtask => (
            <Subtask
              key={subtask.id}
              id={subtask.id}
              text={subtask.text}
              done={subtask.done}
              taskId={taskId}
              onToggle={handleToggleSubtask}
              onDelete={handleDeleteSubtask}
              darkMode={darkMode}
            />
          ))}
        </ul>
      )}
      
      {isAdding ? (
        <div className="flex items-center gap-2 pl-6">
          <input
            type="text"
            value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a subtask..."
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
            autoFocus
          />
          <button
            onClick={addSubtask}
            disabled={!newSubtaskText.trim()}
            className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
          >
            Add
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewSubtaskText('');
            }}
            className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 pl-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add subtask
        </button>
      )}
    </div>
  );
} 