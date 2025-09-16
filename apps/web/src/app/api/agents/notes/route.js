export async function POST(request) {
  try {
    const {
      text = '',
      preset = 'outline',
    } = await request.json();
    if (!String(text || '').trim()) {
      return Response.json({ error: 'Missing text' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Server LLM key not configured' }, { status: 500 });
    }

    const presets = {
      outline:
        'Produce concise study notes with sections: Summary, Literary Context, Historical/Cultural Context, Cross-References (list key passages with brief phrases), Themes, Key Terms, Application Ideas, Questions for Reflection. Remain non-sectarian and acknowledge uncertainty when relevant.',
      exegetical:
        'Create verse-by-verse exegetical notes. For each reference, give: Translation observations (if any), Key terms, Immediate context, Cross-references, Interpretive options, and a 1-sentence takeaway.',
      sermon:
        'Draft sermon-prep notes: Big Idea, Supporting Movements (2–4), Illustrations/analogies suggestions, Cross-References, Application, Call to Action. Warm, accessible tone.',
      youth:
        'Write youth-friendly notes: Short Summary, What\'s Happening, Why It Matters, Cross-References, Try This, Discussion Questions (3). Simple language, no slang.',
      academic:
        'Provide academic-style notes: Literary form/genre, Intertextual links, Historical-critical background, Semantic range of key terms (high-level), Interpretive debates, Bibliography suggestions (placeholder if unknown).',
    };

    const style = presets[preset] || presets.outline;

    const system = 'You are Scripture Buddy, a neutral multi-tradition study assistant. You write clear, reliable notes for passages from any scripture tradition. Avoid dogma; cite cross-references by canonical name when apparent, otherwise suggest likely parallels. Maintain respect across faiths.';
    const user = `Passage (may contain [Book C:V] markers):\n\n${text}\n\nInstructions: ${style}`;

    const upstream = await fetch(new URL('/api/llm/chat', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpointBase: 'https://api.openai.com/v1',
        path: '/chat/completions',
        apiKey,
        model: 'gpt-4o-mini',
        temperature: 0.5,
        max_tokens: 1600,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
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
    console.error('/api/agents/notes error', error);
    return Response.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

