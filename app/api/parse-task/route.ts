import * as chrono from 'chrono-node';

// Fallback client-side parser in case the API fails
function fallbackParseTask(text: string) {
  try {
    console.log(`\n[DEBUG] 🔄 Using fallback parser for: "${text}"`);
    
    // Check if user wants to delete/remove tags
    const deleteTagPattern = /\b(delete|remove)\s+tags?\b/i;
    const shouldRemoveTags = deleteTagPattern.test(text);
    
    // Extract tags with # symbol - Updated to handle multiple tags
    const tags: string[] = [];
    
    // Only extract tags if not removing them
    if (!shouldRemoveTags) {
      const tagRegex = /#(\w+)/g;
      let tagMatch;
      
      while ((tagMatch = tagRegex.exec(text)) !== null) {
        tags.push(tagMatch[1]);
        console.log(`[DEBUG] 🏷️ Extracted tag: ${tagMatch[1]}`);
      }
      
      // Also check for "tag is" or "hashtag is" format
      const tagIsMatches = text.match(/(?:tag|hashtag) is (\w+)/gi);
      if (tagIsMatches) {
        tagIsMatches.forEach(match => {
          const tag = match.replace(/(?:tag|hashtag) is /i, '').trim();
          if (!tags.includes(tag)) {
            tags.push(tag);
            console.log(`[DEBUG] 🏷️ Extracted tag from alternative format: ${tag}`);
          }
        });
      }
    } else {
      console.log(`[DEBUG] 🏷️ User requested to remove tags`);
    }
    
    // Extract priority with ! symbol - ONLY if explicitly mentioned
    let priority: "low" | "medium" | "high" | undefined = undefined;
    const priorityMatch = text.match(/!(\w+)/i);
    let explicitPriorityMentioned = false;
    
    if (priorityMatch) {
      explicitPriorityMentioned = true;
      const priorityText = priorityMatch[1].toLowerCase();
      if (priorityText === 'high' || priorityText === 'urgent' || priorityText === 'important') {
        priority = 'high';
      } else if (priorityText === 'medium' || priorityText === 'normal') {
        priority = 'medium';
      } else if (priorityText === 'low') {
        priority = 'low';
      }
      console.log(`[DEBUG] ⚠️ Extracted explicit priority: ${priority}`);
    }
    
    // Look for "priority is" format
    const priorityIsMatch = text.match(/priority is (\w+)/i);
    if (priorityIsMatch && !explicitPriorityMentioned) {
      explicitPriorityMentioned = true;
      const priorityText = priorityIsMatch[1].toLowerCase();
      if (priorityText === 'high' || priorityText === 'urgent' || priorityText === 'important') {
        priority = 'high';
      } else if (priorityText === 'medium' || priorityText === 'normal') {
        priority = 'medium';
      } else if (priorityText === 'low') {
        priority = 'low';
      }
      console.log(`[DEBUG] ⚠️ Extracted priority from alternative format: ${priority}`);
    }
    
    // If no priority was explicitly mentioned, set to null
    if (!explicitPriorityMentioned) {
      priority = undefined;
      console.log(`[DEBUG] ⚠️ No priority mentioned, setting to null`);
    }
    
    // Parse dates
    console.log(`[DEBUG] 📅 Attempting date parsing with chrono...`);
    let dueDate = chrono.parseDate(text);
    let due: string | undefined = undefined;
    
    // Extract task title - improved to avoid including "task description" text
    let taskText = text;
    
    // Remove common task prefixes
    taskText = taskText.replace(/^(?:add |create |make |new |task |todo |to do )/i, '');
    console.log(`[DEBUG] 🔤 After removing prefixes: "${taskText}"`);
    
    // Handle reminder-style inputs
    if (taskText.toLowerCase().startsWith('reminder') || taskText.toLowerCase().startsWith('remind me')) {
      // Try to extract the actual task from reminders
      const reminderMatch = taskText.match(/(?:reminder|remind me)(?:\s+\w+)?\s+(?:of|about|to)\s+(.*?)(?:\s+(?:at|on|by|tomorrow|today|next))?/i);
      
      if (reminderMatch && reminderMatch[1]) {
        taskText = reminderMatch[1].trim();
        console.log(`[DEBUG] 📝 Extracted task from reminder format: "${taskText}"`);
      }
    }
    
    // Extract the main content
    let title = taskText;
    console.log(`[DEBUG] 🔠 Starting title cleanup from: "${title}"`);
    
    // First check if we need to do manual date parsing
    const hasTomorrow = /\btomorrow\b|\btommorrow\b/i.test(text); // Handle misspellings
    const hasMorning = /\bmorning\b/i.test(text);
    const hasAfternoon = /\bafternoon\b/i.test(text);
    const hasEvening = /\bevening\b/i.test(text);
    const hasNight = /\bnight\b/i.test(text);
    
    // Look for time specifications
    const timeMatch = text.match(/\bat\s+(\d+)(?::(\d+))?\s*(am|pm)?/i);
    
    // Special case for common activities - improved pattern matching
    // This new pattern can capture multi-word activities like "play football" or "attend dance class"
    const activityPattern = /\b(play|go to|watch|attend|call|meet|visit|read|write|work on|study)\b\s+([^\s,.!?]+(?:\s+[^\s,.!?]+){0,3})/i;
    const activityMatch = taskText.match(activityPattern);
    
    if (activityMatch) {
      console.log(`[DEBUG] 📝 Found activity pattern: "${activityMatch[0]}"`);
      
      // Extract just the activity verb and object, like "play football"
      const verb = activityMatch[1].trim(); // e.g., "play"
      const object = activityMatch[2].trim(); // e.g., "football"
      title = `${verb} ${object}`;
      
      console.log(`[DEBUG] 📝 Extracted clean activity: verb="${verb}", object="${object}"`);
      console.log(`[DEBUG] 📝 Final activity title: "${title}"`);
    }
    
    // If we extracted a title using the activity pattern, use it
    // Otherwise fall back to the normal date removal approach
    if (!activityMatch) {
      console.log(`[DEBUG] 📝 No specific activity pattern found, removing date references...`);
      // Remove date and time references
      const dateTerms = [
        'today', 'tomorrow', 'tommorrow', 'tonight', 'morning', 'afternoon', 'evening', 'night',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
      ];
      
      dateTerms.forEach(term => {
        const before = title;
        title = title.replace(new RegExp(`\\b${term}\\b.*`, 'i'), '');
        if (before !== title) {
          console.log(`[DEBUG] 📝 Removed date term "${term}": "${title}"`);
        }
      });
      
      // Remove time expressions
      const beforeTimeRemoval = title;
      title = title.replace(/\s+at\s+\d+(?::\d+)?\s*(am|pm)?/i, '');
      if (beforeTimeRemoval !== title) {
        console.log(`[DEBUG] 📝 Removed time expression: "${title}"`);
      }
    }
    
    // Improve title extraction by removing time references
    if (dueDate) {
      // Create a regex to match time expressions
      const timeRegex = /\s+(at|on|by)\s+\d+(?::\d+)?\s*(?:am|pm|a\.m\.|p\.m\.)?/i;
      title = title.replace(timeRegex, '');
      console.log(`[DEBUG] 🔠 After removing time expressions: "${title}"`);
      
      // Remove date references
      const dateTerms = [
        'today', 'tomorrow', 'tonight', 'morning', 'afternoon', 'evening', 'night',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
        'next week', 'next month', 'at', 'on', 'by'
      ];
      
      for (const term of dateTerms) {
        // Use a more precise regex to avoid removing too much text
        const termRegex = new RegExp(`\\b${term}\\b[\\s\\w]*?(\\.|$)`, 'i');
        const beforeReplace = title;
        title = title.replace(termRegex, '');
        if (beforeReplace !== title) {
          console.log(`[DEBUG] 🔠 Removed '${term}' term: "${title}"`);
        }
      }
    }
    
    // Remove metadata indicators from title
    title = title.replace(/#\w+/g, '') // Remove hashtags
           .replace(/!\w+/g, '') // Remove priority markers
           .replace(/tag is \w+/gi, '') // Remove "tag is" format
           .replace(/hashtag is \w+/gi, '') // Remove "hashtag is" format
           .replace(/priority is \w+/gi, '') // Remove "priority is" format
           .replace(/task description/gi, '') // Remove "task description" text
           .replace(/\b(delete|remove)\s+tags?\b/i, '') // Remove "delete tags" pattern
           .trim();
    
    console.log(`[DEBUG] 🔠 After removing tags and priorities: "${title}"`);
    
    // Improve title extraction by looking for action verbs
    const commonVerbs = ['call', 'meet', 'buy', 'write', 'read', 'review', 'finish', 'complete', 'attend', 'schedule', 'book', 'pay', 'clean', 'fix', 'prepare', 'submit', 'send', 'email', 'text', 'make', 'cook', 'bake', 'wash', 'fold', 'organize', 'plan', 'research', 'study', 'practice', 'work on', 'check', 'design', 'play', 'watch', 'visit'];
    
    // If title is still too long, try to extract a cleaner version
    if (title.split(' ').length > 6) {
      for (const verb of commonVerbs) {
        const verbRegex = new RegExp(`\\b${verb}\\b\\s+([\\w\\s]+?)(?:\\s+by|\\s+on|\\s+at|\\s+in|$)`, 'i');
        const match = text.match(verbRegex);
        if (match && match[1]) {
          const extracted = `${verb} ${match[1].trim()}`;
          if (extracted.length < title.length) {
            title = extracted;
            console.log(`[DEBUG] 🔠 Extracted title using verb '${verb}': "${title}"`);
            break;
          }
        }
      }
    }
    
    // Remove multiple spaces and trailing punctuation
    title = title.replace(/\s+/g, ' ').replace(/[,.;:!?]+$/, '').trim();
    
    // Manual date parsing for tomorrow if chrono didn't capture it
    if (!dueDate && hasTomorrow) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      console.log(`[DEBUG] 📆 Created tomorrow date: ${tomorrow}`);
      
      // Set default time based on time of day
      if (hasMorning) {
        tomorrow.setHours(9, 0, 0, 0);
        console.log(`[DEBUG] 🌅 Set morning time (9 AM)`);
      } else if (hasAfternoon) {
        tomorrow.setHours(14, 0, 0, 0);
        console.log(`[DEBUG] 🌇 Set afternoon time (2 PM)`);
      } else if (hasEvening) {
        tomorrow.setHours(18, 0, 0, 0);
        console.log(`[DEBUG] 🌆 Set evening time (6 PM)`);
      } else if (hasNight) {
        tomorrow.setHours(20, 0, 0, 0);
        console.log(`[DEBUG] 🌃 Set night time (8 PM)`);
      } else {
        tomorrow.setHours(9, 0, 0, 0); // Default time if not specified
        console.log(`[DEBUG] ⏱️ Set default time (9 AM)`);
      }
      
      // Override with specific time if present
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const ampm = timeMatch[3]?.toLowerCase();
        
        console.log(`[DEBUG] ⏰ Parsed time components:`, { hour, minute, ampm });
        
        // Adjust hour based on AM/PM
        let adjustedHour = hour;
        if (ampm === 'pm' && hour < 12) {
          adjustedHour += 12;
          console.log(`[DEBUG] 🕑 Adjusted hour for PM: ${hour} → ${adjustedHour}`);
        } else if (ampm === 'am' && hour === 12) {
          adjustedHour = 0;
          console.log(`[DEBUG] 🕛 Adjusted 12 AM to 0 hours`);
        } else if (!ampm && hour < 12 && (hasAfternoon || hasEvening || hasNight)) {
          // If no am/pm specified but context suggests afternoon/evening
          adjustedHour += 12;
          console.log(`[DEBUG] 🕕 Inferred PM based on context: ${hour} → ${adjustedHour}`);
        }
        
        tomorrow.setHours(adjustedHour, minute, 0, 0);
        console.log(`[DEBUG] 🕰️ Set specific time: ${tomorrow}`);
      }
      
      dueDate = tomorrow;
      due = dueDate.toLocaleString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
      console.log(`[DEBUG] 📅 Final due date: ${due}`);
    } else if (dueDate) {
      // Format the due date if it was parsed by chrono
      due = dueDate.toLocaleString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
    }
    
    // Create the result object
    const result = {
      title,
      due,
      tags,
      priority: explicitPriorityMentioned ? priority : undefined,
      dueDate: dueDate ? dueDate.toISOString() : undefined
    };
    
    console.log(`[DEBUG] ✅ Final fallback result: ${JSON.stringify(result, null, 2)}`);
    return result;
  } catch (error) {
    console.error(`[ERROR] ❌ Error in fallback parser:`, error);
    // Return a basic object with just the text as title
    return {
      title: text,
      tags: []
    };
  }
}

// Enhanced debug logging utility
function logApiDebugInfo(text: string, responseData: any, generatedText: string) {
  const debugInfo: {
    timestamp: string;
    inputText: string;
    model: string;
    generatedTokens: string | number;
    rawResponse: string;
    promptUsed: string;
    jsonDetection: {
      hasOpenBrace: boolean;
      hasCloseBrace: boolean;
      firstBraceIndex: number;
      lastBraceIndex: number;
      extractedJson?: string;
    }
  } = {
    timestamp: new Date().toISOString(),
    inputText: text,
    model: responseData.model || 'command-light-nightly',
    generatedTokens: responseData.meta?.billed_units?.generated_tokens || 'unknown',
    rawResponse: generatedText,
    promptUsed: responseData.prompt || 'unknown',
    jsonDetection: {
      hasOpenBrace: generatedText.includes('{'),
      hasCloseBrace: generatedText.includes('}'),
      firstBraceIndex: generatedText.indexOf('{'),
      lastBraceIndex: generatedText.lastIndexOf('}'),
    }
  };
  
  // Get JSON substring if present
  if (debugInfo.jsonDetection.firstBraceIndex >= 0 && debugInfo.jsonDetection.lastBraceIndex >= 0) {
    debugInfo.jsonDetection.extractedJson = generatedText.substring(
      debugInfo.jsonDetection.firstBraceIndex, 
      debugInfo.jsonDetection.lastBraceIndex + 1
    );
  }

  console.log('\n=== API DEBUG INFO ===');
  console.log(JSON.stringify(debugInfo, null, 2));
  console.log('=== END DEBUG INFO ===\n');
  
  return debugInfo;
}

// Helper function to validate and fix JSON data
function validateAndFixParsedData(data: any, originalText: string) {
  console.log("[DEBUG] Validating parsed data:", data);
  
  // Check for explicit tag indicators in the original text
  const hasExplicitTags = originalText.includes('#') || /\btag is\b/i.test(originalText) || /\bhashtag is\b/i.test(originalText);
  
  // Check for explicit priority indicators
  const hasExplicitPriority = originalText.includes('!') || /\bpriority is\b/i.test(originalText);
  
  // Create a new object with the correct structure
  const validatedData: {
    title: string;
    due: string | null;
    tags: string[];
    priority: "high" | "medium" | "low" | null;
    dueDate?: string;
  } = {
    title: typeof data.title === 'string' ? data.title : 
           (data.title ? String(data.title) : ""),
    due: typeof data.due === 'string' ? data.due : 
         (data.due ? String(data.due) : null),
    // Only include tags if explicitly mentioned in original text
    tags: hasExplicitTags ? (Array.isArray(data.tags) ? data.tags : []) : [],
    // Only include priority if explicitly mentioned
    priority: hasExplicitPriority ? data.priority : null
  };
  
  // If we detect "delete tag" pattern, ensure tags is empty
  if (/\b(delete|remove)\s+tags?\b/i.test(originalText)) {
    validatedData.tags = [];
  }
  
  // Improved title extraction from reminder-style inputs
  if (validatedData.title.toLowerCase().startsWith('reminder') || 
      validatedData.title.toLowerCase().startsWith('remind me')) {
    
    // Try to extract the actual task from reminders
    const reminderMatch = validatedData.title.match(/(?:reminder|remind me)(?:\s+\w+)?\s+(?:of|about|to)\s+(.*?)(?:\s+(?:at|on|by|tomorrow|today|next))?/i);
    
    if (reminderMatch && reminderMatch[1]) {
      validatedData.title = reminderMatch[1].trim();
      console.log("[DEBUG] Extracted task from reminder format:", validatedData.title);
    }
  }
  
  // Validate tags are strings and filter out undefined/null values
  if (Array.isArray(validatedData.tags)) {
    validatedData.tags = validatedData.tags
      .filter(tag => tag !== null && tag !== undefined)
      .map(tag => String(tag));
  } else {
    validatedData.tags = [];
  }
  
  // Fix priority if it's an array or invalid value
  if (hasExplicitPriority) {
    if (data.priority === 'high' || data.priority === 'medium' || data.priority === 'low') {
      validatedData.priority = data.priority;
    } else if (Array.isArray(data.priority)) {
      console.log("[DEBUG] Fixing priority from array to string/null");
      
      // If it's an array with a valid value, use the first valid value
      const validPriorities = data.priority.filter(p => 
        p === 'high' || p === 'medium' || p === 'low'
      );
      
      if (validPriorities.length > 0) {
        validatedData.priority = validPriorities[0];
      }
    }
  } else {
    validatedData.priority = null;
  }
  
  // If dueDate exists in input, preserve it
  if (data.dueDate) {
    validatedData.dueDate = data.dueDate;
  }
  
  console.log("[DEBUG] Validated data:", validatedData);
  return validatedData;
}

export async function POST(req: Request) {
  try {
    // Extract the input text from the request body
    const { text } = await req.json();
    
    console.log(`[DEBUG] Received task text: "${text}"`);
    
    if (!text) {
      console.log("[ERROR] Missing text in request body");
      return new Response(JSON.stringify({ 
        error: "Missing 'text' in request body" 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if this looks like a command rather than a task
    const commandPatterns = [
      /change\s+all/i,
      /modify\s+all/i,
      /update\s+all/i,
      /convert\s+all/i,
      /set\s+all/i,
      /edit\s+all/i,
      /delete\s+all/i,
      /remove\s+all/i,
      /switch\s+all/i,
      /hashtag/i,
      /help/i,
      /settings/i,
      /mode/i,
    ];
    
    const isCommand = commandPatterns.some(pattern => pattern.test(text));
    
    if (isCommand) {
      console.log(`[DEBUG] Input looks like a command, not a task: "${text}"`);
      return new Response(JSON.stringify({ 
        isCommand: true,
        title: text,
        due: null,
        tags: [],
        priority: null,
        commandDetected: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare the prompt for Cohere API
    const prompt = `
You are a STRICT task parser that extracts structured task data from natural language.

Given a user's input, return a JSON object with EXACTLY these fields:

{
  "title": "task description (string)",
  "due": "natural language time (string or null)",
  "tags": ["tag1", "tag2"], 
  "priority": "high/medium/low/null"
}

CRITICAL RULES (THESE MUST BE FOLLOWED):
1. Do NOT add ANY explanation or markdown formatting.
2. "title" should extract the CORE task only, not the time/date references.
3. "due" should contain time information if present.
4. "priority" MUST be null UNLESS the text explicitly contains !high, !medium, !low or "priority is" format.
5. "tags" MUST be an empty array ([]) UNLESS the input explicitly contains #tag or "tag is" format.
6. If input contains "delete tag" or "remove tag" pattern, set tags to [].
7. DO NOT infer tags from context - only extract tags marked with # or "tag is".
8. Be intelligent about extracting the main task title - focus on verbs and objects.

For example:
Input: "Buy groceries tomorrow"
Output: {"title":"Buy groceries","due":"tomorrow","tags":[],"priority":null}

Now parse this input: "${text}"`;

    console.log(`[DEBUG] Using prompt: ${prompt}`);

    try {
      // Call the Cohere API for parsing
      console.log("[DEBUG] Sending request to Cohere API...");
      const response = await fetch('https://api.cohere.ai/v1/generate', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.COHERE_API_KEY || 'LFmwVChwQ5nO0dAUFozwhoJDUuhhqIIzfIRGzj69'}`,
        },
        body: JSON.stringify({
          model: 'command-light-nightly',
          prompt,
          max_tokens: 500,
          temperature: 0.2,
          stop_sequences: ["\n\n"],
          return_likelihoods: "NONE",
        }),
      });
      
      console.log(`[DEBUG] API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.error(`[ERROR] Cohere API error: ${response.status} ${response.statusText}`);
        console.log("[DEBUG] Falling back to client-side parser due to API error");
        
        // Use fallback parser
        const fallbackResult = fallbackParseTask(text);
        console.log(`[DEBUG] Fallback result: ${JSON.stringify(fallbackResult)}`);
        return new Response(JSON.stringify(fallbackResult), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const result = await response.json();
      console.log(`[DEBUG] Full API response: ${JSON.stringify(result)}`);
      
      if (!result.generations || !result.generations[0]) {
        console.error("[ERROR] Invalid response from Cohere API:", result);
        
        // Use fallback parser
        const fallbackResult = fallbackParseTask(text);
        console.log(`[DEBUG] Fallback result: ${JSON.stringify(fallbackResult)}`);
        return new Response(JSON.stringify(fallbackResult), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Extract JSON from the generated text
      const generatedText = result.generations[0].text;
      console.log("[DEBUG] Generated text from Cohere:", generatedText);
      
      // Log detailed debug info
      const debugInfo = logApiDebugInfo(text, result, generatedText);
      
      // Check if the response is potentially just echoing our examples
      const isExampleEcho = generatedText.includes('"title": "Submit project report"') || 
                            generatedText.includes('"title": "call mom"') ||
                            generatedText.includes('"title": "Go to the grocery store"');
                            
      if (isExampleEcho) {
        console.log("[WARNING] Detected example echo in response, using fallback parser instead");
        const fallbackResult = fallbackParseTask(text);
        console.log(`[DEBUG] Fallback result: ${JSON.stringify(fallbackResult)}`);
        return new Response(JSON.stringify(fallbackResult), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Continue with normal processing...

      try {
        // Try to parse JSON from the response
        let jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        
        // Handle incomplete JSON (e.g., "{" without closing "}")
        if (generatedText.includes('{') && !generatedText.includes('}')) {
          console.log("[DEBUG] Detected incomplete JSON, completing it...");
          // Complete the incomplete JSON structure
          let fixedJson = generatedText.substring(generatedText.indexOf('{'));
          fixedJson = `${fixedJson}}`;
          
          try {
            const parsedData = JSON.parse(fixedJson);
            console.log("[DEBUG] Successfully fixed incomplete JSON:", parsedData);
            
            // Validate and fix the parsed data
            const validatedData = validateAndFixParsedData(parsedData, text);
            
            // Process the parsed data and return
            if (validatedData.due) {
              const parsedDate = chrono.parseDate(validatedData.due);
              if (parsedDate) {
                validatedData.dueDate = parsedDate.toISOString();
              }
            }
            
            return new Response(JSON.stringify(validatedData), {
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (fixError) {
            console.error("[DEBUG] Failed to fix incomplete JSON:", fixError);
            // Continue to other parsing attempts
          }
        }
        
        if (!jsonMatch) {
          // If no JSON format found, try to clean up the text
          console.log("[DEBUG] No JSON object found, attempting to clean response text:", generatedText);
          
          // Try cleaning the text - command-light-nightly might return differently formatted results
          const cleanedText = generatedText
            .replace(/^```json/, '')
            .replace(/```$/, '')
            .replace(/^```/, '')
            .replace(/JSON:/, '')
            .trim();
            
          // Try again with cleaned text
          jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          
          if (!jsonMatch) {
            console.error("[DEBUG] Could not extract JSON after cleaning. Using fallback parser.");
            const fallbackResult = fallbackParseTask(text);
            return new Response(JSON.stringify(fallbackResult), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
        
        let parsedData;
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
          console.error("[DEBUG] JSON parse error, trying to clean the text further");
          
          // Try to clean the text first
          const cleanedText = jsonMatch[0]
            .replace(/(\w+):/g, '"$1":')  // Add quotes to property names
            .replace(/:\s*'([^']*)'/g, ': "$1"')  // Change single quotes to double quotes for values
            .replace(/:\s*([^",\s\}]+)/g, ': "$1"')  // Add quotes to unquoted values
            .replace(/,\s*\}/g, '}');  // Remove trailing commas
          
          try {
            parsedData = JSON.parse(cleanedText);
          } catch (furtherError) {
            console.error("[DEBUG] Failed to parse JSON after further cleaning, using fallback");
            const fallbackResult = fallbackParseTask(text);
            return new Response(JSON.stringify(fallbackResult), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
        
        // Validate and fix the parsed data
        parsedData = validateAndFixParsedData(parsedData, text);
        
        // Process the date if it exists
        if (parsedData.due) {
          const parsedDate = chrono.parseDate(parsedData.due);
          if (parsedDate) {
            // Add the parsed date as ISO string
            parsedData.dueDate = parsedDate.toISOString();
          }
        }
        
        return new Response(JSON.stringify(parsedData), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (parseError) {
        console.error("Error parsing response:", parseError, "Response was:", generatedText);
        
        // Use fallback parser
        const fallbackResult = fallbackParseTask(text);
        return new Response(JSON.stringify(fallbackResult), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (apiError) {
      console.error("API error:", apiError);
      
      // Use fallback parser
      const fallbackResult = fallbackParseTask(text);
      return new Response(JSON.stringify(fallbackResult), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Error in parse-task API route:", error);
    
    // Last resort fallback - just return a basic object with the text as title
    return new Response(JSON.stringify({ 
      title: typeof error === 'object' && error && 'message' in error ? 
        String(error.message) : String(error),
      tags: []
    }), {
      status: 200, // Return 200 even on error so client doesn't throw
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 