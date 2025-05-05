import { useState, useEffect, useCallback, useRef } from 'react';
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

/**
 * Hook to check for upcoming reminders and trigger notifications
 * @param tasks List of tasks with reminders
 * @param onTasksUpdate Callback to update tasks when reminders are triggered
 * @param intervalMs Interval to check for reminders (default: 60 seconds)
 */
export const useReminderCheck = (
  tasks: Task[],
  onTasksUpdate: Dispatch<SetStateAction<Task[]>>,
  intervalMs: number = 60000 // Check every minute by default
) => {
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());
  const hasRequestedPermission = useRef(false);
  
  // Request notification permissions once
  useEffect(() => {
    if (typeof window !== 'undefined' && 
        'Notification' in window && 
        !hasRequestedPermission.current &&
        Notification.permission !== 'granted' && 
        Notification.permission !== 'denied') {
      
      hasRequestedPermission.current = true;
      
      try {
        Notification.requestPermission().then((permission) => {
          console.log(`Notification permission ${permission}`);
        }).catch(err => {
          console.error('Error requesting notification permission:', err);
        });
      } catch (error) {
        // Handle browsers that don't support Promise-based API
        Notification.requestPermission();
      }
    }
  }, []);
  
  // Function to show notifications
  const showNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: '/icon.png',
          silent: false
        });
        
        // Auto close after 10 seconds
        setTimeout(() => notification.close(), 10000);
        
        // Click handler
        notification.onclick = function() {
          window.focus();
          notification.close();
        };
        
        return true;
      } catch (err) {
        console.error('Failed to send notification:', err);
        return false;
      }
    }
    return false;
  }, []);

  const checkReminders = useCallback(() => {
    const now = Date.now();
    let tasksUpdated = false;
    
    // Only check if there's been a reasonable time gap
    if (now - lastCheckTime < 5000) return;
    
    setLastCheckTime(now);
    
    // Get tasks with pending reminders
    const tasksWithPendingReminders = tasks.filter(
      task => task.reminders?.some(r => !r.notified && r.time <= now)
    );
    
    if (tasksWithPendingReminders.length === 0) return;
    
    const updatedTasks = tasks.map(task => {
      if (task.reminders && task.reminders.length > 0) {
        const hasTriggeredReminders = task.reminders.some(r => !r.notified && r.time <= now);
        
        if (hasTriggeredReminders) {
          // Show notification for this task's reminders
          if (task.status !== 'completed' && task.status !== 'archived') {
            showNotification('Task Reminder', `Reminder for: ${task.text}`);
          }
          
          // Mark reminders as notified
          const updatedReminders = task.reminders.map(reminder => {
            if (!reminder.notified && reminder.time <= now) {
              console.log(`Triggering reminder for task: ${task.text} at ${new Date(reminder.time).toLocaleString()}`);
              return { ...reminder, notified: true };
            }
            return reminder;
          });
          
          tasksUpdated = true;
          return { ...task, reminders: updatedReminders };
        }
      }
      return task;
    });
    
    if (tasksUpdated) {
      onTasksUpdate(updatedTasks);
    }
  }, [tasks, lastCheckTime, onTasksUpdate, showNotification]);

  // Setup the interval
  useEffect(() => {
    // Check once immediately when the component mounts
    checkReminders();
    
    // Set up the interval for future checks
    const intervalId = setInterval(checkReminders, intervalMs);
    
    return () => clearInterval(intervalId);
  }, [checkReminders, intervalMs]);

  // Manual check function (useful for testing or when user comes back to the app)
  const checkRemindersNow = useCallback(() => {
    setLastCheckTime(0); // Force a check by resetting last check time
    checkReminders();
  }, [checkReminders]);

  return {
    checkRemindersNow,
    hasNotificationPermission: typeof window !== 'undefined' && 
                               'Notification' in window && 
                               Notification.permission === 'granted'
  };
}; 