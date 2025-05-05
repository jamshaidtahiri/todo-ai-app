import axios from "axios";
import * as chrono from "chrono-node";

// Set this to choose which API to use: 'vercel', 'cohere', or 'client'
const API_PROVIDER: 'vercel' | 'cohere' | 'client' = 'cohere';

// Endpoints for different providers
const VERCEL_AI_API_URL = "https://api.vercel.ai/v1/generate";
const COHERE_API_ENDPOINT = "/api/parse-task";

export interface ParsedTask {
  title: string;
  due?: Date;
  tags: string[];
  priority?: "low" | "medium" | "high";
}

/**
 * Extract task information from natural language input using the selected API
 */
export async function parseTaskWithLLM(text: string): Promise<ParsedTask | null> {
  console.log(`📝 Processing input: "${text}"`);
  console.log(`🔌 Using API provider: ${API_PROVIDER}`);
  
  try {
    if (API_PROVIDER === 'vercel') {
      return parseWithVercelAI(text);
    } else if (API_PROVIDER === 'cohere') {
      return parseWithCohereAPI(text);
    } else {
      console.log("🧠 Using client-side parsing (no external API)");
      return clientSideParseTask(text);
    }
  } catch (error) {
    console.error("❌ Error in parseTaskWithLLM:", error);
    return clientSideParseTask(text);
  }
}

/**
 * Parse task using Vercel AI API
 */
async function parseWithVercelAI(text: string): Promise<ParsedTask | null> {
  console.log("🌐 Attempting to use Vercel AI API...");
  try {
    const response = await fetch(VERCEL_AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-instant-1.2",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant that extracts task information from natural language input. 
Extract the task title, due date, tags, and priority from the user input.
Respond only with a JSON object in this format:
{
  "title": "the core task without date/time info",
  "due": "the extracted date and time",
  "tags": ["any hashtags found"],
  "priority": "high, medium, or low priority if specified"
}`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ API response received:", data);
    
    // Extract JSON from the response text
    if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[0];
          const parsed = JSON.parse(jsonStr);
          
          console.log("✅ API response parsed successfully:", parsed);
          
          // Process the parsed data to convert into the right format
          const processedTask: ParsedTask = {
            title: parsed.title || "",
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            priority: parsed.priority as "low" | "medium" | "high" | undefined
          };
          
          // Parse the due date if it exists
          if (parsed.due) {
            const dueDate = chrono.parseDate(parsed.due);
            if (dueDate) {
              processedTask.due = dueDate;
              console.log("📅 Parsed date:", dueDate);
            }
          }
          
          return processedTask;
        } catch (parseError) {
          console.error("❌ Error parsing JSON from API response:", parseError);
        }
      } else {
        console.error("❌ No JSON found in API response:", content);
      }
    } else {
      console.error("❌ Invalid API response structure:", data);
    }
  } catch (apiError) {
    console.error("❌ Vercel API error:", apiError.message);
  }
  return null;
}

/**
 * Parse task using our custom Cohere API endpoint
 */
async function parseWithCohereAPI(text: string): Promise<ParsedTask | null> {
  console.log("🌐 Attempting to use Cohere API...");
  try {
    // Add timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (increased from 10)
    
    const response = await fetch(COHERE_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // Handle response
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error text');
      console.error(`API error: ${response.status}: ${response.statusText}. Details: ${errorText}`);
      console.log("🔄 Falling back to client-side parsing due to API error...");
      return clientSideParseTask(text);
    }

    // Parse the response
    const data = await response.json();
    console.log("✅ API response received:", data);
    
    // Check if we got an error
    if (data.error) {
      console.error("❌ API returned error:", data.error);
      return clientSideParseTask(text);
    }
    
    // Check if the API detected this as a command, not a task
    if (data.commandDetected) {
      console.log("🔍 Command detected, not a task:", data.title);
      // Return null for commands to indicate this is not a task
      return null;
    }
    
    // Process the parsed data to convert into the right format
    const processedTask: ParsedTask = {
      title: data.title || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      priority: data.priority as "low" | "medium" | "high" | undefined
    };
    
    // Parse the due date if it exists
    if (data.due || data.dueDate) {
      const dueStr = data.dueDate || data.due;
      let dueDate: Date | null = null;
      
      if (dueStr) {
        if (dueStr.includes('T')) {
          // This looks like an ISO string
          dueDate = new Date(dueStr);
        } else {
          // Try to parse it with chrono
          dueDate = chrono.parseDate(dueStr);
        }
        
        if (dueDate) {
          processedTask.due = dueDate;
          console.log("📅 Parsed date:", dueDate);
        }
      }
    }
    
    return processedTask;
  } catch (apiError) {
    console.error("❌ Cohere API error:", apiError.message);
    console.log("🔄 Falling back to client-side parsing...");
    return clientSideParseTask(text);
  }
}

/**
 * Client-side natural language parser for tasks
 * Extracts task details from natural language input
 */
function clientSideParseTask(text: string): ParsedTask | null {
  try {
    console.log("🔍 Using client-side parser for:", text);
    
    // Check if user wants to delete/remove tags
    const deleteTagPattern = /\b(delete|remove)\s+tags?\b/i;
    const shouldRemoveTags = deleteTagPattern.test(text);
    
    // Extract tags with # symbol - Updated to handle multiple tags
    const tags: string[] = [];
    
    // Only try to extract tags if not removing them
    if (!shouldRemoveTags) {
      const tagRegex = /#(\w+)/g;
      let tagMatch;
      
      while ((tagMatch = tagRegex.exec(text)) !== null) {
        tags.push(tagMatch[1]);
        console.log(`🏷️ Extracted tag: ${tagMatch[1]}`);
      }
      
      // Also check for "tag is" or "hashtag is" format
      const tagIsMatches = text.match(/(?:tag|hashtag) is (\w+)/gi);
      if (tagIsMatches) {
        tagIsMatches.forEach(match => {
          const tag = match.replace(/(?:tag|hashtag) is /i, '').trim();
          if (!tags.includes(tag)) {
            tags.push(tag);
            console.log(`🏷️ Extracted tag from alternative format: ${tag}`);
          }
        });
      }
    } else {
      console.log(`🏷️ User requested to remove tags`);
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
      console.log(`⚠️ Extracted explicit priority: ${priority}`);
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
      console.log(`⚠️ Extracted priority from alternative format: ${priority}`);
    }
    
    // Parse dates
    const dueDate = chrono.parseDate(text);
    if (dueDate) {
      console.log(`📅 Extracted due date: ${dueDate}`);
    }
    
    // Extract task title - improved to avoid including "task description" text
    let taskText = text;
    
    // Remove common task prefixes
    taskText = taskText.replace(/^(?:add |create |make |new |task |todo |to do )/i, '');
    console.log(`🔤 After removing prefixes: "${taskText}"`);
    
    // Handle reminder-style inputs
    if (taskText.toLowerCase().startsWith('reminder') || taskText.toLowerCase().startsWith('remind me')) {
      // Try to extract the actual task from reminders
      const reminderMatch = taskText.match(/(?:reminder|remind me)(?:\s+\w+)?\s+(?:of|about|to)\s+(.*?)(?:\s+(?:at|on|by|tomorrow|today|next))?/i);
      
      if (reminderMatch && reminderMatch[1]) {
        taskText = reminderMatch[1].trim();
        console.log(`📝 Extracted task from reminder format: "${taskText}"`);
      }
    }
    
    // Check for special activity patterns
    const activityPattern = /\b(play|go to|watch|attend|call|meet|visit|read|write|work on|study)\b\s+([^\s,.!?]+(?:\s+[^\s,.!?]+){0,3})/i;
    const activityMatch = taskText.match(activityPattern);
    
    let title = taskText;
    
    if (activityMatch) {
      console.log(`🔠 Found activity pattern: "${activityMatch[0]}"`);
      const verb = activityMatch[1].trim();
      const object = activityMatch[2].trim();
      title = `${verb} ${object}`;
      console.log(`🔠 Extracted activity: "${title}"`);
    } else {
      // Improve title extraction by removing time references
      if (dueDate) {
        // Create a regex to match time expressions
        const timeRegex = /\s+(at|on|by)\s+\d+(?::\d+)?\s*(?:am|pm|a\.m\.|p\.m\.)?/i;
        title = title.replace(timeRegex, '');
        console.log(`🔠 After removing time expressions: "${title}"`);
        
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
            console.log(`🔠 Removed '${term}' term: "${title}"`);
          }
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
    
    console.log(`🔠 After removing tags and priorities: "${title}"`);
    
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
            console.log(`🔠 Extracted title using verb '${verb}': "${title}"`);
            break;
          }
        }
      }
    }
    
    // Remove multiple spaces and trailing punctuation
    title = title.replace(/\s+/g, ' ').replace(/[,.;:!?]+$/, '').trim();
    
    const result: ParsedTask = {
      title,
      tags, // No tags if shouldRemoveTags is true (will be empty array)
      priority: explicitPriorityMentioned ? priority : undefined
    };
    
    if (dueDate) {
      result.due = dueDate;
    }
    
    console.log("✅ Parsed task:", result);
    return result;
  } catch (err) {
    console.error("❌ Error in clientSideParseTask:", err);
    return null;
  }
} 