import { useState } from 'react';

type TaskNotesProps = {
  notes: string | undefined;
  onChange: (notes: string | undefined) => void;
  className?: string;
};

export default function TaskNotes({ notes, onChange, className = '' }: TaskNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(notes || '');
  
  const handleSave = () => {
    onChange(editValue.trim() || undefined);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditValue(notes || '');
    setIsEditing(false);
  };
  
  return (
    <div className={`${className}`}>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 h-24 text-sm"
            placeholder="Add notes..."
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          {notes ? (
            <div className="group relative">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center text-xs text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Add notes
            </button>
          )}
        </div>
      )}
    </div>
  );
} 