const MAX_BODY_BYTES = 10000;

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
        return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
            status: 415,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const cl = request.headers.get('Content-Length');
    if (cl && parseInt(cl) > MAX_BODY_BYTES) {
        return new Response(JSON.stringify({ error: 'Request body too large.' }), {
            status: 413,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!body.text || typeof body.text !== 'string') {
        return new Response(JSON.stringify({ error: "Missing 'text' field." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const trimmed = body.text.trim();
    if (trimmed.length === 0) {
        return new Response(JSON.stringify({ error: 'Text cannot be empty.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    if (trimmed.length > 2000) {
        return new Response(JSON.stringify({ error: 'Text exceeds 2000 character limit.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    if (/<[a-z][\s\S]*>/i.test(trimmed)) {
        return new Response(JSON.stringify({ error: 'HTML tags are not allowed.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key not configured.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: "You are GrammarFix, a grammar checker. Correct the user's text for grammar, spelling, punctuation, and clarity. Return ONLY the corrected text \u2014 no explanations, no greetings, no quotes, no formatting. If the text is already correct, return it exactly as given." },
                    { role: 'user', content: trimmed },
                ],
                max_tokens: 2000,
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek API error:', response.status, errorText);
            return new Response(JSON.stringify({ error: 'API error: ' + response.status }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();
        const corrected = data.choices?.[0]?.message?.content?.trim();

        if (!corrected) {
            return new Response(JSON.stringify({ error: 'Empty response from AI.' }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ original: trimmed, corrected }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (e) {
        console.error('GrammarFix Worker error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
