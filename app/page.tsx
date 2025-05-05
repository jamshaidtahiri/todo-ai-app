'use client';

import { useEffect, useState } from 'react';
import { classifyTask, classifyCommand, generateTaskSuggestions } from './utils/cohere';
import { v4 as uuidv4 } from 'uuid';
import Task from './components/Task';
import CommandInput from './components/CommandInput';
import TagFilter from './components/TagFilter';
import ProgressBar from './components/ProgressBar';
import CommandHelp from './components/CommandHelp';
import BatchActions from './components/BatchActions';
import { filterAndSortTasks, parseCommand, CommandResult } from './utils/helpers';
import CalendarView from './components/CalendarView';
import AIChatAssistant from './components/AIChatAssistant';

type Task = {
  id: string;
  text: string;
  done: boolean;
  tag: string;
  createdAt: number;
  priority?: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'archived';
  dueDate?: number; // timestamp for due date
  notes?: string;
  subtasks?: {
    id: string;
    text: string;
    done: boolean;
  }[];
  recurring?: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number; // every X days/weeks/months
    daysOfWeek?: number[]; // for weekly: 0=Sunday, 1=Monday, etc.
    endDate?: number; // optional end date for recurring tasks
  };
  reminders?: {
    id: string;
    time: number; // timestamp
    notified: boolean;
    type: 'absolute' | 'relative'; // absolute time or relative to due date
  }[];
  project?: string; // For grouping tasks by project
};

export default function Home() {
  const [input, setInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<'priority' | 'dueDate' | 'createdAt' | 'alphabetical'>('priority');
  const [darkMode, setDarkMode] = useState(false);
  const [projects, setProjects] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [showChatAssistant, setShowChatAssistant] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('tasks');
    if (stored) setTasks(JSON.parse(stored));
    
    const storedProjects = localStorage.getItem('projects');
    if (storedProjects) setProjects(JSON.parse(storedProjects));
    
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode) setDarkMode(storedDarkMode === 'true');
    
    const storedSortCriteria = localStorage.getItem('sortCriteria');
    if (storedSortCriteria) setSortCriteria(storedSortCriteria as any);
  }, []);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('sortCriteria', sortCriteria);
    
    setStats({
      total: tasks.length,
      completed: tasks.filter(t => t.done).length
    });
    
    // Generate task suggestions when tasks change
    if (tasks.length >= 3) {
      generateSuggestions();
    }
    
    // Update document theme
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [tasks, projects, darkMode, sortCriteria]);

  useEffect(() => {
    // Handle showing help when input is "help"
    if (input.trim().toLowerCase() === 'help' || input.trim().toLowerCase() === 'commands') {
      setShowHelp(true);
    }
  }, [input]);
  
  // Generate task suggestions using the LLM
  const generateSuggestions = async () => {
    if (tasks.length < 3) return;
    
    // Only use the most recent 5 tasks for context
    const recentTasks = [...tasks]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map(t => t.text);
      
    const suggestions = await generateTaskSuggestions(recentTasks);
    setTaskSuggestions(suggestions);
  };

  const showFeedback = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const addTask = async (
    text: string, 
    providedTag?: string, 
    priority?: 'high' | 'medium' | 'low',
    dueDate?: number,
    notes?: string,
    subtasks?: { id: string; text: string; done: boolean }[],
    project?: string,
    recurring?: {
      type: 'daily' | 'weekly' | 'monthly' | 'custom';
      interval: number;
      daysOfWeek?: number[];
      endDate?: number;
    },
    reminders?: {
      id: string;
      time: number;
      notified: boolean;
      type: 'absolute' | 'relative';
    }[]
  ) => {
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      // If a tag is provided, use it. Otherwise, classify with AI
      const tag = providedTag || await classifyTask(text);
      setTasks([...tasks, { 
        id: uuidv4(), 
        text, 
        done: false, 
        tag,
        createdAt: Date.now(),
        priority,
        status: 'pending',
        dueDate,
        notes,
        subtasks,
        project,
        recurring,
        reminders
      }]);
      setInput('');
      showFeedback(`Added task: ${text}`);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error adding task:', error);
      showFeedback('Error adding task');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (taskToDelete) {
      setTasks(tasks.filter(t => t.id !== id));
      showFeedback(`Deleted task: ${taskToDelete.text}`);
    }
  };

  const handleTaskUpdate = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  };
  
  // Set due date for a task
  const handleDueDate = (searchText: string, dueDate: number | undefined) => {
    let modifiedCount = 0;
    
    setTasks(tasks.map(task => {
      if (task.text.toLowerCase().includes(searchText.toLowerCase())) {
        modifiedCount++;
        return { ...task, dueDate };
      }
      return task;
    }));
    
    if (modifiedCount > 0) {
      showFeedback(`Updated due date for ${modifiedCount} task(s)`);
    } else {
      showFeedback(`No matching tasks found for "${searchText}"`);
    }
    
    return modifiedCount;
  };
  
  // Set recurring schedule for a task
  const handleRecurringTask = (
    searchText: string, 
    recurringType: 'daily' | 'weekly' | 'monthly' | 'custom',
    interval: number = 1,
    daysOfWeek?: number[]
  ) => {
    let modifiedCount = 0;
    
    setTasks(tasks.map(task => {
      if (task.text.toLowerCase().includes(searchText.toLowerCase())) {
        modifiedCount++;
        return { 
          ...task, 
          recurring: {
            type: recurringType,
            interval,
            daysOfWeek,
            endDate: undefined
          }
        };
      }
      return task;
    }));
    
    if (modifiedCount > 0) {
      showFeedback(`Set recurring schedule for ${modifiedCount} task(s)`);
    } else {
      showFeedback(`No matching tasks found for "${searchText}"`);
    }
    
    return modifiedCount;
  };
  
  // Change task sorting
  const handleSort = (criteria: 'priority' | 'dueDate' | 'createdAt' | 'alphabetical') => {
    setSortCriteria(criteria);
    showFeedback(`Sorting tasks by ${criteria}`);
  };
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    showFeedback(`Switched to ${!darkMode ? 'dark' : 'light'} mode`);
  };
  
  // Check for recurring tasks and create new instances if needed
  useEffect(() => {
    const now = Date.now();
    let tasksUpdated = false;
    
    const updatedTasks = [...tasks];
    
    // Find completed recurring tasks that need to be regenerated
    tasks.forEach(task => {
      if (task.recurring && task.done) {
        // Calculate the next occurrence date
        let nextDate = undefined;
        
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          
          if (task.recurring.type === 'daily') {
            // Add days based on interval
            nextDate = new Date(dueDate);
            nextDate.setDate(nextDate.getDate() + task.recurring.interval);
          } else if (task.recurring.type === 'weekly') {
            // Find the next matching day of week
            nextDate = new Date(dueDate);
            nextDate.setDate(nextDate.getDate() + (7 * task.recurring.interval));
            
            // Adjust to the correct day of week if specified
            if (task.recurring.daysOfWeek && task.recurring.daysOfWeek.length > 0) {
              // Find the next available day from the current weekday
              const currentDayOfWeek = nextDate.getDay();
              const availableDays = [...task.recurring.daysOfWeek].sort();
              
              // Find the next day in the list
              const nextDayIndex = availableDays.findIndex(day => day > currentDayOfWeek);
              if (nextDayIndex !== -1) {
                // Found a day later in the current week
                const daysToAdd = availableDays[nextDayIndex] - currentDayOfWeek;
                nextDate.setDate(nextDate.getDate() + daysToAdd);
              } else {
                // Move to the first day in the next week
                const daysToAdd = 7 - currentDayOfWeek + availableDays[0];
                nextDate.setDate(nextDate.getDate() + daysToAdd);
              }
            }
          } else if (task.recurring.type === 'monthly') {
            // Add months based on interval
            nextDate = new Date(dueDate);
            nextDate.setMonth(nextDate.getMonth() + task.recurring.interval);
          }
          
          // Check if the task should still be recurring (if it has an end date)
          if (task.recurring.endDate && nextDate && nextDate.getTime() > task.recurring.endDate) {
            // Don't recreate if we're past the end date
            nextDate = undefined;
          }
        }
        
        if (nextDate) {
          // Create a new instance of the recurring task
          const newTaskId = uuidv4();
          
          // Prepare new reminders if needed
          let newReminders = undefined;
          if (task.reminders && task.reminders.length > 0) {
            newReminders = task.reminders.map(reminder => {
              if (reminder.type === 'relative' && task.dueDate && nextDate) {
                // Calculate new relative reminder time based on the time difference
                const timeDiff = task.dueDate - reminder.time;
                const newReminderTime = nextDate.getTime() - timeDiff;
                
                return {
                  id: uuidv4(),
                  time: newReminderTime,
                  notified: false,
                  type: 'relative'
                };
              } else if (reminder.type === 'absolute') {
                // Create a new absolute reminder with the same date/time
                return {
                  id: uuidv4(),
                  time: reminder.time,
                  notified: false,
                  type: 'absolute'
                };
              }
              
              // Fallback
              return {
                id: uuidv4(),
                time: reminder.time,
                notified: false,
                type: reminder.type
              };
            });
          }
          
          // Add new task
          updatedTasks.push({
            ...task,
            id: newTaskId,
            done: false,
            status: 'pending',
            createdAt: now,
            dueDate: nextDate.getTime(),
            reminders: newReminders,
            // Reset subtasks if any
            subtasks: task.subtasks ? task.subtasks.map(st => ({
              id: uuidv4(),
              text: st.text,
              done: false
            })) : undefined
          });
          
          tasksUpdated = true;
        }
      }
    });
    
    if (tasksUpdated) {
      setTasks(updatedTasks);
    }
  }, [tasks]);
  
  // Check for due reminders
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    let tasksUpdated = false;
    
    const updatedTasks = tasks.map(task => {
      if (task.reminders && task.reminders.length > 0) {
        const updatedReminders = task.reminders.map(reminder => {
          if (!reminder.notified && reminder.time <= now) {
            // Show notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Task Reminder', {
                body: `Reminder for: ${task.text}`,
                icon: '/icon.png'
              });
            }
            
            return { ...reminder, notified: true };
          }
          return reminder;
        });
        
        if (JSON.stringify(updatedReminders) !== JSON.stringify(task.reminders)) {
          tasksUpdated = true;
          return { ...task, reminders: updatedReminders };
        }
      }
      return task;
    });
    
    if (tasksUpdated) {
      setTasks(updatedTasks);
    }
  }, [tasks]);
  
  // Request notification permissions
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  const tickTasksByText = (searchText: string, tickAll: boolean = false) => {
    const lowerSearchText = searchText.toLowerCase();
    let modifiedCount = 0;
    
    setTasks(tasks.map(task => {
      if (task.text.toLowerCase().includes(lowerSearchText) && !task.done) {
        if (!tickAll && modifiedCount > 0) {
          return task; // Only modify first match if not tickAll
        }
        modifiedCount++;
        return { ...task, done: true };
      }
      return task;
    }));
    
    if (modifiedCount > 0) {
      showFeedback(`Completed ${modifiedCount} task(s) matching "${searchText}"`);
    } else {
      showFeedback(`No matching incomplete tasks found for "${searchText}"`);
    }
    return modifiedCount;
  };

  const deleteTasksByText = (searchText: string, deleteAll: boolean = false) => {
    const lowerSearchText = searchText.toLowerCase();
    const tasksToKeep = [];
    let deletedCount = 0;
    
    for (const task of tasks) {
      if (task.text.toLowerCase().includes(lowerSearchText)) {
        if (!deleteAll && deletedCount > 0) {
          tasksToKeep.push(task); // Only delete first match if not deleteAll
        } else {
          deletedCount++;
          continue; // Skip this task (delete it)
        }
      } else {
        tasksToKeep.push(task);
      }
    }
    
    if (deletedCount > 0) {
      setTasks(tasksToKeep);
      showFeedback(`Deleted ${deletedCount} task(s) matching "${searchText}"`);
    } else {
      showFeedback(`No matching tasks found for "${searchText}"`);
    }
    return deletedCount;
  };

  const updateTaskTag = (searchText: string, newTag: string) => {
    const lowerSearchText = searchText.toLowerCase();
    let modifiedCount = 0;
    
    setTasks(tasks.map(task => {
      if (task.text.toLowerCase().includes(lowerSearchText)) {
        modifiedCount++;
        return { ...task, tag: newTag };
      }
      return task;
    }));
    
    if (modifiedCount > 0) {
      showFeedback(`Updated tag to "${newTag}" for ${modifiedCount} task(s)`);
    } else {
      showFeedback(`No matching tasks found for "${searchText}"`);
    }
  };
  
  const updateTaskPriority = (searchText: string, priority: 'high' | 'medium' | 'low') => {
    const lowerSearchText = searchText.toLowerCase();
    let modifiedCount = 0;
    
    setTasks(tasks.map(task => {
      if (task.text.toLowerCase().includes(lowerSearchText)) {
        modifiedCount++;
        return { ...task, priority };
      }
      return task;
    }));
    
    if (modifiedCount > 0) {
      showFeedback(`Set priority to "${priority}" for ${modifiedCount} task(s)`);
    } else {
      showFeedback(`No matching tasks found for "${searchText}"`);
    }
  };

  // Process command input
  const processCommand = async (commandText: string) => {
    setInput(commandText);
    
    // First try rule-based parsing
    const result = parseCommand(commandText);
    
    if (result.type === 'unknown' && commandText.trim()) {
      setIsLoading(true);
      try {
        // Use LLM-based classification
        const llmClassification = await classifyCommand(commandText);
        
        if (llmClassification.intent === 'add_task') {
          addTask(
            llmClassification.entities.taskText || commandText,
            llmClassification.entities.tag,
            llmClassification.entities.priority as 'high' | 'medium' | 'low' | undefined
          );
        } else if (llmClassification.intent === 'complete_task' && llmClassification.entities.searchTerm) {
          tickTasksByText(llmClassification.entities.searchTerm);
        } else if (llmClassification.intent === 'delete_task' && llmClassification.entities.searchTerm) {
          deleteTasksByText(llmClassification.entities.searchTerm);
        } else if (llmClassification.intent === 'change_tag' && llmClassification.entities.searchTerm && llmClassification.entities.tag) {
          updateTaskTag(llmClassification.entities.searchTerm, llmClassification.entities.tag);
        } else if (llmClassification.intent === 'set_priority' && llmClassification.entities.searchTerm && llmClassification.entities.priority) {
          updateTaskPriority(
            llmClassification.entities.searchTerm, 
            llmClassification.entities.priority as 'high' | 'medium' | 'low'
          );
        } else if (llmClassification.intent === 'filter_tasks' && llmClassification.entities.tag) {
          setFilterTag(llmClassification.entities.tag);
        } else {
          // If LLM can't classify it either, default to adding a task
          addTask(commandText);
        }
      } catch (error) {
        console.error('Error processing command with LLM:', error);
        // Default to adding a task
        addTask(commandText);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Handle rule-based parsed commands
    switch (result.type) {
      case 'add':
        addTask(result.taskText || '', result.tag, result.priority);
        break;
      case 'tick':
        tickTasksByText(result.searchTerm || '', result.allMatches);
        break;
      case 'delete':
        deleteTasksByText(result.searchTerm || '', result.allMatches);
        break;
      case 'tag':
        if (result.searchTerm && result.tag) {
          updateTaskTag(result.searchTerm, result.tag);
        }
        break;
      case 'filter':
        setFilterTag(result.tag || null);
        break;
      case 'priority':
        if (result.searchTerm && result.priority) {
          updateTaskPriority(result.searchTerm, result.priority);
        }
        break;
      case 'help':
        setShowHelp(true);
        break;
      case 'due':
        if (result.searchTerm && result.dueDate) {
          handleDueDate(result.searchTerm, result.dueDate);
        }
        break;
      case 'sort':
        if (result.sortCriteria) {
          handleSort(result.sortCriteria);
        }
        break;
      case 'dark':
        setDarkMode(true);
        break;
      case 'light':
        setDarkMode(false);
        break;
      case 'repeat':
        if (result.searchTerm && result.recurringType) {
          handleRecurringTask(
            result.searchTerm, 
            result.recurringType, 
            result.recurringInterval || 1,
            result.recurringDays
          );
        }
        break;
      case 'summarize':
        setShowChatAssistant(true);
        break;
      case 'calendar':
      case 'view calendar':
        setShowCalendarView(!showCalendarView);
        break;
      default:
        if (commandText.trim()) {
          addTask(commandText);
        }
    }
  };

  // Get filtered and sorted tasks
  const filteredTasks = filterAndSortTasks(tasks, filterTag);
  
  // Handle task click from calendar
  const handleTaskClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      showFeedback(`Selected: ${task.text}`);
      // Optionally add more functionality here
    }
  };

  return (
    <div className={`min-h-screen p-4 ${darkMode ? 'dark bg-slate-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">AI-Powered Todo</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Organize your tasks with AI assistance</p>
        </header>
        
        <div className="mb-6">
          <CommandInput 
            value={input} 
            onChange={setInput}
            onSubmit={processCommand}
            isLoading={isLoading}
            placeholder="Add a task or type a command (try 'help' for options)..."
          />
          
          {feedbackMessage && (
            <div className="mt-2 p-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md text-sm">
              {feedbackMessage}
            </div>
          )}
          
          {taskSuggestions.length > 0 && showSuggestions && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suggested tasks:</h3>
              <div className="space-y-2">
                {taskSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => addTask(suggestion)}
                    className="block w-full text-left px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300"
            >
              {showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
            </button>
            
            <button
              onClick={() => setShowChatAssistant(true)}
              className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300"
            >
              AI Assistant
            </button>
            
            <button
              onClick={() => setShowCalendarView(!showCalendarView)}
              className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300"
            >
              {showCalendarView ? 'Hide Calendar' : 'Show Calendar'}
            </button>
          </div>
          
          <TagFilter 
            currentTag={filterTag} 
            onSelectTag={setFilterTag} 
            tags={Array.from(new Set(tasks.map(t => t.tag)))}
          />
        </div>
        
        <BatchActions 
          onComplete={() => {
            const incompleteActiveTasks = tasks.filter(t => !t.done && t.status === 'pending');
            if (incompleteActiveTasks.length > 0) {
              setTasks(tasks.map(t => t.status === 'pending' ? { ...t, done: true } : t));
              showFeedback(`Completed ${incompleteActiveTasks.length} tasks`);
            } else {
              showFeedback('No active tasks to complete');
            }
          }}
          onArchive={() => {
            const completedTasks = tasks.filter(t => t.done);
            if (completedTasks.length > 0) {
              setTasks(tasks.map(t => t.done ? { ...t, status: 'archived' } : t));
              showFeedback(`Archived ${completedTasks.length} completed tasks`);
            } else {
              showFeedback('No completed tasks to archive');
            }
          }}
          onDelete={() => {
            const archivedTasks = tasks.filter(t => t.status === 'archived');
            if (archivedTasks.length > 0) {
              setTasks(tasks.filter(t => t.status !== 'archived'));
              showFeedback(`Deleted ${archivedTasks.length} archived tasks`);
            } else {
              showFeedback('No archived tasks to delete');
            }
          }}
          onSort={() => {
            const criteria = ['priority', 'dueDate', 'createdAt', 'alphabetical'] as const;
            const currentIndex = criteria.indexOf(sortCriteria);
            const nextCriteria = criteria[(currentIndex + 1) % criteria.length];
            setSortCriteria(nextCriteria);
            showFeedback(`Sorted by ${nextCriteria}`);
          }}
          sortCriteria={sortCriteria}
          onToggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
        />
        
        {showCalendarView && (
          <div className="mb-6">
            <CalendarView tasks={tasks} onTaskClick={handleTaskClick} />
          </div>
        )}
        
        <ProgressBar completed={stats.completed} total={stats.total} />
        
        <div className="mt-4 space-y-2">
          {filteredTasks.map(task => (
            <Task
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => deleteTask(task.id)}
              onUpdate={(updates) => handleTaskUpdate(task.id, updates)}
              darkMode={darkMode}
            />
          ))}
          
          {filteredTasks.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-lg shadow">
              No tasks found. {filterTag ? `Try removing the "${filterTag}" filter or add` : 'Add'} some tasks to get started!
            </div>
          )}
        </div>
        
        {showHelp && (
          <CommandHelp onClose={() => setShowHelp(false)} />
        )}
        
        {showChatAssistant && (
          <AIChatAssistant 
            tasks={tasks} 
            isOpen={showChatAssistant} 
            onClose={() => setShowChatAssistant(false)} 
          />
        )}
      </div>
    </div>
  );
}