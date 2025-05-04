/**
 * Returns the appropriate CSS classes for a given task tag.
 */
export function getTagColor(tag: string): string {
  const tagColors: Record<string, string> = {
    'work': 'bg-blue-100 text-blue-800',
    'errand': 'bg-green-100 text-green-800',
    'fitness': 'bg-orange-100 text-orange-800',
    'spiritual': 'bg-purple-100 text-purple-800',
    'general': 'bg-gray-100 text-gray-800'
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
    // Then sort by creation date (newest first)
    return b.createdAt - a.createdAt;
  });
}

/**
 * Command parsing for the agentic interface
 */
export interface CommandResult {
  type: 'add' | 'tick' | 'delete' | 'tag' | 'help' | 'unknown';
  taskText?: string;
  tag?: string;
  searchTerm?: string;
  allMatches?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export function parseCommand(input: string): CommandResult {
  const text = input.trim().toLowerCase();

  // Help command
  if (text === 'help' || text === 'commands') {
    return { type: 'help' };
  }

  // Add task with specific tag
  // Formats: "add [task] #[tag]" or "add [task] as [tag]"
  if (text.startsWith('add ')) {
    const taskText = text.substring(4).trim();
    
    // Check for hashtag format: "add buy groceries #errand"
    const hashtagMatch = taskText.match(/^(.*?)(?:\s+#(\w+))?$/);
    if (hashtagMatch && hashtagMatch[2]) {
      return { 
        type: 'add', 
        taskText: hashtagMatch[1].trim(),
        tag: hashtagMatch[2].toLowerCase()
      };
    }
    
    // Check for "as" format: "add buy groceries as errand"
    const asMatch = taskText.match(/^(.*?)\s+as\s+(\w+)$/);
    if (asMatch) {
      return { 
        type: 'add', 
        taskText: asMatch[1].trim(),
        tag: asMatch[2].toLowerCase()
      };
    }
    
    // Priority format: "add buy groceries !high"
    const priorityMatch = taskText.match(/^(.*?)\s+!(\w+)$/);
    if (priorityMatch) {
      const priority = priorityMatch[2].toLowerCase() as 'high' | 'medium' | 'low';
      return {
        type: 'add',
        taskText: priorityMatch[1].trim(),
        priority: ['high', 'medium', 'low'].includes(priority) ? priority : undefined
      };
    }
    
    // Default add with no tag specified
    return { type: 'add', taskText };
  }

  // Complete tasks
  // Formats: "tick [text]", "tick all [text]", "complete [text]"
  if (text.startsWith('tick ') || text.startsWith('complete ')) {
    const withoutCommand = text.startsWith('tick ') 
      ? text.substring(5).trim() 
      : text.substring(9).trim();
    
    // Handle "tick all" command
    if (withoutCommand.startsWith('all ')) {
      return { 
        type: 'tick', 
        searchTerm: withoutCommand.substring(4).trim(),
        allMatches: true
      };
    }
    
    return { type: 'tick', searchTerm: withoutCommand };
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
        allMatches: true
      };
    }
    
    return { type: 'delete', searchTerm: withoutCommand };
  }
  
  // Tag tasks
  // Format: "tag [text] as [tag]"
  if (text.startsWith('tag ')) {
    const match = text.match(/^tag\s+(.*?)\s+as\s+(\w+)$/);
    if (match) {
      return { 
        type: 'tag', 
        searchTerm: match[1].trim(),
        tag: match[2].toLowerCase()
      };
    }
  }
  
  // If no command matched
  return { type: 'unknown' };
} 