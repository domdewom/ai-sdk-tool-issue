import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const config = {
  runtime: 'edge',
};

export async function POST(req: Request) {
  console.log('=== Vercel API with Tools Called ===');

  try {
    const body: any = await req.json();
    const messages: UIMessage[] = body.messages || [];
    console.log('Messages received:', messages?.length);

    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: convertToModelMessages(messages),
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
        getCityFact: {
          description: 'Get a fun fact about a city.',
          inputSchema: z.object({
            city: z.string().describe('The name of the city.'),
          }),
          execute: async ({ city }) => {
            console.log(`Tool called: getCityFact for ${city}`);
            let fact = 'I do not have a fact for this city.';
            if (city.toLowerCase() === 'paris') {
              fact = 'Paris is known as the "City of Light".';
            } else if (city.toLowerCase() === 'tokyo') {
              fact = 'Tokyo is the most populous metropolitan area in the world.';
            } else if (city.toLowerCase() === 'new york') {
              fact = 'New York City is home to the Statue of Liberty.';
            }
            return { fact };
          },
        },
      },
    });

    console.log('Returning stream');

    // Revert back to the correct response format for tool calling.
    // Now that the frontend issues are fixed, this should be parsed correctly.
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