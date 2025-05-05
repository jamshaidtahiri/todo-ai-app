interface TaskPriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
}

export const TaskPriorityBadge = ({ priority }: TaskPriorityBadgeProps) => {
  const priorityConfig = {
    high: {
      classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      label: '!urgent'
    },
    medium: {
      classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      label: '!medium'
    },
    low: {
      classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      label: '!low'
    }
  };

  const config = priorityConfig[priority];

  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${config.classes}`}>
      {config.label}
    </span>
  );
}; 