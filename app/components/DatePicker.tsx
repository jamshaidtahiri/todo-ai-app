import { useState, useEffect, useRef } from 'react';

type DatePickerProps = {
  date: number | undefined;
  onChange: (date: number | undefined) => void;
  className?: string;
  placeholder?: string;
};

export default function DatePicker({ date, onChange, className = '', placeholder = 'Set due date' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      // Convert YYYY-MM-DD to timestamp
      const timestamp = new Date(selectedDate).getTime();
      onChange(timestamp);
    } else {
      onChange(undefined);
    }
  };
  
  const handleClear = () => {
    onChange(undefined);
  };
  
  // Close datepicker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Convert timestamp to YYYY-MM-DD format for input
  const getInputValue = () => {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return (
    <div className={`relative ${className}`} ref={datePickerRef}>
      <div 
        className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {date ? (
          <span className="flex items-center">
            {formatDate(date)}
            <button 
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </span>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200">
          <input 
            type="date" 
            value={getInputValue()}
            onChange={handleDateChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          
          <div className="mt-3 flex justify-between">
            <button 
              onClick={() => {
                // Set to today
                onChange(Date.now());
                setIsOpen(false);
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Today
            </button>
            <button 
              onClick={() => {
                // Set to tomorrow
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                onChange(tomorrow.getTime());
                setIsOpen(false);
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Tomorrow
            </button>
            <button 
              onClick={() => {
                // Set to next week
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                onChange(nextWeek.getTime());
                setIsOpen(false);
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Next Week
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 