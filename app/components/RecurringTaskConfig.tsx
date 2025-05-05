import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

type RecurringConfigProps = {
  config: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    daysOfWeek?: number[];
    endDate?: number;
  } | undefined;
  onChange: (config: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    daysOfWeek?: number[];
    endDate?: number;
  } | undefined) => void;
  className?: string;
  darkMode?: boolean;
};

export default function RecurringTaskConfig({ config, onChange, className = '', darkMode = false }: RecurringConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  
  // Set up portal root when component mounts
  useEffect(() => {
    setPortalRoot(document.body);
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (configRef.current && !configRef.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Calculate the position of the dropdown based on available space
  useEffect(() => {
    if (isOpen && configRef.current && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const configEl = configRef.current;
      
      // Position the popup
      configEl.style.position = 'fixed';
      configEl.style.zIndex = '9999';
      
      // Set initial position below the button
      configEl.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
      configEl.style.left = `${buttonRect.left + window.scrollX}px`;
      
      // Get the dropdown dimensions
      const dropdownRect = configEl.getBoundingClientRect();
      
      // Check if there's enough space below
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      if (spaceBelow < dropdownRect.height) {
        configEl.style.top = `${buttonRect.top + window.scrollY - dropdownRect.height - 5}px`;
      }
      
      // Check if there's enough space to the right
      const spaceRight = window.innerWidth - buttonRect.left;
      if (spaceRight < dropdownRect.width) {
        configEl.style.left = `${buttonRect.right + window.scrollX - dropdownRect.width}px`;
      }
    }
  }, [isOpen]);
  
  const handleTypeChange = (type: 'daily' | 'weekly' | 'monthly' | 'custom') => {
    onChange({
      type,
      interval: 1,
      daysOfWeek: type === 'weekly' ? [1] : undefined, // Monday by default
      endDate: config?.endDate
    });
  };
  
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const interval = parseInt(e.target.value);
    if (isNaN(interval) || interval < 1) return;
    
    onChange({
      ...config!,
      interval
    });
  };
  
  const toggleDayOfWeek = (day: number) => {
    if (!config) return;
    
    const newDaysOfWeek = [...(config.daysOfWeek || [])];
    const index = newDaysOfWeek.indexOf(day);
    
    if (index === -1) {
      newDaysOfWeek.push(day);
    } else {
      newDaysOfWeek.splice(index, 1);
    }
    
    onChange({
      ...config,
      daysOfWeek: newDaysOfWeek.length ? newDaysOfWeek : [1] // Default to Monday if all days are removed
    });
  };
  
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!config) return;
    
    const dateString = e.target.value;
    const endDate = dateString ? new Date(dateString).getTime() : undefined;
    
    onChange({
      ...config,
      endDate
    });
  };
  
  const formatRecurringText = () => {
    if (!config) return 'Set recurring';
    
    const { type, interval, daysOfWeek } = config;
    
    if (type === 'daily') {
      return interval === 1 ? 'Daily' : `Every ${interval} days`;
    } else if (type === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayNames = daysOfWeek?.map(d => days[d]).join(', ');
      
      return interval === 1 
        ? `Weekly on ${dayNames}` 
        : `Every ${interval} weeks on ${dayNames}`;
    } else if (type === 'monthly') {
      return interval === 1 ? 'Monthly' : `Every ${interval} months`;
    } else {
      return 'Custom';
    }
  };
  
  // Convert timestamp to YYYY-MM-DD format for input
  const getEndDateValue = () => {
    if (!config?.endDate) return '';
    
    const d = new Date(config.endDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Render the popup content
  const renderPopup = () => {
    if (!isOpen) return null;
    
    const content = (
      <div 
        ref={configRef}
        className="fixed mt-2 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 w-64 max-w-[calc(100vw-2rem)] transform-gpu overflow-auto max-h-[400px]"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Repeat
            </label>
            <select 
              value={config?.type || 'daily'}
              onChange={(e) => handleTypeChange(e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-slate-700 dark:text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Repeat every
            </label>
            <div className="flex items-center">
              <input 
                type="number"
                min="1"
                value={config?.interval || 1}
                onChange={handleIntervalChange}
                className="block w-16 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-slate-700 dark:text-white"
              />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {config?.type === 'daily' ? 'days' : 
                config?.type === 'weekly' ? 'weeks' : 
                config?.type === 'monthly' ? 'months' : 'interval'}
              </span>
            </div>
          </div>
          
          {config?.type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                On days
              </label>
              <div className="flex flex-wrap gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <button
                    key={index}
                    onClick={() => toggleDayOfWeek(index)}
                    className={`w-8 h-8 rounded-full text-xs flex items-center justify-center
                              ${config.daysOfWeek?.includes(index) 
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' 
                                : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ends (optional)
            </label>
            <input 
              type="date" 
              value={getEndDateValue()}
              onChange={handleEndDateChange}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-slate-700 dark:text-white"
            />
          </div>
          
          <div className="pt-2 flex justify-between">
            <button 
              onClick={() => onChange(undefined)}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    );
    
    // Render using portal so it appears outside any container constraints
    return portalRoot ? createPortal(content, portalRoot) : null;
  };
  
  return (
    <div className={`relative ${className}`}>
      <div 
        ref={buttonRef}
        className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-md p-1 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close recurring menu" : "Open recurring menu"}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(!isOpen);
            e.preventDefault();
          }
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {config ? (
          <span className="flex items-center">
            {formatRecurringText()}
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                onChange(undefined); 
              }}
              className="ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Set recurring</span>
        )}
      </div>
      
      {renderPopup()}
    </div>
  );
} 