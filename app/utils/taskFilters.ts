/**
 * Filter and sort tasks
 */
export function filterAndSortTasks({ 
  tasks,
  tag = null,
  project = null,
  category = null,
  sortBy = 'priority'
}: {
  tasks: any[],
  tag?: string | null,
  project?: string | null,
  category?: string | null,
  sortBy?: 'priority' | 'dueDate' | 'createdAt' | 'alphabetical'
}): any[] {
  // Start with a copy of all tasks
  let filteredTasks = [...tasks];
  
  // Apply category filter
  if (category !== null) {
    filteredTasks = filteredTasks.filter(t => t.category === category);
  }
  
  // Apply tag filter
  if (tag !== null) {
    filteredTasks = filteredTasks.filter(t => {
      // Check both the old tag field and the new tags array
      return t.tag === tag || (t.tags && t.tags.includes(tag));
    });
  }
  
  // Apply project filter
  if (project !== null) {
    filteredTasks = filteredTasks.filter(t => t.project === project);
  }
  
  // Sort by the selected criteria
  switch (sortBy) {
    case 'priority':
      filteredTasks = filteredTasks.sort((a, b) => {
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
      break;
    case 'dueDate':
      filteredTasks = filteredTasks.sort((a, b) => {
        // Sort completed tasks to the bottom
        if (a.done !== b.done) return a.done ? 1 : -1;
        
        // Sort tasks with due dates first, then by due date (soonest first)
        const aHasDue = a.dueDate !== undefined;
        const bHasDue = b.dueDate !== undefined;
        
        if (aHasDue !== bHasDue) return aHasDue ? -1 : 1;
        if (aHasDue && bHasDue) return (a.dueDate || 0) - (b.dueDate || 0);
        
        // Then sort by creation date (newest first)
        return b.createdAt - a.createdAt;
      });
      break;
    case 'alphabetical':
      filteredTasks = filteredTasks.sort((a, b) => {
        // Sort completed tasks to the bottom
        if (a.done !== b.done) return a.done ? 1 : -1;
        
        // Sort by title alphabetically
        return a.text.localeCompare(b.text);
      });
      break;
    case 'createdAt':
    default:
      filteredTasks = filteredTasks.sort((a, b) => {
        // Sort completed tasks to the bottom
        if (a.done !== b.done) return a.done ? 1 : -1;
        
        // Sort by creation date (newest first)
        return b.createdAt - a.createdAt;
      });
  }
  
  return filteredTasks;
} 