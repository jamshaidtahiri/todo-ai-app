/**
 * Utilities for detecting and resolving task conflicts
 */

type Task = {
  id: string;
  text: string;
  done: boolean;
  tag: string;
  createdAt: number;
  priority?: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'archived';
  dueDate?: number;
  estimatedDuration?: number; // Duration in minutes
  startTime?: number; // Optional explicit start time
};

type ConflictResult = {
  hasConflict: boolean;
  conflictingTasks: Task[];
  suggestedTime?: number; // Suggested alternative time
};

/**
 * Detect if a task conflicts with existing tasks based on time overlap
 */
export function detectConflicts(
  newTask: Task, 
  existingTasks: Task[],
  defaultDuration: number = 60 // Default duration in minutes if not specified
): ConflictResult {
  // If no due date or start time, no conflict
  if (!newTask.dueDate) return { hasConflict: false, conflictingTasks: [] };
  
  const taskStartTime = newTask.startTime || newTask.dueDate;
  const taskEndTime = taskStartTime + (newTask.estimatedDuration || defaultDuration) * 60 * 1000;
  
  // Find conflicting tasks
  const conflictingTasks = existingTasks.filter(task => {
    // Skip completed or archived tasks
    if (task.done || task.status === 'archived') return false;
    
    // Skip tasks without timing info
    if (!task.dueDate) return false;
    
    // Check for overlap
    const existingStartTime = task.startTime || task.dueDate;
    const existingEndTime = existingStartTime + (task.estimatedDuration || defaultDuration) * 60 * 1000;
    
    // Check if there's an overlap
    return (
      (taskStartTime >= existingStartTime && taskStartTime < existingEndTime) || // New task starts during existing
      (taskEndTime > existingStartTime && taskEndTime <= existingEndTime) || // New task ends during existing
      (taskStartTime <= existingStartTime && taskEndTime >= existingEndTime) // New task completely overlaps existing
    );
  });
  
  if (conflictingTasks.length === 0) {
    return { hasConflict: false, conflictingTasks: [] };
  }
  
  // Find a suggested time
  const suggestedTime = findNextAvailableSlot(
    newTask, 
    existingTasks, 
    newTask.estimatedDuration || defaultDuration
  );
  
  return {
    hasConflict: true,
    conflictingTasks,
    suggestedTime
  };
}

/**
 * Find the next available time slot for a task
 */
function findNextAvailableSlot(
  task: Task, 
  existingTasks: Task[],
  durationMinutes: number
): number {
  const startTime = task.dueDate || Date.now();
  const endTime = startTime + durationMinutes * 60 * 1000;
  
  // Create a sorted list of all existing tasks by start time
  const sortedTasks = existingTasks
    .filter(t => t.dueDate && !t.done && t.status !== 'archived')
    .sort((a, b) => (a.startTime || a.dueDate || 0) - (b.startTime || b.dueDate || 0));
  
  if (sortedTasks.length === 0) {
    return startTime; // No other tasks, use the original time
  }
  
  // Check if the original time works
  let conflicts = detectConflicts(task, sortedTasks, durationMinutes).hasConflict;
  if (!conflicts) {
    return startTime;
  }
  
  // Find gaps between tasks
  let currentEnd = endTime;
  
  for (const existingTask of sortedTasks) {
    const taskStart = existingTask.startTime || existingTask.dueDate || 0;
    const taskEnd = taskStart + (existingTask.estimatedDuration || durationMinutes) * 60 * 1000;
    
    // If there's a gap between the current end time and the next task's start time
    if (currentEnd + durationMinutes * 60 * 1000 <= taskStart) {
      // Found a gap, check if it works
      const potentialTask = {
        ...task,
        startTime: currentEnd,
        dueDate: currentEnd
      };
      
      if (!detectConflicts(potentialTask, sortedTasks, durationMinutes).hasConflict) {
        return currentEnd;
      }
    }
    
    // Update current end time to the later of the two
    currentEnd = Math.max(currentEnd, taskEnd);
  }
  
  // If no suitable gap found, suggest a time after all existing tasks
  return currentEnd;
}

/**
 * Suggest an optimal time for a task based on user activity patterns
 * and existing tasks
 */
export function suggestOptimalTime(
  task: Task, 
  existingTasks: Task[],
  userPreferences: {
    workingHours?: { start: number, end: number }; // Hours in 24h format
    focusTime?: { start: number, end: number };
    typicalDays?: number[]; // Days of week (0 = Sunday)
  } = {}
): number {
  const now = new Date();
  const taskTag = task.tag.toLowerCase();
  
  // Default working hours (9 AM to 6 PM)
  const workStart = userPreferences.workingHours?.start || 9;
  const workEnd = userPreferences.workingHours?.end || 18;
  
  // Create a list of potential times
  const potentialTimes: number[] = [];
  
  // Add the next 7 days as potential times
  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    // Skip to specified days if provided
    if (userPreferences.typicalDays && 
        userPreferences.typicalDays.length > 0 && 
        !userPreferences.typicalDays.includes(date.getDay())) {
      continue;
    }
    
    // Different times based on task type
    if (taskTag === 'work') {
      // Work tasks during work hours
      const workDate = new Date(date);
      workDate.setHours(workStart + 1, 0, 0, 0); // 1 hour after work starts
      potentialTimes.push(workDate.getTime());
    } else if (taskTag === 'errand') {
      // Errands in the afternoon
      const errandDate = new Date(date);
      errandDate.setHours(15, 0, 0, 0); // 3 PM
      potentialTimes.push(errandDate.getTime());
    } else if (taskTag === 'fitness') {
      // Fitness in the morning or evening
      const morningDate = new Date(date);
      morningDate.setHours(7, 0, 0, 0); // 7 AM
      potentialTimes.push(morningDate.getTime());
      
      const eveningDate = new Date(date);
      eveningDate.setHours(18, 0, 0, 0); // 6 PM
      potentialTimes.push(eveningDate.getTime());
    } else if (taskTag === 'social') {
      // Social in the evening or weekend
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      if (isWeekend) {
        const noonDate = new Date(date);
        noonDate.setHours(12, 0, 0, 0); // Noon
        potentialTimes.push(noonDate.getTime());
      } else {
        const eveningDate = new Date(date);
        eveningDate.setHours(19, 0, 0, 0); // 7 PM
        potentialTimes.push(eveningDate.getTime());
      }
    } else {
      // Default - during work hours
      const defaultDate = new Date(date);
      defaultDate.setHours(workStart + 2, 0, 0, 0); // 2 hours after work starts
      potentialTimes.push(defaultDate.getTime());
    }
  }
  
  // Find first time without conflicts
  for (const potentialTime of potentialTimes) {
    const potentialTask = {
      ...task,
      dueDate: potentialTime,
      startTime: potentialTime
    };
    
    if (!detectConflicts(potentialTask, existingTasks).hasConflict) {
      return potentialTime;
    }
  }
  
  // If no good time found, suggest the first potential time and let user handle conflicts
  return potentialTimes[0] || now.getTime();
}

/**
 * Generate a summary of tasks for a given day or week
 */
export function generateTaskSummary(
  tasks: Task[],
  period: 'today' | 'tomorrow' | 'week',
  includeCompleted: boolean = false
): { 
  totalTasks: number; 
  completedTasks: number;
  highPriorityTasks: Task[];
  upcomingDeadlines: Task[];
  byTag: Record<string, Task[]>;
  timeRequired: number; // Estimated minutes required
} {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let endDate: Date;
  
  if (period === 'today') {
    endDate = new Date(startOfDay);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === 'tomorrow') {
    endDate = new Date(startOfDay);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(23, 59, 59, 999);
  } else { // week
    endDate = new Date(startOfDay);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);
  }
  
  // Filter tasks for the period
  const filteredTasks = tasks.filter(task => {
    if (!includeCompleted && (task.done || task.status === 'archived')) return false;
    
    if (!task.dueDate) return false;
    
    const taskDate = new Date(task.dueDate);
    return taskDate >= startOfDay && taskDate <= endDate;
  });
  
  // Group by tag
  const byTag: Record<string, Task[]> = {};
  filteredTasks.forEach(task => {
    if (!byTag[task.tag]) {
      byTag[task.tag] = [];
    }
    byTag[task.tag].push(task);
  });
  
  // Calculate time required
  const timeRequired = filteredTasks.reduce((total, task) => {
    return total + (task.estimatedDuration || 60); // Default to 60 minutes
  }, 0);
  
  return {
    totalTasks: filteredTasks.length,
    completedTasks: filteredTasks.filter(t => t.done).length,
    highPriorityTasks: filteredTasks.filter(t => t.priority === 'high'),
    upcomingDeadlines: filteredTasks.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0)),
    byTag,
    timeRequired
  };
} 