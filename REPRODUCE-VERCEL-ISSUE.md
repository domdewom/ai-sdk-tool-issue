# Reproducible Example: Vercel AI SDK streamText + Tools Issue

This package contains a minimal reproducible example of the issue where `streamText` with tools executes successfully but doesn't generate follow-up text.

## Full Issue Report

See `tasks/vercel-ai-sdk-streaming-tools-issue-report.md` for the complete detailed report.

## Quick Setup

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# API dependencies
cd api
npm install
cd ..
```

### 2. Set Environment Variable

Create `.env` in the project root:
```
OPENAI_API_KEY=sk-your-key-here
```

### 3. Run Local Dev Server

```bash
npm run dev
# Or if you have vercel CLI:
vercel dev
```

### 4. Test the Issue

Navigate to: `http://localhost:3000/test-vercel-tools`

Ask: "What's the weather in Paris?"

**Expected**: Tool executes, then LLM generates text like "The weather in Paris is..."

**Actual**: Tool executes (visible in terminal logs), but no text is generated. Frontend shows nothing.

## File Structure

```
├── api/                              # Vercel API Functions
│   ├── chat-simple.ts               # ✅ WORKS: Simple streaming (no tools)
│   ├── chat-with-tools.ts           # ❌ BROKEN: Streaming with tools
│   ├── package.json                 # API dependencies (ai v5.0.86)
│   └── tsconfig.json
├── src/
│   ├── pages/
│   │   └── TestVercelTools.tsx      # Frontend test component
│   └── App.tsx                       # Routes (includes /test-vercel-tools)
├── vercel.json                       # Vercel configuration
├── package.json                      # Frontend dependencies
└── .env                              # OPENAI_API_KEY (not included, create this)
```

## Key Files to Review

### Working Example (No Tools)
- **API**: `api/chat-simple.ts`
- **Test**: Navigate to `/test-vercel` (if route exists)

### Broken Example (With Tools)
- **API**: `api/chat-with-tools.ts`
- **Test**: Navigate to `/test-vercel-tools`
- **Frontend**: `src/pages/TestVercelTools.tsx`

## The Issue in 3 Steps

1. **User asks**: "What's the weather in Paris?"
2. **Tool executes**: `getWeather` runs and returns data (visible in logs)
3. **❌ No text**: Stream ends with `finishReason: 'tool-calls'`, text is empty

**Logs show**:
```
Tool called: getWeather for Paris
Step finished: { 
  text: '',                    ← EMPTY!
  toolCalls: 1, 
  toolResults: 1, 
  finishReason: 'tool-calls'   ← Stops here
}
Final text:                    ← EMPTY!
```

## What We've Tried

- ✅ Explicit system prompts instructing to generate text after tools
- ✅ `maxSteps: 5` (also tried 10, 15, 20)
- ✅ Different tool descriptions
- ✅ Both `toTextStreamResponse()` and `toDataStreamResponse()`
- ✅ `onStepFinish` logging to debug

**None of these work.** Only 1 step executes, stream ends immediately after tool call.

## Comparison: What Works vs What Doesn't

### ✅ Works: Simple Streaming (No Tools)
```typescript
const result = await streamText({
  model: openai('gpt-4o-mini'),
  messages,
  // NO tools
});
return result.toTextStreamResponse();
```
**Result**: Perfect word-by-word streaming

### ❌ Doesn't Work: Streaming with Tools
```typescript
const result = await streamText({
  model: openai('gpt-4o-mini'),
  messages,
  maxSteps: 5,
  tools: { getWeather: { /* ... */ } },
});
return result.toTextStreamResponse();
```
**Result**: Tool executes, but no text is ever generated

## Environment

- **AI SDK**: 5.0.86
- **@ai-sdk/openai**: 2.0.59
- **@ai-sdk/react**: ^1.0.0
- **Runtime**: Vercel Edge
- **Model**: gpt-4o-mini

## Questions for Vercel

1. Is this expected behavior?
2. Is `maxSteps` supposed to enable multi-step tool→text flows?
3. Are we missing a configuration?
4. Should we use `generateText` instead?
5. Is there a working example of `streamText` + tools generating follow-up text?

---

**Contact**: [domdewom@gmail.com]
**Date**: November 1, 2025

