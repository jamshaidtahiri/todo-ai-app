const apiKey = 'LFmwVChwQ5nO0dAUFozwhoJDUuhhqIIzfIRGzj69';

export async function classifyTask(text: string): Promise<string> {
  const res = await fetch('https://api.cohere.ai/classify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'embed-english-v3.0',
      inputs: [text],
      examples: [
        { text: 'Buy groceries', label: 'errand' },
        { text: 'Write report', label: 'work' },
        { text: 'Do push-ups', label: 'fitness' },
        { text: 'Read Quran', label: 'spiritual' },
        { text: 'Call John', label: 'social' },
        { text: 'Pay bills', label: 'finance' },
        { text: 'Clean house', label: 'home' },
        { text: 'Study for exam', label: 'education' },
        { text: 'Doctor appointment', label: 'health' },
        { text: 'Go shopping', label: 'errand' },
      ]
    })
  });
  const data = await res.json();
  return data.classifications?.[0]?.prediction || 'general';
}

export async function classifyCommand(text: string): Promise<{ 
  intent: string; 
  confidence: number;
  entities: {
    taskText?: string;
    tag?: string;
    priority?: string;
    searchTerm?: string;
  }
}> {
  try {
    const res = await fetch('https://api.cohere.ai/v1/classify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'embed-english-v3.0',
        inputs: [text],
        examples: [
          { text: 'Add new task buy milk', label: 'add_task' },
          { text: 'I need to buy groceries', label: 'add_task' },
          { text: 'Remember to call mom', label: 'add_task' },
          { text: 'Create task write report for work', label: 'add_task' },
          { text: 'Complete the task about milk', label: 'complete_task' },
          { text: 'Mark buy groceries as done', label: 'complete_task' },
          { text: 'Tick off doctor appointment', label: 'complete_task' },
          { text: 'Finish task about report', label: 'complete_task' },
          { text: 'Remove task about dentist', label: 'delete_task' },
          { text: 'Delete the grocery list item', label: 'delete_task' },
          { text: 'Erase meeting with John', label: 'delete_task' },
          { text: 'Get rid of workout task', label: 'delete_task' },
          { text: 'Change tag of grocery to shopping', label: 'change_tag' },
          { text: 'Move task workout to fitness category', label: 'change_tag' },
          { text: 'Make report high priority', label: 'set_priority' },
          { text: 'Set doctor appointment to urgent', label: 'set_priority' },
          { text: 'Show me all work tasks', label: 'filter_tasks' },
          { text: 'Filter by fitness category', label: 'filter_tasks' },
          { text: 'What commands can I use?', label: 'help' },
          { text: 'Help me with task commands', label: 'help' },
        ]
      })
    });
    
    const data = await res.json();
    const prediction = data.classifications?.[0]?.prediction || 'unknown';
    const confidence = data.classifications?.[0]?.confidence || 0;
    
    // Extract entities
    let entities: any = {};
    
    // Simple NLP to extract task text, tags, priorities
    if (prediction === 'add_task') {
      // Extract task text - look for patterns after add, create, remember, need to, etc.
      const taskMatches = text.match(/(?:add|create|remember|need to)\s+(.*?)(?:\s*#|\s*$)/i);
      entities.taskText = taskMatches ? taskMatches[1].trim() : text;
      
      // Extract tag if present with # symbol
      const tagMatch = text.match(/#(\w+)/);
      if (tagMatch) entities.tag = tagMatch[1];
      
      // Look for priority indicators
      if (text.includes('urgent') || text.includes('important') || text.includes('high priority')) {
        entities.priority = 'high';
      }
    } else if (prediction === 'complete_task' || prediction === 'delete_task') {
      // Extract search term - what comes after complete, mark, finish, delete, remove, etc.
      const searchMatches = text.match(/(?:complete|mark|tick|finish|delete|remove|erase)\s+(.*?)(?:\s+as\s+done|\s*$)/i);
      entities.searchTerm = searchMatches ? searchMatches[1].trim() : '';
    } else if (prediction === 'change_tag') {
      // Extract task reference and new tag
      const changeTagMatch = text.match(/(?:change|set|move)(?:\s+tag\s+of)?\s+(.*?)(?:\s+to\s+|\s+as\s+)(\w+)/i);
      if (changeTagMatch) {
        entities.searchTerm = changeTagMatch[1].trim();
        entities.tag = changeTagMatch[2].trim();
      }
    } else if (prediction === 'set_priority') {
      // Extract task reference and priority level
      const priorityMatch = text.match(/(?:set|make)\s+(.*?)(?:\s+to\s+|\s+as\s+)(\w+)(?:\s+priority)?/i);
      if (priorityMatch) {
        entities.searchTerm = priorityMatch[1].trim();
        const priorityTerm = priorityMatch[2].toLowerCase();
        
        if (['urgent', 'high', 'important'].includes(priorityTerm)) {
          entities.priority = 'high';
        } else if (['medium', 'normal', 'moderate'].includes(priorityTerm)) {
          entities.priority = 'medium';
        } else if (['low', 'minor'].includes(priorityTerm)) {
          entities.priority = 'low';
        }
      }
    } else if (prediction === 'filter_tasks') {
      // Extract filter category
      const filterMatch = text.match(/(?:show|filter|display)\s+(?:by\s+)?(?:all\s+)?(\w+)(?:\s+tasks|\s+category)?/i);
      if (filterMatch) {
        entities.tag = filterMatch[1].trim();
      }
    }
    
    return {
      intent: prediction,
      confidence,
      entities
    };
  } catch (error) {
    console.error('Error classifying command:', error);
    return {
      intent: 'unknown',
      confidence: 0,
      entities: {}
    };
  }
}

export async function generateTaskSuggestions(context: string[]): Promise<string[]> {
  try {
    const res = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'command',
        prompt: `Based on the following tasks a user has created, suggest 3 relevant new tasks they might want to add:\n\n${context.join('\n')}\n\nSuggested tasks:`,
        max_tokens: 150,
        temperature: 0.7,
        stop_sequences: ["\n\n"]
      })
    });
    
    const data = await res.json();
    if (!data.generations || data.generations.length === 0) {
      return [];
    }
    
    // Parse the generated text into individual task suggestions
    const generatedText = data.generations[0].text;
    const suggestions = generatedText
      .split('\n')
      .map(s => s.replace(/^\d+\.\s*/, '').trim())  // Remove numbering
      .filter(s => s && s.length > 0);              // Remove empty lines
    
    return suggestions.slice(0, 3);  // Limit to 3 suggestions
  } catch (error) {
    console.error('Error generating task suggestions:', error);
    return [];
  }
}
  