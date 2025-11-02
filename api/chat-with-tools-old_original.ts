import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  console.log('=== Vercel API with Tools Called ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json() as { messages: any[] };
    const { messages } = body;
    console.log('Messages received:', messages?.length);
    console.log('Last message:', messages?.[messages.length - 1]);

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages,
      system: 'You are a helpful assistant. When you call a tool, you MUST wait for the result and then provide a natural language response explaining the information you received. Never end your response after calling a tool - always interpret and explain the tool results to the user.',
      // @ts-ignore - maxSteps exists in v5 but TypeScript types are incomplete
      maxSteps: 5,
      toolChoice: 'auto',
      onStepFinish: (step) => {
        console.log('Step finished:', {
          text: step.text,
          toolCalls: step.toolCalls?.length,
          toolResults: step.toolResults?.length,
          finishReason: step.finishReason,
        });
      },
      tools: {
        getWeather: {
          description: 'Get the current weather for a location',
          inputSchema: z.object({
            location: z.string().describe('The city name, e.g., "Paris" or "New York"'),
          }),
          execute: async ({ location }) => {
            console.log(`Tool called: getWeather for ${location}`);
            // Mock weather data
            return {
              location,
              temperature: Math.floor(Math.random() * 20) + 10, // Random temp 10-30°C
              condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
              humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
            };
          },
        },
        
        getPodcastInfo: {
          description: 'Get information about a podcast or episode (mock data for testing)',
          inputSchema: z.object({
            query: z.string().describe('Search query for podcast or episode'),
          }),
          execute: async ({ query }) => {
            console.log(`Tool called: getPodcastInfo for "${query}"`);
            // Mock podcast data
            return {
              title: 'Sample Podcast Episode',
              host: 'John Doe',
              topic: query,
              duration: '45 minutes',
              summary: `This episode discusses ${query} in depth with industry experts.`,
            };
          },
        },
      },
    });

    console.log('Returning text stream with tools');
    console.log('Stream result type:', typeof result);
    console.log('Has toTextStreamResponse:', typeof result.toTextStreamResponse);
    
    // Get the text for debugging
    result.text.then(text => console.log('Final text:', text)).catch(e => console.log('Text error:', e));
    result.toolCalls.then(calls => console.log('Tool calls:', calls)).catch(e => console.log('Tool calls error:', e));
    result.toolResults.then(results => console.log('Tool results:', results)).catch(e => console.log('Tool results error:', e));
    
    // AI SDK v5 uses toTextStreamResponse() (includes tool support)
    const response = result.toTextStreamResponse({
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    return response;
  } catch (error) {
    console.error('Error in chat-with-tools:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

