import { useState, useEffect, useCallback } from 'react';
import { SetStateAction, Dispatch } from 'react';

type Reminder = {
  id: string;
  time: number;
  notified: boolean;
  type: 'absolute' | 'relative';
};

// Make Task type compatible with the one in page.tsx
type Task = {
  id: string;
  text: string;
  done: boolean;
  tag?: string;
  tags?: string[];
  createdAt: number;
  priority?: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'archived';
  dueDate?: number;
  reminders?: Reminder[];
  notes?: string;
  subtasks?: {
    id: string;
    text: string;
    done: boolean;
  }[];
  recurring?: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    daysOfWeek?: number[];
    endDate?: number;
  };
  project?: string;
  category?: string;
};

export const useReminderCheck = (
  tasks: Task[],
  onTasksUpdate: Dispatch<SetStateAction<Task[]>>,
  intervalMs: number = 60000 // Check every minute by default
) => {
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());

  const checkReminders = useCallback(() => {
    const now = Date.now();
    let tasksUpdated = false;
    
    // Only check if there's been a reasonable time gap
    if (now - lastCheckTime < 5000) return;
    
    setLastCheckTime(now);
    
    const updatedTasks = tasks.map(task => {
      if (task.reminders && task.reminders.length > 0) {
        const updatedReminders = task.reminders.map(reminder => {
          if (!reminder.notified && reminder.time <= now) {
            console.log(`Triggering reminder for task: ${task.text}`);
            
            // Show notification
            if (typeof window !== 'undefined' && 
                'Notification' in window && 
                Notification.permission === 'granted') {
              try {
                new Notification('Task Reminder', {
                  body: `Reminder for: ${task.text}`,
                  icon: '/icon.png'
                });
              } catch (err) {
                console.error('Failed to send notification:', err);
              }
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
      onTasksUpdate(updatedTasks);
    }
  }, [tasks, lastCheckTime, onTasksUpdate]);

  // Setup the interval
  useEffect(() => {
    // Check once immediately when the component mounts
    checkReminders();
    
    // Set up the interval for future checks
    const intervalId = setInterval(checkReminders, intervalMs);
    
    // Request notification permissions
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
    
    return () => clearInterval(intervalId);
  }, [checkReminders, intervalMs]);

  return {
    checkReminders // Expose the function to manually trigger checks
  };
}; 