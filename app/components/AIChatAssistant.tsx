import React, { useState, useRef, useEffect } from 'react';
import { generateTaskSummary } from '../utils/conflict';
import { classifyCommand } from '../utils/cohere';

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
  estimatedDuration?: number;
  startTime?: number;
  notes?: string;
  subtasks?: {
    id: string;
    text: string;
    done: boolean;
  }[];
};

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
};

type AIChatAssistantProps = {
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
};

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ tasks, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "👋 Hi! I'm your personal task assistant. Ask me anything about your tasks, like 'What's on my schedule today?' or 'Summarize my workload'.",
      isUser: false,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: input,
      isUser: true,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    
    // Process user request
    const response = await processUserRequest(input, tasks);
    
    // Add AI response
    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      text: response,
      isUser: false,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsProcessing(false);
  };
  
  // Process user request and generate response
  const processUserRequest = async (userInput: string, tasks: Task[]): Promise<string> => {
    const lowerInput = userInput.toLowerCase();
    
    // Try to use the LLM to understand intent
    try {
      const classification = await classifyCommand(userInput);
      
      // Handle summarize intent
      if (classification.intent === 'summarize' || 
          lowerInput.includes('summarize') || 
          lowerInput.includes('summary')) {
        
        let period: 'today' | 'tomorrow' | 'week' = 'today';
        
        if (lowerInput.includes('tomorrow')) {
          period = 'tomorrow';
        } else if (lowerInput.includes('week')) {
          period = 'week';
        }
        
        return generateSummaryResponse(tasks, period);
      }
      
      // Handle workload questions
      if (lowerInput.includes('workload') || 
          lowerInput.includes('schedule') || 
          lowerInput.includes("what's on") || 
          lowerInput.includes("what is on") || 
          lowerInput.includes("do i have")) {
        
        let period: 'today' | 'tomorrow' | 'week' = 'today';
        
        if (lowerInput.includes('tomorrow')) {
          period = 'tomorrow';
        } else if (lowerInput.includes('week')) {
          period = 'week';
        }
        
        return generateWorkloadResponse(tasks, period);
      }
      
      // Handle priority questions
      if (lowerInput.includes('priority') || 
          lowerInput.includes('important') || 
          lowerInput.includes('urgent')) {
        return generatePriorityResponse(tasks);
      }
      
      // Handle deadline questions
      if (lowerInput.includes('deadline') || 
          lowerInput.includes('due') || 
          lowerInput.includes('upcoming')) {
        return generateDeadlineResponse(tasks);
      }
      
      // Handle progress/status questions
      if (lowerInput.includes('progress') || 
          lowerInput.includes('status') || 
          lowerInput.includes('how am i doing')) {
        return generateProgressResponse(tasks);
      }
      
      // Handle category/tag questions
      if (lowerInput.includes('category') || 
          lowerInput.includes('categories') || 
          lowerInput.includes('tag') || 
          lowerInput.includes('tags')) {
        return generateCategoryResponse(tasks);
      }
      
      // Handle general help questions
      if (lowerInput.includes('help') || 
          lowerInput.includes('can you') || 
          lowerInput.includes('how to')) {
        return generateHelpResponse();
      }
      
      // Fallback to a generic response
      return "I'm not sure how to answer that. You can ask me about your schedule, priorities, deadlines, or progress on your tasks.";
    } catch (error) {
      console.error('Error processing request:', error);
      return "Sorry, I encountered an error processing your request. Please try again.";
    }
  };
  
  // Generate a summary of tasks for a period
  const generateSummaryResponse = (tasks: Task[], period: 'today' | 'tomorrow' | 'week'): string => {
    const summary = generateTaskSummary(tasks, period, true);
    
    if (summary.totalTasks === 0) {
      return `You don't have any tasks scheduled for ${period}.`;
    }
    
    let response = `📝 **${period.charAt(0).toUpperCase() + period.slice(1)} Summary**\n\n`;
    response += `You have ${summary.totalTasks} tasks (${summary.completedTasks} completed), requiring approximately ${Math.round(summary.timeRequired / 60)} hours ${summary.timeRequired % 60} minutes.\n\n`;
    
    if (summary.highPriorityTasks.length > 0) {
      response += `⚠️ **High Priority**\n`;
      summary.highPriorityTasks.slice(0, 3).forEach(task => {
        response += `- ${task.text}${task.done ? ' ✓' : ''}\n`;
      });
      if (summary.highPriorityTasks.length > 3) {
        response += `...and ${summary.highPriorityTasks.length - 3} more\n`;
      }
      response += '\n';
    }
    
    // Add category breakdown
    response += `📊 **Categories**\n`;
    Object.entries(summary.byTag).forEach(([tag, tagTasks]) => {
      response += `- ${tag}: ${tagTasks.length} tasks\n`;
    });
    
    return response;
  };
  
  // Generate a workload response
  const generateWorkloadResponse = (tasks: Task[], period: 'today' | 'tomorrow' | 'week'): string => {
    const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
    const filteredTasks = tasks.filter(task => {
      if (task.done || task.status === 'archived') return false;
      
      if (!task.dueDate) return false;
      
      const now = new Date();
      const taskDate = new Date(task.dueDate);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let endDate: Date;
      
      if (period === 'today') {
        endDate = new Date(startOfDay);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === 'tomorrow') {
        endDate = new Date(startOfDay);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(23, 59, 59, 999);
      } else { // week
        endDate = new Date(startOfDay);
        endDate.setDate(endDate.getDate() + 7);
        endDate.setHours(23, 59, 59, 999);
      }
      
      return taskDate >= startOfDay && taskDate <= endDate;
    });
    
    if (filteredTasks.length === 0) {
      return `Your schedule for ${period} is clear. You don't have any pending tasks.`;
    }
    
    // Sort by due date
    filteredTasks.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
    
    let response = `📅 **Your ${periodLabel} Schedule**\n\n`;
    
    // Format by time
    let currentDate = '';
    filteredTasks.forEach(task => {
      const taskDate = new Date(task.dueDate || 0);
      const dateStr = taskDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      
      const timeStr = taskDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      
      if (dateStr !== currentDate) {
        response += `\n**${dateStr}**\n`;
        currentDate = dateStr;
      }
      
      response += `- ${timeStr}: ${task.text}${task.priority === 'high' ? ' ⚠️' : ''}\n`;
    });
    
    response += `\nTotal: ${filteredTasks.length} tasks`;
    
    return response;
  };
  
  // Generate a priority tasks response
  const generatePriorityResponse = (tasks: Task[]): string => {
    const highPriorityTasks = tasks.filter(
      task => task.priority === 'high' && !task.done && task.status === 'pending'
    );
    
    if (highPriorityTasks.length === 0) {
      return "You don't have any high priority tasks at the moment.";
    }
    
    // Sort by due date
    highPriorityTasks.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
    
    let response = `⚠️ **High Priority Tasks**\n\n`;
    
    highPriorityTasks.forEach(task => {
      let dueStr = '';
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        dueStr = ` (Due: ${dueDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })})`;
      }
      
      response += `- ${task.text}${dueStr}\n`;
    });
    
    return response;
  };
  
  // Generate a deadline response
  const generateDeadlineResponse = (tasks: Task[]): string => {
    const pendingTasks = tasks.filter(
      task => !task.done && task.status === 'pending' && task.dueDate
    );
    
    if (pendingTasks.length === 0) {
      return "You don't have any upcoming deadlines.";
    }
    
    // Sort by due date
    pendingTasks.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
    
    // Group by time period
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const todayTasks = pendingTasks.filter(task => task.dueDate && task.dueDate <= today.getTime());
    const tomorrowTasks = pendingTasks.filter(task => 
      task.dueDate && task.dueDate > today.getTime() && task.dueDate <= tomorrow.getTime()
    );
    const thisWeekTasks = pendingTasks.filter(task => 
      task.dueDate && task.dueDate > tomorrow.getTime() && task.dueDate <= nextWeek.getTime()
    );
    const laterTasks = pendingTasks.filter(task => 
      task.dueDate && task.dueDate > nextWeek.getTime()
    );
    
    let response = `⏰ **Upcoming Deadlines**\n\n`;
    
    if (todayTasks.length > 0) {
      response += `**Today**\n`;
      todayTasks.forEach(task => {
        response += `- ${task.text}${task.priority === 'high' ? ' ⚠️' : ''}\n`;
      });
      response += '\n';
    }
    
    if (tomorrowTasks.length > 0) {
      response += `**Tomorrow**\n`;
      tomorrowTasks.forEach(task => {
        response += `- ${task.text}${task.priority === 'high' ? ' ⚠️' : ''}\n`;
      });
      response += '\n';
    }
    
    if (thisWeekTasks.length > 0) {
      response += `**This Week**\n`;
      thisWeekTasks.forEach(task => {
        const dueDate = new Date(task.dueDate || 0);
        const dateStr = dueDate.toLocaleDateString('en-US', { 
          weekday: 'short'
        });
        response += `- ${dateStr}: ${task.text}${task.priority === 'high' ? ' ⚠️' : ''}\n`;
      });
      response += '\n';
    }
    
    if (laterTasks.length > 0) {
      response += `**Later**\n`;
      laterTasks.slice(0, 3).forEach(task => {
        const dueDate = new Date(task.dueDate || 0);
        const dateStr = dueDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        });
        response += `- ${dateStr}: ${task.text}\n`;
      });
      
      if (laterTasks.length > 3) {
        response += `...and ${laterTasks.length - 3} more\n`;
      }
    }
    
    return response;
  };
  
  // Generate a progress response
  const generateProgressResponse = (tasks: Task[]): string => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.done).length;
    const pendingTasks = tasks.filter(task => !task.done && task.status === 'pending').length;
    const archivedTasks = tasks.filter(task => task.status === 'archived').length;
    
    if (totalTasks === 0) {
      return "You don't have any tasks yet. Start by adding some tasks to your list.";
    }
    
    const completionRate = Math.round((completedTasks / totalTasks) * 100);
    
    let response = `📊 **Task Progress**\n\n`;
    response += `Overall completion: ${completionRate}% (${completedTasks}/${totalTasks})\n\n`;
    response += `- Completed: ${completedTasks}\n`;
    response += `- Pending: ${pendingTasks}\n`;
    response += `- Archived: ${archivedTasks}\n\n`;
    
    // Progress by category
    const categories: Record<string, { total: number, completed: number }> = {};
    
    tasks.forEach(task => {
      if (!categories[task.tag]) {
        categories[task.tag] = { total: 0, completed: 0 };
      }
      
      categories[task.tag].total += 1;
      if (task.done) {
        categories[task.tag].completed += 1;
      }
    });
    
    response += `**Progress by Category**\n`;
    Object.entries(categories).forEach(([tag, stats]) => {
      const categoryCompletion = Math.round((stats.completed / stats.total) * 100);
      response += `- ${tag}: ${categoryCompletion}% (${stats.completed}/${stats.total})\n`;
    });
    
    return response;
  };
  
  // Generate a category/tag response
  const generateCategoryResponse = (tasks: Task[]): string => {
    // Group tasks by tag
    const categories: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      if (!categories[task.tag]) {
        categories[task.tag] = [];
      }
      
      categories[task.tag].push(task);
    });
    
    if (Object.keys(categories).length === 0) {
      return "You don't have any tasks categorized yet.";
    }
    
    let response = `🏷️ **Task Categories**\n\n`;
    
    Object.entries(categories)
      .sort((a, b) => b[1].length - a[1].length) // Sort by number of tasks
      .forEach(([tag, tagTasks]) => {
        const completedCount = tagTasks.filter(t => t.done).length;
        response += `**${tag}** (${tagTasks.length} tasks, ${completedCount} completed)\n`;
        
        // List a few tasks from each category
        const pendingTasks = tagTasks.filter(t => !t.done).slice(0, 3);
        if (pendingTasks.length > 0) {
          pendingTasks.forEach(task => {
            response += `- ${task.text}${task.priority === 'high' ? ' ⚠️' : ''}\n`;
          });
          
          if (tagTasks.filter(t => !t.done).length > 3) {
            response += `...and ${tagTasks.filter(t => !t.done).length - 3} more pending\n`;
          }
          response += '\n';
        }
      });
    
    return response;
  };
  
  // Generate a help response
  const generateHelpResponse = (): string => {
    return `
**How I Can Help You**

You can ask me questions like:
- "What's on my schedule today?"
- "What are my high priority tasks?"
- "Summarize my tasks for this week"
- "Show me my upcoming deadlines"
- "How am I doing on my tasks?"
- "What categories do I have?"

I can also provide advice on time management and productivity!
`;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
          <h3 className="text-lg font-medium dark:text-white">AI Assistant</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div 
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`
                  max-w-[80%] p-3 rounded-lg
                  ${message.isUser 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-slate-700 dark:text-white'}
                `}
              >
                <div className="whitespace-pre-line">{message.text}</div>
                <div 
                  className={`
                    text-xs mt-1
                    ${message.isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}
                  `}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg">
                <div className="flex space-x-2">
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 border-t dark:border-slate-700">
          <div className="flex">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask something about your tasks..."
              className="flex-1 px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIChatAssistant; 