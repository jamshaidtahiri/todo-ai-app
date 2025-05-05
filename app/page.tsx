'use client';

import { useEffect, useState } from 'react';
import { classifyTask, classifyCommand, generateTaskSuggestions } from './utils/cohere';
import { parseTaskWithLLM, ParsedTask } from './utils/huggingface';
import { v4 as uuidv4 } from 'uuid';
import Task from './components/Task';
import CommandInput from './components/CommandInput';
import TagFilter from './components/TagFilter';
import ProgressBar from './components/ProgressBar';
import CommandHelp from './components/CommandHelp';
import BatchActions from './components/BatchActions';
import { parseCommand, CommandResult } from './utils/helpers';
import { filterAndSortTasks } from './utils/taskFilters';
import CalendarView from './components/CalendarView';
import AIChatAssistant from './components/AIChatAssistant';
import TabSystem from './components/TabSystem';
import TabDialog from './components/TabDialog';
import { useTheme } from './utils/theme';
import { useReminderCheck } from './utils/useReminderCheck';

type TaskCategory = {
  id: string;
  name: string;
  color: string;
};

type Task = {
  id: string;
  text: string;
  done: boolean;
  tag?: string;  // Keep for backward compatibility
  tags?: string[]; // New field for multiple tags
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
  category?: string; // For categorizing tasks (Personal, Work, etc.)
};

// Update the CommandResult interface to include isCommand property
interface ExtendedCommandResult extends CommandResult {
  isCommand?: boolean;
}

// Create a type-safe reminder creator function
const createReminder = (time: number): {
  id: string;
  time: number;
  notified: boolean;
  type: 'absolute' | 'relative';
} => {
  return {
    id: uuidv4(),
    time,
    notified: false,
    type: 'absolute'
  };
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
  
  // New state for categories
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);

  // Setup reminder checking
  const { checkRemindersNow, hasNotificationPermission } = useReminderCheck(tasks, setTasks);

  // Check reminders when the app gains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkRemindersNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkRemindersNow]);

  useEffect(() => {
    const stored = localStorage.getItem('tasks');
    if (stored) setTasks(JSON.parse(stored));
    
    const storedProjects = localStorage.getItem('projects');
    if (storedProjects) setProjects(JSON.parse(storedProjects));
    
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode) setDarkMode(storedDarkMode === 'true');
    
    const storedSortCriteria = localStorage.getItem('sortCriteria');
    if (storedSortCriteria) setSortCriteria(storedSortCriteria as any);
    
    // Load categories
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) setCategories(JSON.parse(storedCategories));
  }, []);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('sortCriteria', sortCriteria);
    localStorage.setItem('categories', JSON.stringify(categories));
    
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
  }, [tasks, projects, darkMode, sortCriteria, categories]);

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
    }[],
    providedTags?: string[] // New parameter for multiple tags
  ) => {
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      // If tags are provided, use them. Otherwise, classify with AI or use the single tag
      const tag = providedTag || await classifyTask(text);
      const tags = providedTags || (providedTag ? [providedTag] : tag ? [tag] : []);
      
      setTasks([...tasks, { 
        id: uuidv4(), 
        text, 
        done: false, 
        tag,  // Keep for backward compatibility
        tags, // Add multiple tags
        createdAt: Date.now(),
        priority,
        status: 'pending',
        dueDate,
        notes,
        subtasks,
        project,
        category: activeCategory, // Assign the active category if any
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
  
  // Request notification permissions (keep this or remove if it's handled in the hook)
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
    
    // Check for reminder-specific patterns first
    const reminderPattern = /remind(er)?\s+(me|us)?\s+(to|of|about)?/i;
    if (reminderPattern.test(commandText.toLowerCase())) {
      console.log("Detected reminder command:", commandText);
      setIsLoading(true);
      
      try {
        // First, parse the task with natural language understanding
        const parsedTask = await parseTaskWithLLM(commandText);
        
        if (parsedTask && parsedTask.title) {
          // Extract a reasonable task title
          // Sometimes the reminder text is included in the title, try to clean it
          let taskTitle = parsedTask.title;
          taskTitle = taskTitle.replace(/^remind(er)?\s+(me|us)?\s+(to|of|about)?/i, '').trim();
          if (!taskTitle) taskTitle = "Reminder";
          
          // Get the due date/time from the parsed task
          const dueDate = parsedTask.due ? parsedTask.due.getTime() : undefined;
          
          // Create a reminder 5 minutes before the due date, or at the due date if nothing else specified
          const reminderDate = dueDate ? dueDate - (5 * 60 * 1000) : undefined;
          
          // Prepare reminder object
          const reminders = reminderDate ? [createReminder(reminderDate)] : undefined;
          
          // Create the task with the reminder
          addTask(
            taskTitle,
            undefined, // Don't provide a single tag
            parsedTask.priority,
            dueDate,
            undefined, // notes
            undefined, // subtasks
            undefined, // project
            undefined, // recurring
            reminders,
            parsedTask.tags // Pass the tags array
          );
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error processing reminder:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    // First try rule-based parsing
    const result = parseCommand(commandText);
    
    if (result.type === 'unknown' && commandText.trim()) {
      setIsLoading(true);
      
      try {
        // Try first with the Hugging Face natural language parser
        const parsedTask = await parseTaskWithLLM(commandText);
        
        if (parsedTask && parsedTask.title) {
          // Successfully parsed the task with natural language understanding
          const dueDate = parsedTask.due ? parsedTask.due.getTime() : undefined;
          
          // Check if this task might need a reminder
          const needsReminder = /remind|alert|notify|notification/i.test(commandText);
          let reminders = undefined;
          
          if (needsReminder && dueDate) {
            const reminderTime = dueDate - (30 * 60 * 1000); // 30 minutes before due date
            reminders = [createReminder(reminderTime)];
            console.log("Created reminder for task:", {
              taskTitle: parsedTask.title,
              dueDate: new Date(dueDate).toLocaleString(),
              reminderTime: new Date(reminderTime).toLocaleString()
            });
          }
          
          addTask(
            parsedTask.title,
            undefined, // Don't provide a single tag
            parsedTask.priority,
            dueDate,
            undefined, // notes
            undefined, // subtasks
            undefined, // project
            undefined, // recurring
            reminders,
            parsedTask.tags // Pass the tags array
          );
          setIsLoading(false);
          return;
        }
        
        // Fallback to Cohere classification if Hugging Face failed
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
          console.error('Error processing command with Cohere:', error);
          // Default to adding a task
          addTask(commandText);
        }
      } catch (error) {
        console.error('Error processing with natural language:', error);
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

  // Filter and sort tasks based on current criteria
  const getFilteredTasks = () => {
    return filterAndSortTasks({
      tasks,
      tag: filterTag,
      project: activeProject,
      category: activeCategory,
      sortBy: sortCriteria
    });
  };

  // Handle task click from calendar
  const handleTaskClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      showFeedback(`Selected: ${task.text}`);
      // Optionally add more functionality here
    }
  };

  // Category management functions
  const handleCategoryChange = (categoryId: string | null) => {
    setActiveCategory(categoryId);
  };
  
  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowCategoryDialog(true);
  };
  
  const handleEditCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setEditingCategory(category);
      setShowCategoryDialog(true);
    }
  };
  
  const handleDeleteCategory = (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category? Tasks will not be deleted, but will be uncategorized.')) {
      // Remove the category from tasks
      setTasks(tasks.map(task => 
        task.category === categoryId ? { ...task, category: undefined } : task
      ));
      
      // Remove the category
      setCategories(categories.filter(c => c.id !== categoryId));
      
      if (activeCategory === categoryId) {
        setActiveCategory(null);
      }
      
      showFeedback('Category deleted');
    }
  };
  
  const handleSaveCategory = (name: string, color: string) => {
    if (editingCategory) {
      // Update existing category
      setCategories(categories.map(c => 
        c.id === editingCategory.id ? { ...c, name, color } : c
      ));
      showFeedback('Category updated');
    } else {
      // Add new category
      const newCategory = {
        id: uuidv4(),
        name,
        color
      };
      setCategories([...categories, newCategory]);
      showFeedback('Category added');
    }
  };

  // Handle input submit (for both tasks and commands)
  const handleInputSubmit = async (inputValue: string) => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    
    const result = parseCommand(trimmed) as ExtendedCommandResult;
    if (result.type !== 'unknown') {
      result.isCommand = true;
      await processCommand(trimmed);
    } else {
      // Try to parse natural language with LLM
      setIsLoading(true);
      try {
        const parsed = await parseTaskWithLLM(trimmed);
        if (parsed) {
          addTask(
            parsed.title, 
            undefined, // Don't provide a single tag
            parsed.priority,
            parsed.due ? parsed.due.getTime() : undefined,
            undefined, // notes
            undefined, // subtasks
            undefined, // project
            undefined, // recurring
            undefined, // reminders
            parsed.tags // Pass the tags array
          );
        } else {
          addTask(trimmed);
        }
      } catch (error) {
        console.error("Error parsing task:", error);
        addTask(trimmed);
      } finally {
        setIsLoading(false);
      }
    }
    setInput(''); // Clear input after submission
  };

  // Add notification permission request to UI if needed
  const renderNotificationPermissionRequest = () => {
    if (typeof window !== 'undefined' && 
        'Notification' in window && 
        Notification.permission !== 'granted' && 
        Notification.permission !== 'denied') {
      return (
        <div className="text-center mb-4">
          <button 
            onClick={() => Notification.requestPermission()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Enable Notifications for Reminders
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <main className={`min-h-screen pb-24 ${darkMode ? 'dark bg-slate-900 text-white' : 'bg-gray-50'}`}>
      {feedbackMessage && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out">
          {feedbackMessage}
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Todo AI App</h1>
            <div className="flex gap-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setShowCalendarView(!showCalendarView)}
                className={`p-2 rounded-md ${showCalendarView ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'}`}
                aria-label={showCalendarView ? "Hide calendar view" : "Show calendar view"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setShowChatAssistant(!showChatAssistant)}
                className={`p-2 rounded-md ${showChatAssistant ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'}`}
                aria-label={showChatAssistant ? "Hide AI assistant" : "Show AI assistant"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </button>
            </div>
          </div>
          
          {renderNotificationPermissionRequest()}
          
          <CommandInput
            value={input}
            onChange={setInput}
            onSubmit={handleInputSubmit}
            isLoading={isLoading}
            placeholder="Add task or enter command (try 'help' for commands)"
          />
        </header>
        
        {/* Tab System for Categories */}
        <TabSystem
          tabs={categories}
          activeTab={activeCategory}
          onTabChange={handleCategoryChange}
          onAddTab={handleAddCategory}
          onEditTab={handleEditCategory}
          onDeleteTab={handleDeleteCategory}
        />
        
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
        
        {showCalendarView ? (
          <CalendarView 
            tasks={getFilteredTasks() as any} 
            onTaskClick={handleTaskClick}
            darkMode={darkMode}
          />
        ) : (
          <ul className="space-y-4 mt-4">
            {(getFilteredTasks() as any).map((task: any) => (
              <Task
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onUpdate={handleTaskUpdate}
                darkMode={darkMode}
                categories={categories}
              />
            ))}
            {getFilteredTasks().length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {isLoading ? (
                  <div>Loading tasks...</div>
                ) : (
                  <div>
                    <p className="mb-2">No tasks found.</p>
                    <p className="text-sm">Try adding a new task using the input box above.</p>
                  </div>
                )}
              </div>
            )}
          </ul>
        )}
        
        <ProgressBar completed={stats.completed} total={stats.total} />
        
        {showHelp && (
          <CommandHelp onClose={() => setShowHelp(false)} />
        )}
        
        {showChatAssistant && (
          <AIChatAssistant 
            tasks={tasks as any} 
            isOpen={showChatAssistant} 
            onClose={() => setShowChatAssistant(false)} 
          />
        )}
      </div>
      
      {/* Category Dialog */}
      <TabDialog
        isOpen={showCategoryDialog}
        onClose={() => setShowCategoryDialog(false)}
        onSave={handleSaveCategory}
        editingTab={editingCategory ? { 
          name: editingCategory.name, 
          color: editingCategory.color 
        } : undefined}
      />
    </main>
  );
}