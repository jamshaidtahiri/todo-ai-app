import React, { useState, useEffect } from 'react';
import { getTagColor } from '../utils/helpers';

type Task = {
  id: string;
  text: string;
  done: boolean;
  tag: string;
  createdAt: number;
  priority?: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'archived';
  dueDate?: number;
};

type CalendarViewProps = {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
};

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendar, setCalendar] = useState<Array<Array<Date>>>([]);
  
  // Generate calendar data
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get the first day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get the day of the week of the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // Generate calendar days array
    const calendarDays: Array<Array<Date>> = [];
    let dayCounter = 1;
    let weekCounter = 0;
    
    // Create up to 6 weeks
    for (let week = 0; week < 6; week++) {
      calendarDays[week] = [];
      
      for (let day = 0; day < 7; day++) {
        if ((week === 0 && day < firstDayOfWeek) || dayCounter > daysInMonth) {
          // Empty cell or outside current month
          calendarDays[week][day] = new Date(0); // Invalid date to indicate empty cell
        } else {
          calendarDays[week][day] = new Date(year, month, dayCounter);
          dayCounter++;
        }
      }
      
      weekCounter++;
      if (dayCounter > daysInMonth && week < 5) break;
    }
    
    setCalendar(calendarDays);
  }, [currentMonth]);
  
  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  // Go to today's date
  const goToToday = () => {
    setCurrentMonth(new Date());
  };
  
  // Get tasks for a specific date
  const getTasksForDate = (date: Date): Task[] => {
    if (date.getTime() === 0) return []; // Empty cell
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= startOfDay && dueDate <= endOfDay;
    });
  };
  
  // Format month name
  const formatMonth = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold dark:text-white">{formatMonth(currentMonth)}</h2>
        <div className="flex space-x-2">
          <button 
            onClick={prevMonth}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 dark:text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button 
            onClick={goToToday}
            className="px-2 py-1 text-sm rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200"
          >
            Today
          </button>
          <button 
            onClick={nextMonth}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 dark:text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-600 rounded overflow-hidden">
        {/* Day names header */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium bg-gray-50 dark:bg-slate-700 dark:text-gray-200">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendar.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.map((date, dayIndex) => {
              const tasksForDay = getTasksForDate(date);
              const isEmptyCell = date.getTime() === 0;
              
              return (
                <div 
                  key={`${weekIndex}-${dayIndex}`}
                  className={`
                    bg-white dark:bg-slate-800 min-h-[110px] p-1 relative
                    ${isEmptyCell ? 'opacity-50' : ''}
                    ${isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  `}
                >
                  {!isEmptyCell && (
                    <>
                      <div className={`text-right p-1 ${isToday(date) ? 'font-bold' : ''} dark:text-white`}>
                        {date.getDate()}
                      </div>
                      <div className="mt-1 space-y-1 overflow-y-auto max-h-[70px]">
                        {tasksForDay.map(task => (
                          <div 
                            key={task.id}
                            onClick={() => onTaskClick(task.id)}
                            className={`
                              text-xs p-1 rounded cursor-pointer truncate
                              ${task.done ? 'line-through opacity-50' : ''}
                              ${task.priority === 'high' ? 'border-l-2 border-red-500' : ''}
                              ${task.priority === 'medium' ? 'border-l-2 border-yellow-500' : ''}
                              ${task.priority === 'low' ? 'border-l-2 border-green-500' : ''}
                              ${getTagColor(task.tag)}
                            `}
                          >
                            {task.text}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default CalendarView; 