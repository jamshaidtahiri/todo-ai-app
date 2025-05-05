import React from 'react';

interface Tab {
  id: string;
  name: string;
  color?: string;
}

interface TabSystemProps {
  tabs: Tab[];
  activeTab: string | null;
  onTabChange: (tabId: string | null) => void;
  onAddTab: () => void;
  onEditTab: (tabId: string) => void;
  onDeleteTab: (tabId: string) => void;
}

const TabSystem: React.FC<TabSystemProps> = ({
  tabs,
  activeTab,
  onTabChange,
  onAddTab,
  onEditTab,
  onDeleteTab
}) => {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onTabChange(null)}
          className={`px-3 py-1.5 text-sm rounded-t-lg transition-colors ${
            activeTab === null
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          All Tasks
        </button>
        
        {tabs.map(tab => (
          <div key={tab.id} className="relative group">
            <button
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 text-sm rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              style={tab.color ? { borderTop: `3px solid ${tab.color}` } : {}}
            >
              {tab.name}
            </button>
            
            <div className="hidden group-hover:flex absolute top-0 right-0 -mt-2 -mr-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTab(tab.id);
                }}
                className="bg-gray-200 dark:bg-gray-700 rounded-full p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 mr-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTab(tab.id);
                }}
                className="bg-gray-200 dark:bg-gray-700 rounded-full p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        
        <button
          onClick={onAddTab}
          className="px-3 py-1.5 text-sm rounded-t-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 
                    dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Category
        </button>
      </div>
    </div>
  );
};

export default TabSystem; 