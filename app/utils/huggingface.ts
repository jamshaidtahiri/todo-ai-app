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
    
    // First, check for reminder patterns
    const origDateText = text;
    let date: Date | null = null;
    let reminderDate: Date | null = null;
    let actualTaskTitle: string | null = null;
    
    // Define a list of religious terms that shouldn't be treated as tags
    const religiousTerms = ["namaz", "prayer", "salah", "salat", "jummah", "dhuhr", "asr", "maghrib", "isha", "fajr"];
    
    // Enhanced reminder patterns with better task extraction
    const reminderPatterns = [
      // Match "remind/reminder me tomorrow of X" pattern
      /\bremind(?:er)?\s+(?:me|us)?\s+(.+?)\s+(?:to|of|about)\s+(.+?)(?:\s*$)/i,
      // Match "remind/reminder me of X tomorrow" pattern
      /\bremind(?:er)?\s+(?:me|us)?\s+(?:to|of|about)\s+(.+?)\s+(?:at|on|in|tomorrow|next|this)\s+(.+?)(?:\s*$)/i,
      // Fallback for simpler patterns
      /\bremind(?:er)?\s+(?:me|us)?\s+(?:to|of|about)?\s+(.+?)(?:\s*$)/i
    ];
    
    // Try to extract task from reminder patterns
    let reminderTaskExtracted = false;
    for (const pattern of reminderPatterns) {
      const match = origDateText.match(pattern);
      if (match) {
        if (match[2]) {
          // We have two capture groups - time and task
          const timeText = match[1].trim();
          const taskText = match[2].trim();
          console.log(`🔔 Found reminder pattern with time "${timeText}" and task "${taskText}"`);
          
          // Try to parse the date from the time text
          const parsedDate = chrono.parseDate(timeText);
          if (parsedDate) {
            date = parsedDate;
            console.log(`📅 Parsed date from reminder time part: ${date}`);
            actualTaskTitle = taskText;
            reminderTaskExtracted = true;
            break;
          }
        } else if (match[1]) {
          // Only one capture group - check if it has time references
          const fullText = match[1].trim();
          console.log(`🔔 Found simple reminder text: "${fullText}"`);
          
          // Check for time patterns within the fullText
          const timePatterns = [
            /\b(at|on|in|tomorrow|next|this|morning|evening|afternoon|night)\b/i
          ];
          
          let hasPotentialTimeReference = false;
          for (const tPattern of timePatterns) {
            if (tPattern.test(fullText)) {
              hasPotentialTimeReference = true;
              break;
            }
          }
          
          if (hasPotentialTimeReference) {
            // Try to see if we can split the task better
            // Look for "X at Y" or "X on Y" patterns
            const taskTimeSplit = fullText.match(/(.+?)\s+(at|on|in)\s+(.+?)(?:\s*$)/i);
            if (taskTimeSplit) {
              const potentialTask = taskTimeSplit[1].trim();
              const potentialTime = taskTimeSplit[3].trim();
              
              if (potentialTask && potentialTime) {
                console.log(`🔍 Split into task "${potentialTask}" and time "${potentialTime}"`);
                actualTaskTitle = potentialTask;
                
                // Try to parse the time part
                const parsedTime = chrono.parseDate(potentialTime);
                if (parsedTime) {
                  date = parsedTime;
                  console.log(`📅 Parsed time from split: ${parsedTime}`);
                  reminderTaskExtracted = true;
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    // If we couldn't extract task from reminder patterns specifically, use generic extraction
    if (!reminderTaskExtracted) {
      console.log("🔄 Falling back to generic extraction");
      
      // Extract the task title, being careful to remove reminder text
      let title = origDateText;
      
      // Remove reminder keywords
      title = title.replace(/\bremind(?:er)?\s+(?:me|us)?\s+(?:to|of|about)?\s+/i, '');
      
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
      actualTaskTitle = title;
      
      // Now parse the due date, if any
      date = chrono.parseDate(origDateText);
      if (date) {
        console.log(`📅 Parsed due date: ${date}`);
      }
    }
    
    // If the title is empty or just noise, use a reasonable default
    if (!actualTaskTitle || actualTaskTitle.length < 2 || /^[\s.,!?]+$/.test(actualTaskTitle)) {
      // Extract a better title from the task text
      const potentialTitle = origDateText.replace(/remind(er)?\s+(me|us)\s+(to|of|about)?/i, '').trim();
      
      // Use the main text without reminder/date expressions as the title
      actualTaskTitle = potentialTitle || "Task";
      console.log(`📝 Using default title: "${actualTaskTitle}"`);
    }
    
    // Special handling for religious terms
    let finalTitle = actualTaskTitle;
    for (const term of religiousTerms) {
      if (origDateText.toLowerCase().includes(term.toLowerCase())) {
        // If input contains religious terms, ensure they stay in the title and are not extracted as tags
        const regex = new RegExp(`(.*?\\b${term}\\b.*?)(?:\\s*at\\s*|\\s*on\\s*|\\s*$)`, 'i');
        const match = origDateText.match(regex);
        
        if (match && match[1]) {
          // Extract the part containing the religious term
          finalTitle = match[1].trim();
          
          // If the title is just the reminder prefix plus the term, format it nicely
          if (finalTitle.match(/^remind(?:er)?\s+(?:me|us)?\s+(?:to|of|about)?\s+/i)) {
            finalTitle = term.charAt(0).toUpperCase() + term.slice(1);
          }
          
          console.log(`📝 Extracted religious term '${term}': "${finalTitle}"`);
          break;
        }
      }
    }
    
    // Capitalize first letter of the final title
    finalTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
    
    // Construct and return the parsed task
    return {
      title: finalTitle,
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