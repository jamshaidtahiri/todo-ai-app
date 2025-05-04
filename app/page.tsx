'use client';

import { useEffect, useState } from 'react';
import { classifyTask } from './utils/cohere';
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
  }, [tasks]);

  useEffect(() => {
    // Handle showing help when input is "help"
    if (input.trim().toLowerCase() === 'help' || input.trim().toLowerCase() === 'commands') {
      setShowHelp(true);
    }
  }, [input]);

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
      const command = parseCommand(input);
      
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
          
        case 'help':
          showHelpMessage();
          break;
          
        case 'unknown':
        default:
          // If no command matches, try to add it as a regular task
          await addTask(input);
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
          <p className="text-sm text-gray-600 mb-2">Try these commands:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-gray-100 px-2 py-1 rounded">add buy milk #errand</span>
            <span className="bg-gray-100 px-2 py-1 rounded">add workout as fitness</span>
            <span className="bg-gray-100 px-2 py-1 rounded">add call mom !high</span>
            <span className="bg-gray-100 px-2 py-1 rounded">tick all milk</span>
            <span className="bg-gray-100 px-2 py-1 rounded">delete report</span>
            <span className="bg-gray-100 px-2 py-1 rounded">tag workout as fitness</span>
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
