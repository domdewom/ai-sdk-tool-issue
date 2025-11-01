# Vercel AI SDK v5: streamText + Tools Issue Reproduction

This repository contains a minimal reproducible example of an issue with the Vercel AI SDK v5 where `streamText()` with tools executes successfully but doesn't generate follow-up text.

## 📋 Full Report

See **[vercel-ai-sdk-streaming-tools-issue.md](./vercel-ai-sdk-streaming-tools-issue.md)** for the complete detailed report with:
- Environment details
- Code examples
- Actual logs
- What we've tried
- Questions for Vercel team

## 🚀 Quick Start

See **[REPRODUCE-VERCEL-ISSUE.md](./REPRODUCE-VERCEL-ISSUE.md)** for setup instructions.

### TL;DR:
```bash
# Install dependencies
npm install && cd api && npm install && cd ..

# Set your OpenAI key
echo "OPENAI_API_KEY=sk-your-key-here" > .env

# Run
vercel dev
# Or: npm run dev

# Navigate to http://localhost:3000
# Test: Ask "What's the weather in Paris?"
```

## 🐛 The Issue

**Expected**: Tool executes → LLM generates text ("The weather in Paris is...")  
**Actual**: Tool executes successfully → Stream ends → No text generated

## 📁 Structure

- `api/chat-with-tools.ts` - ❌ Broken: Streaming with tools
- `api/chat-simple.ts` - ✅ Works: Simple streaming (no tools)
- `src/pages/TestVercelTools.tsx` - Frontend test component
- `vercel-ai-sdk-streaming-tools-issue.md` - Full detailed report

## 🔍 Environment

- AI SDK: 5.0.86
- @ai-sdk/openai: 2.0.59
- Runtime: Vercel Edge
- Model: gpt-4o-mini
