import { useState, useRef, useEffect } from 'react';

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
};

export default function RecurringTaskConfig({ config, onChange, className = '' }: RecurringConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
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
  
  return (
    <div className={`relative ${className}`} ref={configRef}>
      <div 
        className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900"
        onClick={() => setIsOpen(!isOpen)}
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
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </span>
        ) : (
          <span className="text-gray-500">Set recurring</span>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 w-64">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repeat
              </label>
              <select 
                value={config?.type || 'daily'}
                onChange={(e) => handleTypeChange(e.target.value as any)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repeat every
              </label>
              <div className="flex items-center">
                <input 
                  type="number"
                  min="1"
                  value={config?.interval || 1}
                  onChange={handleIntervalChange}
                  className="block w-16 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <span className="ml-2 text-sm text-gray-500">
                  {config?.type === 'daily' ? 'days' : 
                   config?.type === 'weekly' ? 'weeks' : 
                   config?.type === 'monthly' ? 'months' : 'interval'}
                </span>
              </div>
            </div>
            
            {config?.type === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  On days
                </label>
                <div className="flex flex-wrap gap-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <button
                      key={index}
                      onClick={() => toggleDayOfWeek(index)}
                      className={`w-8 h-8 rounded-full text-xs flex items-center justify-center
                                ${config.daysOfWeek?.includes(index) 
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' 
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ends (optional)
              </label>
              <input 
                type="date" 
                value={getEndDateValue()}
                onChange={handleEndDateChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            
            <div className="pt-2 flex justify-between">
              <button 
                onClick={() => onChange(undefined)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 