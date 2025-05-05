// app/api/chat/route.ts

// Build a prompt from the messages
function buildPrompt(messages: { content: string; role: 'system' | 'user' | 'assistant' }[]) {
  return (
    messages
      .map(({ content, role }) => {
        if (role === 'user') {
          return `Human: ${content}`;
        } else {
          return `Assistant: ${content}`;
        }
      })
      .join('\n\n') + '\n\nAssistant:'
  );
}

export async function POST(req: Request) {
  try {
    // Extract the `messages` from the body of the request
    const { messages } = await req.json();

    // Request the Cohere API for the response based on the prompt
    const response = await fetch('https://api.cohere.ai/generate', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.COHERE_API_KEY || 'LFmwVChwQ5nO0dAUFozwhoJDUuhhqIIzfIRGzj69'}`,
        'Cohere-Version': '2022-12-06',
      },
      body: JSON.stringify({
        model: 'command-light-nightly',
        prompt: buildPrompt(messages),
        return_likelihoods: "NONE",
        max_tokens: 200,
        temperature: 0.9,
        top_p: 1,
      }),
    });
    
    if (!response.ok) {
      console.error(`Cohere API error: ${response.status} ${response.statusText}`);
      return new Response(JSON.stringify({ 
        error: "Failed to communicate with Cohere API",
        status: response.status
      }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await response.json();
    
    if (!result.generations || !result.generations[0]) {
      console.error("Invalid response from Cohere API:", result);
      return new Response(JSON.stringify({ 
        error: "Invalid response from Cohere API" 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return the generated text
    return new Response(result.generations[0].text.trim(), {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error("Error in Cohere API route:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 