import { useChat } from '@ai-sdk/react';

export default function TestVercelTools() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat-with-tools',
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onResponse: (response) => {
      console.log('Response received:', response.status, response.statusText);
    },
    onFinish: (message) => {
      console.log('Message finished:', message);
    },
  });
  
  console.log('Current messages:', messages.length);
  console.log('Is loading:', isLoading);
  console.log('Error:', error);

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
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: '15px' }}>
            <strong style={{ color: m.role === 'user' ? '#0066cc' : '#009900' }}>
              {m.role}:
            </strong>
            <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>{m.content}</div>
            
            {/* Show tool calls if present */}
            {m.toolInvocations && m.toolInvocations.length > 0 && (
              <div style={{ marginTop: '10px', padding: '10px', background: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
                <strong>🔧 Tools used:</strong>
                {m.toolInvocations.map((tool, idx) => (
                  <div key={idx} style={{ marginTop: '5px' }}>
                    • {tool.toolName}
                    {tool.state === 'result' && tool.result && (
                      <pre style={{ marginLeft: '10px', fontSize: '11px', overflow: 'auto' }}>
                        {JSON.stringify(tool.result, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && <div style={{ color: '#999', fontStyle: 'italic' }}>Assistant is thinking…</div>}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input
          value={input}
          onChange={handleInputChange}
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

