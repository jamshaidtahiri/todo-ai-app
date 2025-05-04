# AI Todo App

A smart task management application powered by AI, with natural language command processing.

## Features

- 🧠 AI-powered task categorization using the Cohere API
- 💬 Command-based interface for task management
- 🏷️ Automatic and manual tagging of tasks
- ⚡ Priority system with visual indicators
- 🔍 Task filtering by categories
- 💼 Batch operations for multiple tasks
- 📱 Responsive design with a clean UI

## Commands

- `add buy milk` - Add a task with AI classification
- `add workout #fitness` - Add a task with a specific tag
- `add call mom !high` - Add a task with high priority
- `tick milk` - Mark the first task containing "milk" as complete
- `tick all milk` - Mark all tasks containing "milk" as complete
- `delete report` - Delete the first task containing "report"
- `tag workout as fitness` - Change tag of tasks containing "workout"
- `help` - Show the command reference

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Cohere API

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env.local` file with your Cohere API key:
   ```
   COHERE_API_KEY=your_api_key_here
   ```
4. Run the development server with `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser 