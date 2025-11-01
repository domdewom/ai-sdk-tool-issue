# Vercel AI SDK v5: streamText + Tools Issue Report

**Date**: November 1, 2025  
**AI SDK Version**: 5.0.86  
**@ai-sdk/openai Version**: 2.0.59  
**Environment**: Vercel Edge Runtime  
**Model**: gpt-4o-mini

## Executive Summary

We're experiencing an issue where `streamText()` with tools executes the tool successfully but **never generates follow-up text**, even when explicitly instructed to do so via system prompts and with `maxSteps` configured. The stream ends immediately after tool execution with `finishReason: 'tool-calls'`.

**Interestingly**: The exact same setup works perfectly when we use **manual context injection** (no SDK tools), which suggests this is specific to the SDK's tool execution flow, not the model or streaming infrastructure.

---

## Background: Why We Moved to Vercel

We initially tried implementing AI SDK tool calling in **Supabase Edge Functions (Deno runtime)** but encountered compatibility issues with the AI SDK. We decided to adopt a three-layer architecture:

- **Frontend Layer**: Vite + React (deployed on Vercel)
- **AI Layer**: Vercel Edge Functions (AI SDK, tool calling, streaming coordination)
- **Data Layer**: Supabase Edge Functions (database operations, business logic)

This architecture change successfully resolved the Deno compatibility issues, and basic streaming (without tools) works perfectly.

---

## What Works: Simple Streaming (No Tools)

This works flawlessly on Vercel:

```typescript
// api/chat-simple.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { messages } = await req.json();
  
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages,
    system: 'You are a helpful assistant. Keep responses concise and friendly.',
  });

  return result.toTextStreamResponse({
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
```

**Frontend (using `useChat`):**
```typescript
import { useChat } from '@ai-sdk/react';

export default function TestVercelSimple() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat-simple',
  });
  // ... UI code
}
```

**Result**: ✅ **Perfect streaming**, word-by-word responses, no issues.

---

## What Doesn't Work: streamText + Tools

When we add tools to the exact same setup, tools execute but no text is generated:

```typescript
// api/chat-with-tools.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const body = await req.json() as { messages: any[] };
  const { messages } = body;

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
            temperature: Math.floor(Math.random() * 20) + 10,
            condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
            humidity: Math.floor(Math.random() * 40) + 40,
          };
        },
      },
    },
  });

  return result.toTextStreamResponse({
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
```

**Frontend (identical to simple version):**
```typescript
import { useChat } from '@ai-sdk/react';

export default function TestVercelTools() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat-with-tools',
  });
  // ... UI code with tool invocation display
}
```

---

## The Problem: What Happens

**User Query**: "What's the weather in Paris?"

**Backend Logs**:
```
=== Vercel API with Tools Called ===
Messages received: 1
Last message: {
  role: 'user',
  content: 'whats the weather like in paris?',
  parts: [ { type: 'text', text: 'whats the weather like in paris?' } ]
}
Returning text stream with tools
Stream result type: object
Has toTextStreamResponse: function
Response status: 200
Response headers: {
  access-control-allow-origin: '*',
  cache-control: 'no-cache',
  connection: 'keep-alive',
  content-type: 'text/event-stream'
}
Tool called: getWeather for Paris
Step finished: {
  text: '',                      ← EMPTY!
  toolCalls: 1,
  toolResults: 1,
  finishReason: 'tool-calls'     ← Stops here
}
Final text:                      ← EMPTY!
Tool calls: [
  {
    type: 'tool-call',
    toolCallId: 'call_nRGAERNX0WILtdX0UtLua5Cx',
    toolName: 'getWeather',
    input: { location: 'Paris' },
    providerExecuted: undefined,
    providerMetadata: {
      openai: { itemId: 'fc_06a7200efe75b5d900690677392bc481a0af7b24d05edb5f52' }
    }
  }
]
Tool results: [
  {
    type: 'tool-result',
    toolCallId: 'call_nRGAERNX0WILtdX0UtLua5Cx',
    toolName: 'getWeather',
    input: { location: 'Paris' },
    providerExecuted: undefined,
    providerMetadata: {
      openai: { itemId: 'fc_06a7200efe75b5d900690677392bc481a0af7b24d05edb5f52' }
    },
    output: {
      location: 'Paris',
      temperature: 21,
      condition: 'sunny',
      humidity: 66
    }
  }
]
```

**Frontend Result**: ❌ No message appears in the chat. The "thinking..." indicator shows briefly then disappears. Browser console shows `Current messages: 0` and `Is loading: false`.

**Expected Behavior**: After tool execution, the LLM should generate a second step with natural language text like: "The weather in Paris is currently sunny with a temperature of 21°C and 66% humidity."

---

## What We've Tried

### Attempt 1: Explicit System Prompt
```typescript
system: 'You are a helpful assistant. When you call a tool, you MUST wait for the result and then provide a natural language response explaining the information you received. Never end your response after calling a tool - always interpret and explain the tool results to the user.',
```
**Result**: No change. Tool executes, stream ends.

### Attempt 2: Increased maxSteps
```typescript
maxSteps: 5,  // Also tried 10, 15, 20
```
**Result**: No change. Only 1 step executes (tool call), then stream ends.

### Attempt 3: Tool Description Modifications
```typescript
tools: {
  getWeather: {
    description: 'Get the current weather for a location. IMPORTANT: After calling this tool, always explain the results to the user in natural language.',
    // ...
  }
}
```
**Result**: No change.

### Attempt 4: Different Stream Response Methods
- Tried `toTextStreamResponse()`
- Tried `toDataStreamResponse()`
- Both have the same behavior

**Result**: No change.

### Attempt 5: Added onStepFinish Logging
```typescript
onStepFinish: (step) => {
  console.log('Step finished:', {
    text: step.text,
    toolCalls: step.toolCalls?.length,
    toolResults: step.toolResults?.length,
    finishReason: step.finishReason,
  });
},
```
**Result**: Confirmed only 1 step executes, `text` is always empty string, `finishReason` is always `'tool-calls'`.

---

## Key Observations

1. **Tool execution works perfectly** - `execute` functions run, return data, no errors
2. **Only 1 step executes** - Despite `maxSteps: 5`, the stream ends after the tool call
3. **`finishReason` is always 'tool-calls'** - Suggests the SDK thinks the conversation is complete
4. **No text is ever generated** - `result.text` Promise resolves to empty string
5. **No errors are thrown** - Everything appears successful from a code perspective
6. **Simple streaming (no tools) works perfectly** - Same model, same setup, streams flawlessly when tools are not used

---

## Environment Details

**Package Versions**:
```json
{
  "ai": "^5.0.0",           // Installed: 5.0.86
  "@ai-sdk/openai": "^2.0.0", // Installed: 2.0.59
  "zod": "^3.22.4"
}
```

**Vercel Configuration**:
```typescript
export const config = {
  runtime: 'edge',
};
```

**Frontend SDK**:
```json
{
  "@ai-sdk/react": "^1.0.0",
  "ai": "^5.0.0"
}
```

---

## Questions

1. **Is this expected behavior?** Should `streamText` with tools generate follow-up text after tool execution, or is this a misunderstanding of how the SDK works?

2. **Is `maxSteps` supposed to enable multi-step tool→text flows?** Our observation is that only 1 step executes regardless of `maxSteps` value.

3. **Are we missing a configuration parameter?** Is there something like `continueAfterTools` or `generateTextAfterTools` that we should be setting?

4. **Should we be using a different API?** Would `generateText` be more appropriate for tool calling scenarios where we need final text output?

5. **Is there a working example** of `streamText` + tools that generates natural language responses after tool execution? We've reviewed the docs but haven't found a complete example of this flow.

---

## Workarounds We're Considering

If this is expected behavior or a known limitation, we're considering these alternatives:

### Option A: Use `generateText` Instead of `streamText`
Sacrifice streaming for reliable tool calling.

**Pros**: SDK docs suggest this works, LLM selects tools  
**Cons**: No real-time streaming, worse UX 
**Conclusion**: not acceptable path as lag/delay on user side too long, defeats the whole point of "streaming text"...

### Option B: Client-Side Tool Execution
Define tools without `execute`, handle on client with `onToolCall`.

**Pros**: Streaming works, LLM selects tools  
**Cons**: More complex, exposes tool logic to client 
**Conclusion**: not acceptable path as exposes tool calls to user, not good practice or secure(?)...

### Option C: Manual Context Injection
Detect user intent, fetch data, inject as context, stream normally (no SDK tools).

**Pros**: True streaming, full control  
**Cons**: Can't leverage LLM's tool selection, limited scalability with many tools
**Conclusion**: seems like the only path but defeats a bit the purpose of using Vercel AI SDK at least on backend...

---

## Request for Assistance

We'd greatly appreciate guidance on:

1. Whether our implementation is correct
2. If this is a known limitation or bug in AI SDK 5.x
3. The recommended pattern for streaming + tool calling with natural language responses
4. Any working examples we can reference

