export async function POST(request) {
  try {
    const { text = '', style = 'Modern, clear and plain language' } = await request.json();
    if (!String(text || '').trim()) {
      return Response.json({ error: 'Missing text' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Server LLM key not configured' }, { status: 500 });
    }

    const system = `You restyle text while preserving meaning. Style preset: ${style}.`;

    const upstream = await fetch(new URL('/api/llm/chat', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpointBase: 'https://api.openai.com/v1',
        path: '/chat/completions',
        apiKey,
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!upstream.ok) {
      const details = await upstream.json().catch(() => ({}));
      const message = details?.error || details?.message || 'LLM failed';
      return Response.json({ error: message }, { status: upstream.status });
    }
    const data = await upstream.json();
    return Response.json({ text: data?.text || '' });
  } catch (error) {
    console.error('/api/agents/stylist error', error);
    return Response.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

