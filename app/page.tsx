'use client';

import { useEffect, useState } from 'react';
import { classifyTask, classifyCommand, generateTaskSuggestions } from './utils/cohere';
import { v4 as uuidv4 } from 'uuid';
import Task from './components/Task';
import CommandInput from './components/CommandInput';
import TagFilter from './components/TagFilter';
import ProgressBar from './components/ProgressBar';
import CommandHelp from './components/CommandHelp';
import BatchActions from './components/BatchActions';
import { filterAndSortTasks, parseCommand, CommandResult } from './utils/helpers';

type Task = {
  id: string;
  text: string;
  done: boolean;
  tag: string;
  createdAt: number;
  priority?: 'high' | 'medium' | 'low';
};

export default function Home() {
  const [input, setInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('tasks');
    if (stored) setTasks(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    setStats({
      total: tasks.length,
      completed: tasks.filter(t => t.done).length
    });
    
    // Generate task suggestions when tasks change
    if (tasks.length >= 3) {
      generateSuggestions();
    }
  }, [tasks]);

  useEffect(() => {
    // Handle showing help when input is "help"
    if (input.trim().toLowerCase() === 'help' || input.trim().toLowerCase() === 'commands') {
      setShowHelp(true);
    }
  }, [input]);
  
  // Generate task suggestions using the LLM
  const generateSuggestions = async () => {
    if (tasks.length < 3) return;
    
    // Only use the most recent 5 tasks for context
    const recentTasks = [...tasks]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map(t => t.text);
      
    const suggestions = await generateTaskSuggestions(recentTasks);
    setTaskSuggestions(suggestions);
  };

  const showFeedback = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const addTask = async (text: string, providedTag?: string, priority?: 'high' | 'medium' | 'low') => {
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      // If a tag is provided, use it. Otherwise, classify with AI
      const tag = providedTag || await classifyTask(text);
      setTasks([...tasks, { 
        id: uuidv4(), 
        text, 
        done: false, 
        tag,
        createdAt: Date.now(),
        priority
      }]);
      setInput('');
      showFeedback(`Added task: ${text}`);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error adding task:', error);
      showFeedback('Error adding task');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (taskToDelete) {
      setTasks(tasks.filter(t => t.id !== id));
      showFeedback(`Deleted task: ${taskToDelete.text}`);
    }
  };

  const tickTasksByText = (searchText: string, tickAll: boolean = false) => {
    const lowerSearchText = searchText.toLowerCase();
    let modifiedCount = 0;
    
    setTasks(tasks.map(task => {
      if (task.text.toLowerCase().includes(lowerSearchText) && !task.done) {
        if (!tickAll && modifiedCount > 0) {
          return task; // Only modify first match if not tickAll
        }
        modifiedCount++;
        return { ...task, done: true };
      }
      return task;
    }));
    
    if (modifiedCount > 0) {
      showFeedback(`Completed ${modifiedCount} task(s) matching "${searchText}"`);
    } else {
      showFeedback(`No matching incomplete tasks found for "${searchText}"`);
    }
    return modifiedCount;
  };

  const deleteTasksByText = (searchText: string, deleteAll: boolean = false) => {
    const lowerSearchText = searchText.toLowerCase();
    const tasksToKeep = [];
    let deletedCount = 0;
    
    for (const task of tasks) {
      if (task.text.toLowerCase().includes(lowerSearchText)) {
        if (!deleteAll && deletedCount > 0) {
          tasksToKeep.push(task); // Only delete first match if not deleteAll
        } else {
          deletedCount++;
          continue; // Skip this task (delete it)
        }
      } else {
        tasksToKeep.push(task);
      }
    }
    
    if (deletedCount > 0) {
      setTasks(tasksToKeep);
      showFeedback(`Deleted ${deletedCount} task(s) matching "${searchText}"`);
    } else {
      showFeedback(`No matching tasks found for "${searchText}"`);
    }
    return deletedCount;
  };

  const updateTaskTag = (searchText: string, newTag: string) => {
    const lowerSearchText = searchText.toLowerCase();
    let modifiedCount = 0;
    
    setTasks(tasks.map(task => {
      if (task.text.toLowerCase().includes(lowerSearchText)) {
        modifiedCount++;
        return { ...task, tag: newTag };
      }
      return task;
    }));
    
    if (modifiedCount > 0) {
      showFeedback(`Updated tag to "${newTag}" for ${modifiedCount} task(s)`);
    } else {
      showFeedback(`No matching tasks found for "${searchText}"`);
    }
  };
  
  const updateTaskPriority = (searchText: string, priority: 'high' | 'medium' | 'low') => {
    const lowerSearchText = searchText.toLowerCase();
    let modifiedCount = 0;
    
    setTasks(tasks.map(task => {
      if (task.text.toLowerCase().includes(lowerSearchText)) {
        modifiedCount++;
        return { ...task, priority };
      }
      return task;
    }));
    
    if (modifiedCount > 0) {
      showFeedback(`Set priority to "${priority}" for ${modifiedCount} task(s)`);
    } else {
      showFeedback(`No matching tasks found for "${searchText}"`);
    }
  };

  // Batch operations
  const handleBatchComplete = () => {
    const tasksToUpdate = filterTag ? tasks.filter(t => t.tag === filterTag) : tasks;
    const incompleteCount = tasksToUpdate.filter(t => !t.done).length;
    
    if (incompleteCount > 0) {
      setTasks(tasks.map(task => {
        if (filterTag && task.tag !== filterTag) return task;
        return { ...task, done: true };
      }));
      showFeedback(`Completed ${incompleteCount} task${incompleteCount > 1 ? 's' : ''}`);
    } else {
      showFeedback('No incomplete tasks to complete');
    }
  };
  
  const handleBatchDelete = () => {
    const tasksToDelete = filterTag ? tasks.filter(t => t.tag === filterTag) : tasks;
    const deleteCount = tasksToDelete.length;
    
    if (deleteCount > 0) {
      if (filterTag) {
        setTasks(tasks.filter(t => t.tag !== filterTag));
      } else {
        setTasks([]);
      }
      showFeedback(`Deleted ${deleteCount} task${deleteCount > 1 ? 's' : ''}`);
    }
  };
  
  const handleBatchTag = (newTag: string) => {
    const tasksToUpdate = filterTag ? tasks.filter(t => t.tag === filterTag) : tasks;
    const updateCount = tasksToUpdate.length;
    
    if (updateCount > 0) {
      setTasks(tasks.map(task => {
        if (filterTag && task.tag !== filterTag) return task;
        return { ...task, tag: newTag };
      }));
      showFeedback(`Updated tag to "${newTag}" for ${updateCount} task${updateCount > 1 ? 's' : ''}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand();
    }
  };

  const showHelpMessage = () => {
    setShowHelp(true);
    setInput('');
  };

  const handleCommand = async () => {
    if (!input.trim()) return;
    
    // Check for help command directly
    if (input.trim().toLowerCase() === 'help' || input.trim().toLowerCase() === 'commands') {
      showHelpMessage();
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Try rule-based parsing first (fast and accurate for standard commands)
      const command = parseCommand(input);
      
      // If the rule-based parser couldn't determine the command type with confidence,
      // use AI to classify the command and extract entities
      if (command.type === 'unknown' && command.confidence === 0) {
        const aiClassification = await classifyCommand(input);
        
        if (aiClassification.intent === 'add_task') {
          command.type = 'add';
          command.taskText = aiClassification.entities.taskText || input;
          command.tag = aiClassification.entities.tag;
          command.priority = aiClassification.entities.priority as 'high' | 'medium' | 'low';
        } else if (aiClassification.intent === 'complete_task') {
          command.type = 'tick';
          command.searchTerm = aiClassification.entities.searchTerm;
        } else if (aiClassification.intent === 'delete_task') {
          command.type = 'delete';
          command.searchTerm = aiClassification.entities.searchTerm;
        } else if (aiClassification.intent === 'change_tag') {
          command.type = 'tag';
          command.searchTerm = aiClassification.entities.searchTerm;
          command.tag = aiClassification.entities.tag;
        } else if (aiClassification.intent === 'set_priority') {
          command.type = 'priority';
          command.searchTerm = aiClassification.entities.searchTerm;
          command.priority = aiClassification.entities.priority as 'high' | 'medium' | 'low';
        } else if (aiClassification.intent === 'filter_tasks') {
          command.type = 'filter';
          command.tag = aiClassification.entities.tag;
        } else if (aiClassification.intent === 'help') {
          command.type = 'help';
        }
        
        command.confidence = aiClassification.confidence;
      }
      
      // Execute the command based on its type
      switch (command.type) {
        case 'add':
          if (command.taskText) {
            await addTask(command.taskText, command.tag, command.priority);
          }
          break;
          
        case 'tick':
          if (command.searchTerm) {
            tickTasksByText(command.searchTerm, command.allMatches);
          }
          break;
          
        case 'delete':
          if (command.searchTerm) {
            deleteTasksByText(command.searchTerm, command.allMatches);
          }
          break;
          
        case 'tag':
          if (command.searchTerm && command.tag) {
            updateTaskTag(command.searchTerm, command.tag);
          }
          break;
          
        case 'priority':
          if (command.searchTerm && command.priority) {
            updateTaskPriority(command.searchTerm, command.priority);
          }
          break;
          
        case 'filter':
          if (command.tag) {
            setFilterTag(command.tag);
            showFeedback(`Showing tasks with tag: ${command.tag}`);
          }
          break;
          
        case 'help':
          showHelpMessage();
          break;
          
        case 'unknown':
        default:
          // If confidence is really low, maybe the user is not trying to execute a command
          // but just wants to add a task with this text
          if (command.confidence && command.confidence < 0.5) {
            await addTask(input);
          } else {
            showFeedback("I'm not sure what you want to do. Try 'help' for a list of commands.");
          }
          break;
      }
      
      setInput('');
    } catch (error) {
      console.error('Error processing command:', error);
      showFeedback('Error processing command');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommandSelect = (command: string) => {
    setInput(command);
    setShowHelp(false);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    addTask(suggestion);
  };

  const getAllTags = () => {
    const tags = tasks.map(t => t.tag).filter((tag, index, self) => 
      tag && self.indexOf(tag) === index
    );
    return tags;
  };

  const sortedTasks = filterAndSortTasks(tasks, filterTag);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="max-w-2xl mx-auto p-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              AI To-Do
            </span>
            <span className="ml-2">🧠</span>
          </h1>
          <p className="text-gray-500">Smart task management powered by AI</p>
        </div>

        {feedbackMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4 animate-fade-in">
            {feedbackMessage}
          </div>
        )}

        <CommandInput 
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onKeyDown={handleKeyDown}
          onAddTask={handleCommand}
          onCommand={() => setShowHelp(true)}
        />

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">Try these natural commands:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-gray-100 px-2 py-1 rounded">I need to buy milk</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Complete the grocery task</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Delete all workout tasks</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Make dentist appointment high priority</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Show me all work tasks</span>
          </div>
        </div>

        <ProgressBar total={stats.total} completed={stats.completed} />

        <TagFilter 
          filterTag={filterTag}
          tags={getAllTags()}
          onFilterChange={setFilterTag}
        />

        {sortedTasks.length > 0 && (
          <BatchActions 
            taskCount={sortedTasks.length}
            onBatchComplete={handleBatchComplete}
            onBatchDelete={handleBatchDelete}
            onBatchTag={handleBatchTag}
          />
        )}

        {sortedTasks.length > 0 ? (
          <ul className="space-y-3">
            {sortedTasks.map(task => (
              <Task 
                key={task.id}
                id={task.id}
                text={task.text}
                done={task.done}
                tag={task.tag}
                priority={task.priority}
                createdAt={task.createdAt}
                onToggle={toggleTask}
                onDelete={deleteTask}
              />
            ))}
          </ul>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-5xl mb-3 animate-bounce-slow">✨</div>
            <p className="text-gray-500">
              {tasks.length === 0 
                ? "No tasks yet. Add one to get started!" 
                : "No tasks match the current filter."}
            </p>
          </div>
        )}
        
        {/* Task Suggestions Section */}
        {taskSuggestions.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-medium text-gray-700">Suggestions based on your tasks</h2>
              <button 
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showSuggestions ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showSuggestions && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4 animate-fade-in">
                <ul className="space-y-2">
                  {taskSuggestions.map((suggestion, index) => (
                    <li key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                      <span>{suggestion}</span>
                      <button 
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="mt-12 text-center pb-6 text-gray-400 text-sm">
        <p>Powered by AI • Cohere API</p>
      </footer>

      {showHelp && (
        <CommandHelp 
          onClose={() => setShowHelp(false)} 
          onSelectCommand={handleCommandSelect}
        />
      )}
    </div>
  );
}
