import { useState } from 'react';
import { getTagColor, formatRelativeTime } from '../utils/helpers';
import DatePicker from './DatePicker';
import RecurringTaskConfig from './RecurringTaskConfig';
import ReminderConfig from './ReminderConfig';
import TaskNotes from './TaskNotes';
import SubtaskList from './SubtaskList';

type TaskProps = {
  id: string;
  text: string;
  done: boolean;
  tag: string;
  createdAt?: number;
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
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<TaskProps>) => void;
};

export default function Task({ 
  id, 
  text, 
  done, 
  tag, 
  createdAt, 
  priority, 
  status,
  dueDate,
  notes,
  subtasks,
  recurring,
  reminders,
  project,
  onToggle, 
  onDelete,
  onUpdate = () => {} 
}: TaskProps) {
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
  
  // Format due date with color based on proximity
  const formatDueDate = () => {
    if (!dueDate) return null;
    
    const now = Date.now();
    const isOverdue = dueDate < now && status !== 'completed';
    const isToday = new Date(dueDate).toDateString() === new Date().toDateString();
    const isTomorrow = new Date(dueDate).toDateString() === new Date(now + 86400000).toDateString();
    
    let text;
    if (isToday) {
      text = 'Today';
    } else if (isTomorrow) {
      text = 'Tomorrow';
    } else {
      text = new Date(dueDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    let colorClass;
    if (isOverdue) {
      colorClass = 'text-red-600';
    } else if (isToday) {
      colorClass = 'text-amber-600';
    } else {
      colorClass = 'text-blue-600';
    }
    
    return (
      <span className={`text-xs ${colorClass}`}>
        {text}
      </span>
    );
  };
  
  // Calculate completion percentage of subtasks
  const getSubtaskCompletion = () => {
    if (!subtasks || subtasks.length === 0) return null;
    
    const doneCount = subtasks.filter(s => s.done).length;
    const percentage = Math.round((doneCount / subtasks.length) * 100);
    
    return (
      <div className="flex items-center gap-1">
        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 rounded-full" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-500">{percentage}%</span>
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
    <li 
      className={`bg-white border rounded-lg shadow-sm transition-all duration-300 ${
        done ? 'opacity-60' : 'hover:shadow-md'
      } ${isHovering ? 'border-gray-300' : 'border-gray-200'} animate-fade-in ${priorityClass}`}
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
            className="checkbox"
          />
          <span className="checkmark">
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 1L3.5 6.5L1 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={`text-gray-900 ${done ? 'line-through text-gray-500' : ''}`}>
                {text}
              </p>
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-1 text-gray-400 hover:text-gray-600"
              aria-label={isExpanded ? "Show less" : "Show more"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
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
            
            {dueDate && formatDueDate()}
            
            {recurring && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recurring
              </span>
            )}
            
            {reminders && reminders.length > 0 && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {reminders.length} reminder{reminders.length !== 1 ? 's' : ''}
              </span>
            )}
            
            {getSubtaskCompletion()}
            
            {createdAt && (
              <span className="text-xs text-gray-400">
                {formatRelativeTime(createdAt)}
              </span>
            )}
            
            {isDueSoon() && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                Due soon
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <select
            value={status}
            onChange={handleStatusChange}
            className="text-xs border border-gray-200 rounded p-1 bg-white"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          
          <button 
            onClick={() => onDelete(id)}
            className={`text-gray-400 hover:text-red-500 transition-colors ${isHovering ? 'opacity-100' : 'opacity-70'}`}
            aria-label="Delete task"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-1">
          <div className="grid grid-cols-2 gap-4 my-3">
            <DatePicker 
              date={dueDate} 
              onChange={handleDueDateChange} 
            />
            
            <RecurringTaskConfig
              config={recurring}
              onChange={handleRecurringChange}
            />
          </div>
          
          <div className="my-3">
            <ReminderConfig
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
        </div>
      )}
    </li>
  );
} 