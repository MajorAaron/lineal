// ai.js — Lineal AI Research Plan Generator
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { prompt } = body;
  if (!prompt || prompt.trim().length < 10) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please provide ancestor details' }) };
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'AI service not configured' }) };
  }

  const systemPrompt = `You are an expert professional genealogist helping another genealogist plan their research for a client project.

Given information about an ancestor, generate a structured research plan. Be specific, practical, and prioritized. Format the response as a professional research plan with clear sections.

Include:
1. RESEARCH OBJECTIVE — One clear statement of what we're trying to prove/discover
2. PRIORITY RECORDS (list 5-7 specific record types, ranked by likelihood of yielding information, with specific repositories for each)
3. SEARCH STRATEGY — 2-3 specific search approaches, with exact database names or archive locations
4. LIKELY OBSTACLES — 2-3 anticipated challenges and how to address them
5. NEXT STEPS — The 3 most important actions to take first

Keep the response practical and actionable. Use specific record types, databases, and repositories (Ancestry, FamilySearch, NARA, state archives, etc.). Be concise — this is a working document, not an essay.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nClient's ancestor details:\n${prompt}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 700,
            temperature: 0.4,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'Gemini API error');
    }

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!result) throw new Error('Empty response from AI');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ result }),
    };
  } catch (err) {
    console.error('AI error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'AI generation failed', details: err.message }),
    };
  }
};
