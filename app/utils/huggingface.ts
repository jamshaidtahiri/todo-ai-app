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
  reminder?: Date;
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
          
          // Check for reminder phrases and set a reminder 30 minutes before due date
          const reminderKeywords = ['remind', 'alert', 'notification', 'notify'];
          if (reminderKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
            const reminderTime = new Date(dueDate.getTime());
            reminderTime.setMinutes(reminderTime.getMinutes() - 30);
            processedTask.reminder = reminderTime;
            console.log("🔔 Set reminder for:", reminderTime);
          }
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
    
    // Extract due date - MAKE THESE IMPROVEMENTS
    const origDateText = text;
    let date: Date | null = null;
    
    // First, check for reminder patterns
    let reminderDate: Date | null = null;
    const reminderPatterns = [
      /\bremind(?:er)?\s+(?:me|us)?\s+(.+?)(?:\s+to\s+|\s+of\s+|\s+about\s+|\s*$)/i,
      /\balert\s+(?:me|us)?\s+(?:in|at|on|about)\s+(.+?)(?:\s+to\s+|\s+of\s+|\s+about\s+|\s*$)/i,
      /\bnotify\s+(?:me|us)?\s+(?:in|at|on|about)\s+(.+?)(?:\s+to\s+|\s+of\s+|\s+about\s+|\s*$)/i
    ];
    
    for (const pattern of reminderPatterns) {
      const match = origDateText.match(pattern);
      if (match && match[1]) {
        // Try to parse the reminder time
        const reminderText = match[1].trim();
        console.log(`🔔 Found reminder text: "${reminderText}"`);
        
        // Parse the reminder date
        reminderDate = chrono.parseDate(reminderText);
        if (reminderDate) {
          console.log(`🔔 Parsed reminder date: ${reminderDate}`);
          break;
        }
      }
    }
    
    // Now extract the task title, being careful to remove reminder text
    let title = origDateText;
    
    // Remove reminder patterns from the title
    for (const pattern of reminderPatterns) {
      title = title.replace(pattern, '');
    }
    
    // Remove date/time references from title (common patterns)
    const datePatterns = [
      /\b(today|tomorrow|yesterday)\b/gi,
      /\b(next|this|coming|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|year)\b/gi,
      /\b(in|after|before|around|at)\s+\d+\s+(minutes?|hours?|days?|weeks?|months?|years?)\b/gi,
      /\b(at|on|before|after)\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi,
      /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/gi,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(st|nd|rd|th)?\b/gi,
      /\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi
    ];
    
    for (const pattern of datePatterns) {
      title = title.replace(pattern, '');
    }
    
    // Clean up the title
    title = title.replace(/\s+/g, ' ').trim();
    
    // Now parse the due date, if any
    date = chrono.parseDate(origDateText);
    if (date) {
      console.log(`📅 Parsed due date: ${date}`);
      
      // If we have both a reminder and a due date, make sure they're different
      if (reminderDate && Math.abs(reminderDate.getTime() - date.getTime()) < 60000) {
        // Dates are too similar, likely the same reference. Nullify the reminder.
        reminderDate = null;
      }
    }
    
    // If we only found a reminder date but no due date, use the reminder date as the due date
    if (!date && reminderDate) {
      date = new Date(reminderDate);
      console.log(`📅 Using reminder date as due date: ${date}`);
    }
    
    // If the title is empty or just noise, use a reasonable default
    if (!title || title.length < 2 || /^[\s.,!?]+$/.test(title)) {
      // Extract a better title from the task text
      const potentialTitle = origDateText.replace(/remind(er)?\s+(me|us)\s+(to|of|about)?/i, '').trim();
      
      // Use the main text without reminder/date expressions as the title
      title = potentialTitle || "Task";
      console.log(`📝 Using default title: "${title}"`);
    }
    
    // Construct and return the parsed task
    return {
      title: title.charAt(0).toUpperCase() + title.slice(1), // Capitalize first letter
      due: date || undefined,
      tags,
      priority,
      reminder: reminderDate || undefined
    };
  } catch (error) {
    console.error("❌ Error in client-side parser:", error);
    return null;
  }
} 
} 