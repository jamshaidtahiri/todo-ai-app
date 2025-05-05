interface TaskDueDateProps {
  dueDate: number;
  status: 'pending' | 'completed' | 'archived';
}

export const TaskDueDate = ({ dueDate, status }: TaskDueDateProps) => {
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
    <span className={`px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 rounded text-xs flex items-center ${
      isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : ''
    }`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className={`text-xs ${colorClass}`}>
        {text}
      </span>
    </span>
  );
}; 