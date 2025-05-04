import React, { useState } from 'react';

type CommandHelpProps = {
  onClose: () => void;
  onSelectCommand: (command: string) => void;
};

export default function CommandHelp({ onClose, onSelectCommand }: CommandHelpProps) {
  const [activeTab, setActiveTab] = useState('add');
  
  const commandGroups = {
    add: [
      { cmd: 'add buy milk', desc: 'Add a task with AI classification' },
      { cmd: 'add workout #fitness', desc: 'Add with specific tag (hashtag format)' },
      { cmd: 'add call mom as work', desc: 'Add with specific tag (as format)' },
      { cmd: 'add report !high', desc: 'Add with high priority' },
      { cmd: 'add meeting !medium', desc: 'Add with medium priority' },
      { cmd: 'add read !low', desc: 'Add with low priority' },
    ],
    tick: [
      { cmd: 'tick milk', desc: 'Mark first task containing "milk" as complete' },
      { cmd: 'tick all milk', desc: 'Mark all tasks containing "milk" as complete' },
      { cmd: 'complete report', desc: 'Alternative to tick command' },
    ],
    delete: [
      { cmd: 'delete milk', desc: 'Delete first task containing "milk"' },
      { cmd: 'delete all report', desc: 'Delete all tasks containing "report"' },
      { cmd: 'remove workout', desc: 'Alternative to delete command' },
    ],
    tag: [
      { cmd: 'tag workout as fitness', desc: 'Change tag of tasks containing "workout"' },
    ],
    other: [
      { cmd: 'help', desc: 'Show this help message' },
      { cmd: 'commands', desc: 'Alternative to help command' },
    ],
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Command Reference</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {Object.keys(commandGroups).map(group => (
              <button
                key={group}
                className={`px-4 py-2 font-medium ${
                  activeTab === group 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab(group)}
              >
                {group.charAt(0).toUpperCase() + group.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="space-y-3">
            {commandGroups[activeTab as keyof typeof commandGroups].map((item, index) => (
              <div 
                key={index}
                className="bg-gray-50 p-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => onSelectCommand(item.cmd)}
              >
                <div className="font-mono text-blue-600">{item.cmd}</div>
                <div className="text-sm text-gray-600 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            Click on any command to use it as a template. Press Enter to execute commands.
          </p>
        </div>
      </div>
    </div>
  );
} 