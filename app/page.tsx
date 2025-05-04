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
}