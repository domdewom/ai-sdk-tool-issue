import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  console.log('=== Vercel Edge API Called ===');
  console.log('Method:', req.method);
  
  // Handle CORS preflight
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
    const { messages } = await req.json();
    console.log('Messages received:', messages?.length);
    console.log('Last message:', messages?.[messages.length - 1]);

    // Await to get the StreamTextResult object
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages,
      system: 'You are a helpful podcast assistant. Keep responses concise and friendly.',
    });

    console.log('Returning text stream response');
    
    // AI SDK v5 uses toTextStreamResponse()
    return result.toTextStreamResponse({
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in chat-simple:', error);
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
