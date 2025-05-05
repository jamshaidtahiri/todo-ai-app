import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

type Reminder = {
  id: string;
  time: number;
  notified: boolean;
  type: 'absolute' | 'relative';
};

type ReminderConfigProps = {
  reminders: Reminder[] | undefined;
  dueDate?: number;
  onChange: (reminders: Reminder[] | undefined) => void;
  className?: string;
};

export default function ReminderConfig({ reminders, dueDate, onChange, className = '' }: ReminderConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reminderType, setReminderType] = useState<'absolute' | 'relative'>('absolute');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [relativeHours, setRelativeHours] = useState(24); // Default 24 hours before due date
  
  const configRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (configRef.current && !configRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const formatReminder = (reminder: Reminder): string => {
    const reminderDate = new Date(reminder.time);
    
    if (reminder.type === 'absolute') {
      return reminderDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } else {
      // Calculate hours before due date
      if (!dueDate) return 'Invalid reminder';
      
      const hoursDiff = Math.round((dueDate - reminder.time) / (1000 * 60 * 60));
      return `${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''} before due date`;
    }
  };
  
  const addReminder = () => {
    if (reminderType === 'absolute') {
      if (!reminderDate || !reminderTime) return;
      
      // Combine date and time
      const dateTime = new Date(`${reminderDate}T${reminderTime}`);
      if (isNaN(dateTime.getTime())) return;
      
      const newReminder: Reminder = {
        id: uuidv4(),
        time: dateTime.getTime(),
        notified: false,
        type: 'absolute'
      };
      
      console.log('Adding absolute reminder:', {
        dateString: `${reminderDate}T${reminderTime}`,
        timestamp: dateTime.getTime(),
        formattedTime: new Date(dateTime).toLocaleString()
      });
      
      onChange([...(reminders || []), newReminder]);
      
      // Reset form
      setReminderDate('');
      setReminderTime('');
    } else {
      // Relative reminder
      if (!dueDate || relativeHours <= 0) return;
      
      const reminderTime = dueDate - (relativeHours * 60 * 60 * 1000);
      
      const newReminder: Reminder = {
        id: uuidv4(),
        time: reminderTime,
        notified: false,
        type: 'relative'
      };
      
      console.log('Adding relative reminder:', {
        dueDate: new Date(dueDate).toLocaleString(),
        hoursBeforeDue: relativeHours,
        reminderTime: new Date(reminderTime).toLocaleString()
      });
      
      onChange([...(reminders || []), newReminder]);
      
      // Reset form
      setRelativeHours(24);
    }
    
    // Close popup after adding
    setIsOpen(false);
  };
  
  const removeReminder = (id: string) => {
    const updatedReminders = reminders?.filter(r => r.id !== id) || [];
    onChange(updatedReminders.length ? updatedReminders : undefined);
  };
  
  // Format date for input
  const getFormattedDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Format time for input (default to current time rounded to next 30 min)
  const getFormattedTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = now.getMinutes() < 30 ? '30' : '00';
    return `${hours}:${minutes}`;
  };
  
  return (
    <div className={`relative ${className}`} ref={configRef}>
      <div 
        className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {reminders && reminders.length > 0 ? (
          <span className="flex items-center">
            {reminders.length} reminder{reminders.length !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Set reminder</span>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-2 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 w-72 max-w-[calc(100vw-2rem)] transform-gpu overflow-auto max-h-[400px]" style={{ 
          left: 'auto', 
          right: 0,
          top: '100%'
        }}>
          {reminders && reminders.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current reminders</h3>
              <ul className="space-y-2">
                {reminders.map(reminder => (
                  <li key={reminder.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700 rounded text-xs">
                    <span className="text-gray-700 dark:text-gray-300">{formatReminder(reminder)}</span>
                    <button 
                      onClick={() => removeReminder(reminder.id)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Add new reminder</h3>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setReminderType('absolute')}
                className={`flex-1 py-1 text-xs rounded-md ${
                  reminderType === 'absolute' 
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                Specific time
              </button>
              <button
                onClick={() => setReminderType('relative')}
                className={`flex-1 py-1 text-xs rounded-md ${
                  reminderType === 'relative' 
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
                disabled={!dueDate}
                title={!dueDate ? 'Set a due date first' : ''}
              >
                Before due date
              </button>
            </div>
            
            {reminderType === 'absolute' ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input 
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    min={getFormattedDate()}
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Time</label>
                  <input 
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                  Remind me before due date
                </label>
                <div className="flex items-center">
                  <input 
                    type="number"
                    value={relativeHours}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value > 0) {
                        setRelativeHours(value);
                      }
                    }}
                    min="1"
                    className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-700 dark:text-white"
                  />
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">hours</span>
                </div>
              </div>
            )}
            
            <button
              onClick={addReminder}
              disabled={(reminderType === 'absolute' && (!reminderDate || !reminderTime)) || 
                       (reminderType === 'relative' && (!dueDate || relativeHours <= 0))}
              className="w-full py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add Reminder
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 