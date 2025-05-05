import { useState } from 'react';
import { getTagColor, formatRelativeTime } from '../utils/helpers';
import DatePicker from './DatePicker';
import RecurringTaskConfig from './RecurringTaskConfig';
import ReminderManager from './ReminderManager';
import TaskNotes from './TaskNotes';
import SubtaskList from './SubtaskList';
import { motion } from 'framer-motion';
import { TaskTag } from './TaskTag';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskDueDate } from './TaskDueDate';

export type TaskProps = {
  task: {
    id: string;
    text: string;
    done: boolean;
    tag?: string;  // Keep for backward compatibility
    tags?: string[]; // New field for multiple tags
    createdAt: number;
    priority?: 'high' | 'medium' | 'low';
    status: 'pending' | 'completed' | 'archived';
    dueDate?: number;
    notes?: string;
    subtasks?: {
      id: string;
      text: string;
      done: boolean;
    }[];
    recurring?: {
      type: 'daily' | 'weekly' | 'monthly' | 'custom';
      interval: number;
      daysOfWeek?: number[];
      endDate?: number;
    };
    reminders?: {
      id: string;
      time: number;
      notified: boolean;
      type: 'absolute' | 'relative';
    }[];
    project?: string;
    category?: string;
  };
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
  darkMode?: boolean;
  categories?: { id: string; name: string; color: string }[];
};

export default function Task({ 
  task,
  onToggle, 
  onDelete,
  onUpdate,
  darkMode = false,
  categories
}: TaskProps) {
  const {
    id,
    text,
    done,
    tag,
    tags = [],
    createdAt,
    priority,
    status,
    dueDate,
    notes,
    subtasks,
    recurring,
    reminders,
    project,
    category
  } = task;
  
  // Combine old tag and new tags array for backward compatibility
  const allTags = [...new Set([...(tag ? [tag] : []), ...(tags || [])])];
  
  const [isHovering, setIsHovering] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
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
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as 'pending' | 'completed' | 'archived';
    onUpdate(id, { status: newStatus });
    if (newStatus === 'completed' && !done) {
      onToggle(id); // Mark as done if status changes to completed
    }
  };
  
  const handleDueDateChange = (date: number | undefined) => {
    onUpdate(id, { dueDate: date });
  };
  
  const handleRecurringChange = (config: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    daysOfWeek?: number[];
    endDate?: number;
  } | undefined) => {
    onUpdate(id, { recurring: config });
  };
  
  const handleReminderChange = (reminderConfig: {
    id: string;
    time: number;
    notified: boolean;
    type: 'absolute' | 'relative';
  }[] | undefined) => {
    onUpdate(id, { reminders: reminderConfig });
  };
  
  const handleNotesChange = (updatedNotes: string | undefined) => {
    onUpdate(id, { notes: updatedNotes });
  };
  
  const handleSubtasksChange = (updatedSubtasks: {
    id: string;
    text: string;
    done: boolean;
  }[] | undefined) => {
    onUpdate(id, { subtasks: updatedSubtasks });
  };
  
  // Calculate completion percentage of subtasks
  const getSubtaskCompletion = () => {
    if (!subtasks || subtasks.length === 0) return null;
    
    const doneCount = subtasks.filter(s => s.done).length;
    const percentage = Math.round((doneCount / subtasks.length) * 100);
    
    return (
      <div className="flex items-center gap-1">
        <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-500 rounded-full" 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5 }}
          ></motion.div>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{percentage}%</span>
      </div>
    );
  };
  
  const isDueSoon = () => {
    if (!dueDate) return false;
    
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    return dueDate - now < oneDay && dueDate > now && status !== 'completed';
  };
  
  return (
    <motion.li 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`bg-white dark:bg-slate-800 border rounded-lg shadow-sm transition-all duration-300 ${
        done ? 'opacity-60' : 'hover:shadow-md'
      } ${isHovering ? 'border-gray-300 dark:border-slate-600' : 'border-gray-200 dark:border-slate-700'} ${priorityClass}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="p-4 flex items-center gap-3">
        <div className="checkbox-container">
          <input 
            type="checkbox" 
            id={`task-${id}`}
            checked={done} 
            onChange={() => onToggle(id)} 
            className="checkbox sr-only"
          />
          <label 
            htmlFor={`task-${id}`} 
            className={`checkmark flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border ${
              done ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {done && (
              <motion.svg 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                width="10" 
                height="8" 
                viewBox="0 0 10 8" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9 1L3.5 6.5L1 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </motion.svg>
            )}
          </label>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={`text-gray-900 dark:text-white font-medium ${done ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                {text}
              </p>
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 rounded-full"
              aria-label={isExpanded ? "Show less" : "Show more"}
            >
              <motion.svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5"
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {allTags.length > 0 && allTags.map((tagText, index) => (
              <TaskTag key={`${id}-tag-${index}`} tag={tagText} />
            ))}
            
            {category && categories?.length && (
              <span 
                className="px-2 py-1 text-white rounded text-xs flex items-center"
                style={{ 
                  backgroundColor: categories.find(c => c.id === category)?.color || '#3B82F6'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {categories.find(c => c.id === category)?.name || 'Category'}
              </span>
            )}
            
            {priority && <TaskPriorityBadge priority={priority} />}
            
            {dueDate && <TaskDueDate dueDate={dueDate} status={status} />}
            
            {recurring && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {recurring.type}
              </span>
            )}
            
            {reminders && reminders.length > 0 && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {reminders.length} reminder{reminders.length !== 1 ? 's' : ''}
              </span>
            )}
            
            {getSubtaskCompletion()}
            
            {createdAt && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatRelativeTime(createdAt)}
              </span>
            )}
            
            {isDueSoon() && (
              <motion.span 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
                className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              >
                Due soon
              </motion.span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <select
            value={status}
            onChange={handleStatusChange}
            className="text-xs border border-gray-200 dark:border-slate-600 rounded p-1 bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          
          <button 
            onClick={() => onDelete(id)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 p-1"
            aria-label="Delete task"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-slate-700 mt-1 overflow-hidden relative z-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3 relative">
            <DatePicker 
              date={dueDate} 
              onChange={handleDueDateChange} 
            />
            
            <RecurringTaskConfig
              config={recurring}
              onChange={handleRecurringChange}
            />
          </div>
          
          <div className="my-3 relative">
            <ReminderManager
              reminders={reminders}
              dueDate={dueDate}
              onChange={handleReminderChange}
            />
          </div>
          
          <div className="my-3">
            <TaskNotes
              notes={notes}
              onChange={handleNotesChange}
            />
          </div>
          
          <div className="mt-4">
            <SubtaskList
              taskId={id}
              subtasks={subtasks}
              onChange={handleSubtasksChange}
            />
          </div>
        </motion.div>
      )}
    </motion.li>
  );
} 