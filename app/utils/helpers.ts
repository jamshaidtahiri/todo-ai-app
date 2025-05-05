/**
 * Returns the appropriate CSS classes for a given task tag.
 */
export function getTagColor(tag: string): string {
  const tagColors: Record<string, string> = {
    'work': 'bg-blue-100 text-blue-800',
    'errand': 'bg-green-100 text-green-800',
    'fitness': 'bg-orange-100 text-orange-800',
    'spiritual': 'bg-purple-100 text-purple-800',
    'general': 'bg-gray-100 text-gray-800',
    'social': 'bg-pink-100 text-pink-800',
    'finance': 'bg-emerald-100 text-emerald-800',
    'home': 'bg-indigo-100 text-indigo-800',
    'education': 'bg-sky-100 text-sky-800',
    'health': 'bg-rose-100 text-rose-800'
  };
  return tagColors[tag] || 'bg-gray-100 text-gray-800';
}

/**
 * Formats a date as a relative time string (e.g., "2 hours ago").
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Filter and sort tasks based on criteria.
 */
export function filterAndSortTasks(tasks: any[], filterTag: string | null): any[] {
  // First filter by tag if necessary
  const filteredTasks = filterTag 
    ? tasks.filter(t => t.tag === filterTag)
    : tasks;
  
  // Then sort: completed tasks at bottom, newest first
  return filteredTasks.sort((a, b) => {
    // Sort completed tasks to the bottom
    if (a.done !== b.done) return a.done ? 1 : -1;
    
    // Sort by priority if present
    if (a.priority && b.priority && a.priority !== b.priority) {
      const priorityValues = { high: 0, medium: 1, low: 2 };
      return priorityValues[a.priority as keyof typeof priorityValues] - 
             priorityValues[b.priority as keyof typeof priorityValues];
    }
    
    // Then sort by creation date (newest first)
    return b.createdAt - a.createdAt;
  });
}

/**
 * Command parsing for the agentic interface
 */
export interface CommandResult {
  type: 'add' | 'tick' | 'delete' | 'tag' | 'help' | 'unknown' | 'filter' | 'priority' 
       | 'due' | 'remind' | 'subtask' | 'repeat' | 'archive' | 'snooze' | 'project' | 'summarize'
       | 'dark' | 'light' | 'sort' | 'calendar' | 'view calendar';
  taskText?: string;
  tag?: string;
  searchTerm?: string;
  allMatches?: boolean;
  priority?: 'high' | 'medium' | 'low';
  confidence?: number;
  dueDate?: number;
  dueSpec?: string; // "today", "tomorrow", "next monday", etc.
  reminderTime?: number;
  reminderSpec?: string;
  reminderRelativeHours?: number;
  subtaskText?: string;
  parentTaskSearch?: string;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurringInterval?: number;
  recurringDays?: number[];
  projectName?: string;
  project?: string; // For adding tasks to a project
  sortCriteria?: 'priority' | 'dueDate' | 'createdAt' | 'alphabetical';
  snoozeAmount?: number;
  snoozeUnit?: 'days' | 'weeks' | 'months';
}

/**
 * Parse command using both rule-based and LLM-based parsing.
 * Rule-based is faster and more precise for structured commands.
 * LLM-based is better for natural language commands.
 */
export function parseCommand(input: string): CommandResult {
  const text = input.trim().toLowerCase();

  // First try rule-based parsing for standard command formats
  const ruleBasedResult = parseCommandRuleBased(text);
  
  // If the rule-based parser found a clear match, return it
  if (ruleBasedResult.type !== 'unknown' || !text) {
    return ruleBasedResult;
  }
  
  // For other inputs, we'll need to use LLM-based parsing (to be implemented in page.tsx)
  // Just mark it as 'unknown' for now, but with a text that needs processing
  return { 
    type: 'unknown', 
    taskText: text,
    confidence: 0
  };
}

/**
 * Rule-based command parser for structured commands
 */
function parseCommandRuleBased(text: string): CommandResult {
  // Help command
  if (text === 'help' || text === 'commands') {
    return { type: 'help', confidence: 1 };
  }

  // Add task with specific tag
  // Formats: "add [task] #[tag]" or "add [task] as [tag]"
  if (text.startsWith('add ')) {
    // Check if it's an "add subtask" command
    if (text.includes(' subtask ') && text.includes(' to ')) {
      const subtaskMatch = text.match(/^add\s+subtask\s+(.*?)\s+to\s+(.*?)$/i);
      if (subtaskMatch) {
        return {
          type: 'subtask',
          subtaskText: subtaskMatch[1].trim(),
          parentTaskSearch: subtaskMatch[2].trim(),
          confidence: 1
        };
      }
    }
    
    // Check if it's "add [task] to [project]" 
    if (text.includes(' to ') && text.includes(' project')) {
      const projectMatch = text.match(/^add\s+(.*?)\s+to\s+(.*?)\s+project$/i);
      if (projectMatch) {
        return {
          type: 'add',
          taskText: projectMatch[1].trim(),
          project: projectMatch[2].trim(),
          confidence: 1
        };
      }
    }
    
    const taskText = text.substring(4).trim();
    
    // Check for hashtag format: "add buy groceries #errand"
    const hashtagMatch = taskText.match(/^(.*?)(?:\s+#(\w+))?$/);
    if (hashtagMatch && hashtagMatch[2]) {
      return { 
        type: 'add', 
        taskText: hashtagMatch[1].trim(),
        tag: hashtagMatch[2].toLowerCase(),
        confidence: 1
      };
    }
    
    // Check for "as" format: "add buy groceries as errand"
    const asMatch = taskText.match(/^(.*?)\s+as\s+(\w+)$/);
    if (asMatch) {
      return { 
        type: 'add', 
        taskText: asMatch[1].trim(),
        tag: asMatch[2].toLowerCase(),
        confidence: 1
      };
    }
    
    // Priority format: "add buy groceries !high"
    const priorityMatch = taskText.match(/^(.*?)\s+!(\w+)$/);
    if (priorityMatch) {
      const priority = priorityMatch[2].toLowerCase() as 'high' | 'medium' | 'low';
      return {
        type: 'add',
        taskText: priorityMatch[1].trim(),
        priority: ['high', 'medium', 'low'].includes(priority) ? priority : undefined,
        confidence: 1
      };
    }
    
    // Default add with no tag specified
    return { type: 'add', taskText, confidence: 1 };
  }

  // Complete tasks
  // Formats: "tick [text]", "tick all [text]", "complete [text]"
  if (text.startsWith('tick ') || text.startsWith('complete ')) {
    // Check for subtask completion
    if (text.includes('subtask ')) {
      const subtaskMatch = text.match(/^(?:tick|complete)\s+subtask\s+(.*?)$/i);
      if (subtaskMatch) {
        return {
          type: 'subtask',
          subtaskText: subtaskMatch[1].trim(),
          confidence: 1
        };
      }
    }
    
    const withoutCommand = text.startsWith('tick ') 
      ? text.substring(5).trim() 
      : text.substring(9).trim();
    
    // Handle "tick all" command
    if (withoutCommand.startsWith('all ')) {
      return { 
        type: 'tick', 
        searchTerm: withoutCommand.substring(4).trim(),
        allMatches: true,
        confidence: 1
      };
    }
    
    return { type: 'tick', searchTerm: withoutCommand, confidence: 1 };
  }
  
  // Delete tasks
  // Formats: "delete [text]", "remove [text]"
  if (text.startsWith('delete ') || text.startsWith('remove ')) {
    const withoutCommand = text.startsWith('delete ') 
      ? text.substring(7).trim() 
      : text.substring(7).trim();

    // Handle "delete all" command
    if (withoutCommand.startsWith('all ')) {
      return { 
        type: 'delete', 
        searchTerm: withoutCommand.substring(4).trim(),
        allMatches: true,
        confidence: 1
      };
    }
    
    return { type: 'delete', searchTerm: withoutCommand, confidence: 1 };
  }
  
  // Archive tasks
  // Format: "archive [text]" or "archive all [text]"
  if (text.startsWith('archive ')) {
    const withoutCommand = text.substring(8).trim();
    
    // Handle "archive all" command
    if (withoutCommand.startsWith('all ')) {
      return {
        type: 'archive',
        searchTerm: withoutCommand.substring(4).trim(),
        allMatches: true,
        confidence: 1
      };
    }
    
    // Handle "archive completed" command
    if (withoutCommand === 'completed') {
      return {
        type: 'archive',
        searchTerm: 'completed',
        allMatches: true,
        confidence: 1
      };
    }
    
    return { type: 'archive', searchTerm: withoutCommand, confidence: 1 };
  }
  
  // Tag tasks
  // Format: "tag [text] as [tag]"
  if (text.startsWith('tag ')) {
    const match = text.match(/^tag\s+(.*?)\s+as\s+(\w+)$/);
    if (match) {
      return { 
        type: 'tag', 
        searchTerm: match[1].trim(),
        tag: match[2].toLowerCase(),
        confidence: 1
      };
    }
  }
  
  // Filter tasks
  // Format: "filter by [tag]", "show [tag] tasks"
  if (text.startsWith('filter ') || text.startsWith('show ')) {
    const filterMatch = text.match(/^(?:filter|show)(?:\s+by)?\s+(\w+)(?:\s+tasks)?$/);
    if (filterMatch) {
      return {
        type: 'filter',
        tag: filterMatch[1].toLowerCase(),
        confidence: 1
      };
    }
  }
  
  // Set priority
  // Format: "priority [text] [high/medium/low]"
  if (text.startsWith('priority ')) {
    const match = text.match(/^priority\s+(.*?)\s+(high|medium|low)$/);
    if (match) {
      return {
        type: 'priority',
        searchTerm: match[1].trim(),
        priority: match[2] as 'high' | 'medium' | 'low',
        confidence: 1
      };
    }
  }
  
  // Set due date
  // Format: "due [today/tomorrow/next week] [text]"
  if (text.startsWith('due ')) {
    const match = text.match(/^due\s+(\S+(?:\s+\S+)?)\s+(.+)$/);
    if (match) {
      const dueSpec = match[1].toLowerCase();
      const searchTerm = match[2].trim();
      
      // Calculate the due date
      let dueDate: number | undefined = undefined;
      const now = new Date();
      
      if (dueSpec === 'today') {
        dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
      } else if (dueSpec === 'tomorrow') {
        dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59).getTime();
      } else if (dueSpec.startsWith('next ')) {
        const dayOfWeek = dueSpec.substring(5);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(dayOfWeek);
        
        if (targetDay !== -1) {
          const currentDay = now.getDay();
          let daysToAdd = targetDay - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7; // Next week
          
          dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToAdd, 23, 59, 59).getTime();
        }
      }
      
      return {
        type: 'due',
        searchTerm,
        dueSpec,
        dueDate,
        confidence: 1
      };
    }
  }
  
  // Snooze task (postpone due date)
  // Format: "snooze [task] [number] [days/weeks/months]"
  if (text.startsWith('snooze ')) {
    const match = text.match(/^snooze\s+(.*?)\s+(\d+)\s+(days?|weeks?|months?)$/);
    if (match) {
      const searchTerm = match[1].trim();
      const amount = parseInt(match[2]);
      let unit: 'days' | 'weeks' | 'months' = 'days';
      
      if (match[3].startsWith('week')) {
        unit = 'weeks';
      } else if (match[3].startsWith('month')) {
        unit = 'months';
      }
      
      return {
        type: 'snooze',
        searchTerm,
        snoozeAmount: amount,
        snoozeUnit: unit,
        confidence: 1
      };
    }
  }
  
  // Create recurring task
  // Format: "repeat [daily/weekly/monthly] [task]"
  if (text.startsWith('repeat ')) {
    // Format: "repeat daily [task]"
    const dailyMatch = text.match(/^repeat\s+daily\s+(.+)$/);
    if (dailyMatch) {
      return {
        type: 'repeat',
        searchTerm: dailyMatch[1].trim(),
        recurringType: 'daily',
        recurringInterval: 1,
        confidence: 1
      };
    }
    
    // Format: "repeat weekly on monday [task]"
    const weeklyMatch = text.match(/^repeat\s+weekly\s+on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(.+)$/);
    if (weeklyMatch) {
      const dayOfWeek = weeklyMatch[1].toLowerCase();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayIndex = days.indexOf(dayOfWeek);
      
      return {
        type: 'repeat',
        searchTerm: weeklyMatch[2].trim(),
        recurringType: 'weekly',
        recurringInterval: 1,
        recurringDays: [dayIndex],
        confidence: 1
      };
    }
    
    // Format: "repeat monthly [task]"
    const monthlyMatch = text.match(/^repeat\s+monthly\s+(.+)$/);
    if (monthlyMatch) {
      return {
        type: 'repeat',
        searchTerm: monthlyMatch[1].trim(),
        recurringType: 'monthly',
        recurringInterval: 1,
        confidence: 1
      };
    }
  }
  
  // Set reminders
  // Format: "remind me about [task] tomorrow 9am"
  if (text.startsWith('remind ')) {
    // Format for absolute reminders: "remind me about [task] [tomorrow/today] [time]"
    const absoluteMatch = text.match(/^remind\s+me\s+(?:about\s+)?(.*?)\s+(today|tomorrow)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/i);
    if (absoluteMatch) {
      const taskText = absoluteMatch[1].trim();
      const daySpec = absoluteMatch[2].toLowerCase();
      const timeSpec = absoluteMatch[3].toLowerCase();
      
      // Calculate the reminder time
      const now = new Date();
      let reminderDate = new Date();
      
      if (daySpec === 'tomorrow') {
        reminderDate.setDate(reminderDate.getDate() + 1);
      }
      
      // Parse the time
      const isAM = timeSpec.includes('am');
      const isPM = timeSpec.includes('pm');
      let hours = 0;
      let minutes = 0;
      
      if (timeSpec.includes(':')) {
        const timeParts = timeSpec.replace(/[^\d:]/g, '').split(':');
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
      } else {
        hours = parseInt(timeSpec.replace(/[^\d]/g, ''));
      }
      
      // Adjust for AM/PM
      if (isPM && hours < 12) {
        hours += 12;
      } else if (isAM && hours === 12) {
        hours = 0;
      }
      
      reminderDate.setHours(hours, minutes, 0, 0);
      
      return {
        type: 'remind',
        searchTerm: taskText,
        reminderSpec: `${daySpec} ${timeSpec}`,
        reminderTime: reminderDate.getTime(),
        confidence: 1
      };
    }
    
    // Format for relative reminders: "remind me [number] hours before [task]"
    const relativeMatch = text.match(/^remind\s+me\s+(\d+)\s+hours?\s+before\s+(.+)$/i);
    if (relativeMatch) {
      const hours = parseInt(relativeMatch[1]);
      const taskText = relativeMatch[2].trim();
      
      return {
        type: 'remind',
        searchTerm: taskText,
        reminderRelativeHours: hours,
        reminderSpec: `${hours} hours before`,
        confidence: 1
      };
    }
  }
  
  // Create project
  // Format: "create project [name]"
  if (text.startsWith('create project ')) {
    const projectName = text.substring(15).trim();
    if (projectName) {
      return {
        type: 'project',
        projectName,
        confidence: 1
      };
    }
  }
  
  // List projects
  // Format: "list projects"
  if (text === 'list projects') {
    return {
      type: 'project',
      confidence: 1
    };
  }
  
  // Sort tasks
  // Format: "sort by [priority/due date/created]"
  if (text.startsWith('sort by ')) {
    const sortCriteria = text.substring(8).trim().toLowerCase();
    
    if (sortCriteria === 'priority') {
      return {
        type: 'sort',
        sortCriteria: 'priority',
        confidence: 1
      };
    } else if (sortCriteria === 'due date') {
      return {
        type: 'sort',
        sortCriteria: 'dueDate',
        confidence: 1
      };
    } else if (sortCriteria === 'created' || sortCriteria === 'created date') {
      return {
        type: 'sort',
        sortCriteria: 'createdAt',
        confidence: 1
      };
    } else if (sortCriteria === 'alphabetical' || sortCriteria === 'name') {
      return {
        type: 'sort',
        sortCriteria: 'alphabetical',
        confidence: 1
      };
    }
  }
  
  // Calendar view toggle
  // Format: "calendar" or "view calendar"
  if (text === 'calendar' || text === 'view calendar' || text === 'show calendar' || text === 'toggle calendar') {
    return { type: 'calendar', confidence: 1 };
  }
  
  // Theme toggle
  // Format: "dark mode" or "light mode"
  if (text === 'dark mode') {
    return { type: 'dark', confidence: 1 };
  } else if (text === 'light mode') {
    return { type: 'light', confidence: 1 };
  }
  
  // Summarize tasks
  // Format: "summarize today" or "summarize this week"
  if (text.startsWith('summarize ')) {
    const period = text.substring(10).trim().toLowerCase();
    
    if (period === 'today' || period === 'this week' || period === 'tomorrow') {
      return {
        type: 'summarize',
        dueSpec: period,
        confidence: 1
      };
    }
  }
  
  // If no command matched
  return { type: 'unknown', confidence: 0 };
}

/**
 * Analyzes tasks to find potential recurring patterns based on text similarity and creation dates
 */
export function findRecurringSuggestions(tasks: any[]): { task: any, pattern: string }[] {
  if (tasks.length < 5) return []; // Need enough data to detect patterns
  
  const suggestions: { task: any, pattern: string }[] = [];
  const recentTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);
  
  // Group similar tasks by text similarity
  const taskGroups: {[key: string]: any[]} = {};
  
  recentTasks.forEach(task => {
    // Skip already recurring tasks
    if (task.recurring) return;
    
    // Generate a simplified version of the task text for comparison
    const simplifiedText = task.text.toLowerCase()
      .replace(/\d+/g, 'X') // Replace numbers with X to detect patterns like "Pay rent - January" and "Pay rent - February"
      .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, 'MONTH')
      .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi, 'DAY')
      .trim();
    
    if (!taskGroups[simplifiedText]) {
      taskGroups[simplifiedText] = [];
    }
    taskGroups[simplifiedText].push(task);
  });
  
  // Analyze each group for time-based patterns
  Object.entries(taskGroups).forEach(([key, groupTasks]) => {
    if (groupTasks.length < 2) return; // Need at least 2 tasks to detect a pattern
    
    // Sort by creation date
    groupTasks.sort((a, b) => a.createdAt - b.createdAt);
    
    // Check for daily pattern
    const dailyPattern = detectDailyPattern(groupTasks);
    if (dailyPattern) {
      suggestions.push({
        task: groupTasks[groupTasks.length - 1],
        pattern: 'daily'
      });
      return;
    }
    
    // Check for weekly pattern
    const weeklyPattern = detectWeeklyPattern(groupTasks);
    if (weeklyPattern) {
      suggestions.push({
        task: groupTasks[groupTasks.length - 1],
        pattern: 'weekly'
      });
      return;
    }
    
    // Check for monthly pattern
    const monthlyPattern = detectMonthlyPattern(groupTasks);
    if (monthlyPattern) {
      suggestions.push({
        task: groupTasks[groupTasks.length - 1],
        pattern: 'monthly'
      });
      return;
    }
  });
  
  return suggestions;
}

/**
 * Detect if tasks follow a daily pattern
 */
function detectDailyPattern(tasks: any[]): boolean {
  if (tasks.length < 3) return false; // Need at least 3 daily tasks to be confident
  
  let isDailyPattern = true;
  for (let i = 1; i < tasks.length; i++) {
    const prevDate = new Date(tasks[i-1].createdAt);
    const currDate = new Date(tasks[i].createdAt);
    
    // Check if tasks are 1-2 days apart (allowing for some flexibility)
    const dayDiff = Math.abs(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (dayDiff < 0.5 || dayDiff > 2) {
      isDailyPattern = false;
      break;
    }
  }
  
  return isDailyPattern;
}

/**
 * Detect if tasks follow a weekly pattern
 */
function detectWeeklyPattern(tasks: any[]): boolean {
  if (tasks.length < 2) return false;
  
  let isWeeklyPattern = true;
  for (let i = 1; i < tasks.length; i++) {
    const prevDate = new Date(tasks[i-1].createdAt);
    const currDate = new Date(tasks[i].createdAt);
    
    // Check if tasks are 6-8 days apart (allowing for some flexibility)
    const dayDiff = Math.abs(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (dayDiff < 6 || dayDiff > 8) {
      isWeeklyPattern = false;
      break;
    }
  }
  
  return isWeeklyPattern;
}

/**
 * Detect if tasks follow a monthly pattern
 */
function detectMonthlyPattern(tasks: any[]): boolean {
  if (tasks.length < 2) return false;
  
  let isMonthlyPattern = true;
  for (let i = 1; i < tasks.length; i++) {
    const prevDate = new Date(tasks[i-1].createdAt);
    const currDate = new Date(tasks[i].createdAt);
    
    // Check if tasks are 28-32 days apart (allowing for month variation)
    const dayDiff = Math.abs(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (dayDiff < 28 || dayDiff > 32) {
      isMonthlyPattern = false;
      break;
    }
  }
  
  return isMonthlyPattern;
} 