import { streamText, stepCountIs } from 'ai';
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
    const body = await req.json();
    const { messages } = body as { messages: any[] };
    console.log('Messages received:', messages?.length);

    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages,
      system: 'You are a helpful assistant.',
      stopWhen: stepCountIs(5),
      onStepFinish: (step) => {
        console.log('Step finished:', {
          text: step.text,
          toolCalls: step.toolCalls?.length,
          finishReason: step.finishReason,
        });
      },
      tools: {
        getWeather: {
          description: 'Get the current weather for a location',
          inputSchema: z.object({
            location: z.string().describe('The city name'),
          }),
          execute: async ({ location }) => {
            console.log(`Tool called: getWeather for ${location}`);
            return {
              location,
              temperature: Math.floor(Math.random() * 20) + 10,
              condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
              humidity: Math.floor(Math.random() * 40) + 40,
            };
          },
        },
      },
    });

    console.log('Returning stream');
    result.text.then(t => console.log('Full text:', t));

    // According to docs: for useChat with tools, use toUIMessageStreamResponse
    return result.toUIMessageStreamResponse({
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Error in chat-with-tools handler:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}