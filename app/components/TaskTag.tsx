import { getTagColor } from '../utils/helpers';

interface TaskTagProps {
  tag: string;
}

export const TaskTag = ({ tag }: TaskTagProps) => {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${getTagColor(tag)}`}>
      #{tag}
    </span>
  );
}; 