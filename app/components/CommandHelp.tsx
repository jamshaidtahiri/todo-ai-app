import { useEffect, useRef } from 'react';

export type CommandHelpProps = {
  onClose: () => void;
  onSelectCommand?: (command: string) => void;
};

export default function CommandHelp({ onClose, onSelectCommand }: CommandHelpProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  const handleCommandSelect = (command: string) => {
    if (onSelectCommand) {
      onSelectCommand(command);
    }
    onClose();
  };
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);
  
  const commands = [
    {
      category: 'Basic Commands',
      items: [
        { command: 'add Buy groceries', description: 'Add a new task' },
        { command: 'add Buy groceries #errand', description: 'Add task with a tag' },
        { command: 'add Buy milk !high', description: 'Add high priority task' },
        { command: 'tick buy milk', description: 'Mark task as done' },
        { command: 'delete groceries', description: 'Delete task containing "groceries"' },
      ]
    },
    {
      category: 'Advanced Commands',
      items: [
        { command: 'tag workout as fitness', description: 'Change task tag' },
        { command: 'priority report high', description: 'Set task priority' },
        { command: 'filter by work', description: 'Show only work tasks' },
        { command: 'due today groceries', description: 'Set due date to today' },
        { command: 'due tomorrow workout', description: 'Set due date to tomorrow' },
        { command: 'due next monday meeting', description: 'Set due date to specific day' },
      ]
    },
    {
      category: 'Batch Operations',
      items: [
        { command: 'tick all groceries', description: 'Complete all matching tasks' },
        { command: 'delete all work', description: 'Delete all matching tasks' },
        { command: 'archive completed', description: 'Archive all completed tasks' },
        { command: 'snooze workout 2 days', description: 'Postpone due date by 2 days' },
      ]
    },
    {
      category: 'Recurring Tasks',
      items: [
        { command: 'repeat daily workout', description: 'Make task repeat daily' },
        { command: 'repeat weekly on monday meeting', description: 'Set to repeat on Mondays' },
        { command: 'repeat monthly bills', description: 'Set to repeat monthly' },
      ]
    },
    {
      category: 'Time & Reminders',
      items: [
        { command: 'remind me about dentist tomorrow 9am', description: 'Add specific reminder' },
        { command: 'remind me 2 hours before meeting', description: 'Add relative reminder' },
        { command: 'summarize today', description: 'List today\'s tasks' },
        { command: 'summarize this week', description: 'List this week\'s tasks' },
      ]
    },
    {
      category: 'Natural Language Commands',
      items: [
        { command: 'I need to buy milk today', description: 'Automatically parsed as a task' },
        { command: 'Don\'t forget the dentist on Thursday', description: 'Creates task with Thursday due date' },
        { command: 'Call mom every Sunday', description: 'Creates weekly recurring task' },
        { command: 'What\'s due today?', description: 'Lists tasks due today' },
      ]
    },
    {
      category: 'Project Management',
      items: [
        { command: 'create project Work', description: 'Create a new project' },
        { command: 'add Buy supplies to Home project', description: 'Add task to project' },
        { command: 'list projects', description: 'Show all projects' },
      ]
    },
    {
      category: 'Subtasks',
      items: [
        { command: 'add subtask Milk to Groceries', description: 'Add subtask to existing task' },
        { command: 'tick subtask Milk', description: 'Complete a specific subtask' },
      ]
    },
    {
      category: 'UI & Preferences',
      items: [
        { command: 'dark mode', description: 'Switch to dark theme' },
        { command: 'light mode', description: 'Switch to light theme' },
        { command: 'sort by priority', description: 'Change task sorting' },
        { command: 'sort by due date', description: 'Sort tasks by due date' },
        { command: 'calendar', description: 'Toggle calendar view' },
      ]
    },
  ];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 animate-fade-in">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Available Commands</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-auto p-6">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Type these commands in the input box or click on a command to use it.
          </p>
          
          <div className="space-y-6">
            {commands.map((category, index) => (
              <div key={index}>
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-200 mb-3">{category.category}</h3>
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {category.items.map((item, idx) => (
                        <tr 
                          key={idx} 
                          className={`border-b border-gray-200 dark:border-slate-600 last:border-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors`}
                          onClick={() => handleCommandSelect(item.command)}
                        >
                          <td className="py-2 px-4 font-mono text-indigo-600 dark:text-indigo-400">{item.command}</td>
                          <td className="py-2 px-4 text-gray-600 dark:text-gray-300">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            You can also use natural language to create and manage tasks
          </p>
        </div>
      </div>
    </div>
  );
} 