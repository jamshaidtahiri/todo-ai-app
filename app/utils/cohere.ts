export async function classifyTask(text: string): Promise<string> {
    const apiKey = 'LFmwVChwQ5nO0dAUFozwhoJDUuhhqIIzfIRGzj69';
    
    const res = await fetch('https://api.cohere.ai/classify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'embed-english-v3.0',
        inputs: [text],
        examples: [
          { text: 'Buy groceries', label: 'errand' },
          { text: 'Write report', label: 'work' },
          { text: 'Do push-ups', label: 'fitness' },
          { text: 'Read Quran', label: 'spiritual' },
        ]
      })
    });
    const data = await res.json();
    return data.classifications?.[0]?.prediction || 'general';
  }
  