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
  type: 'add' | 'tick' | 'delete' | 'tag' | 'help' | 'unknown' | 'filter' | 'priority';
  taskText?: string;
  tag?: string;
  searchTerm?: string;
  allMatches?: boolean;
  priority?: 'high' | 'medium' | 'low';
  confidence?: number;
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
  
  // If no command matched
  return { type: 'unknown', confidence: 0 };
} 