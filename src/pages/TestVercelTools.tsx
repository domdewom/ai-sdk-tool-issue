import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function TestVercelTools() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { messages, error, setMessages } = useChat({
    // We are removing the transport to handle it manually
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: input }],
    };
    
    // Add user message to the list
    setMessages([...messages, userMessage]);
    setInput('');

    try {
      const response = await fetch('/api/chat-with-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response from server.');
      }

      // Manual stream reading
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let assistantMessageId = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonString = line.substring(6).trim();
            if (jsonString === '[DONE]') {
              break;
            }
            if (jsonString) {
              try {
                const parsed = JSON.parse(jsonString);
                if (parsed.type === 'text-delta') {
                  fullResponse += parsed.delta;

                  setMessages(currentMessages => {
                    const lastMessage = currentMessages[currentMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      const updatedLastMessage = {
                        ...lastMessage,
                        parts: [{ type: 'text' as const, text: fullResponse }],
                      };
                      return [...currentMessages.slice(0, -1), updatedLastMessage];
                    } else {
                      const newAssistantMessage = {
                        id: Date.now().toString(),
                        role: 'assistant' as const,
                        parts: [{ type: 'text' as const, text: fullResponse }],
                      };
                      return [...currentMessages, newAssistantMessage];
                    }
                  });
                }
              } catch (e) {
                console.error('Failed to parse a stream chunk:', jsonString, e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Manual fetch error:', err);
      const errorMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        parts: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
      };
      setMessages(currentMessages => [...currentMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Vercel AI Test with Tools</h1>
      <p style={{ color: '#666', fontSize: '14px' }}>
        This version includes tool calling. Try asking about weather or podcasts!
      </p>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '15px', marginBottom: '20px', borderRadius: '4px' }}>
          <strong>Error:</strong> {error.message}
        </div>
      )}
      
      <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', minHeight: '300px' }}>
        {messages.map((message) => (
          <div key={message.id} style={{ marginBottom: '15px' }}>
            <strong style={{ color: message.role === 'user' ? '#0066cc' : '#009900' }}>
              {message.role}:
            </strong>
            <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
              {message.parts?.map((part, idx) => {
                if (part.type === 'text') {
                  return <div key={idx}>{part.text}</div>;
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {isLoading && <div style={{ color: '#999', fontStyle: 'italic' }}>Assistant is thinking…</div>}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Try: 'What's the weather in Paris?' or 'Tell me about AI podcasts'"
          style={{ flex: 1, padding: '10px', fontSize: '16px' }}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading} style={{ padding: '10px 20px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>Test questions (these will trigger tools):</strong></p>
        <ul style={{ lineHeight: '1.8' }}>
          <li>"What's the weather in Paris?"</li>
          <li>"Check the weather in Tokyo"</li>
          <li>"Tell me about productivity podcasts"</li>
          <li>"Find me episodes about AI"</li>
        </ul>
      </div>
    </div>
  );
}

