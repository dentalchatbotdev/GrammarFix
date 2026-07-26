const MAX_BODY_BYTES = 10000;
const ALLOWED_ORIGINS = [
    'https://grammarfix.pages.dev',
    'http://localhost:3000',
];

const RATE_WINDOW_MS = 60000;
const RATE_MAX = 60;
const rateMap = new Map();

function rateLimit(ip) {
    const now = Date.now();
    const entry = rateMap.get(ip) || [];
    const valid = entry.filter(t => t > now - RATE_WINDOW_MS);
    if (valid.length >= RATE_MAX) {
        return true;
    }
    valid.push(now);
    rateMap.set(ip, valid);
    return false;
}

function corsHeaders(request) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin',
    };
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders(request) });
    }

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders(request) });
    }

    const hdrs = corsHeaders(request);
    hdrs['Content-Type'] = 'application/json';

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimit(ip)) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
            status: 429,
            headers: hdrs
        });
    }

    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
        return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
            status: 415,
            headers: hdrs
        });
    }

    const cl = request.headers.get('Content-Length');
    if (cl && parseInt(cl) > MAX_BODY_BYTES) {
        return new Response(JSON.stringify({ error: 'Request body too large.' }), {
            status: 413,
            headers: hdrs
        });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
            status: 400,
            headers: hdrs
        });
    }

    if (!body.text || typeof body.text !== 'string') {
        return new Response(JSON.stringify({ error: "Missing 'text' field." }), {
            status: 400,
            headers: hdrs
        });
    }

    const trimmed = body.text.trim();
    if (trimmed.length === 0) {
        return new Response(JSON.stringify({ error: 'Text cannot be empty.' }), {
            status: 400,
            headers: hdrs
        });
    }
    if (trimmed.length > 2000) {
        return new Response(JSON.stringify({ error: 'Text exceeds 2000 character limit.' }), {
            status: 400,
            headers: hdrs
        });
    }
    if (/<[a-z][\s\S]*>/i.test(trimmed)) {
        return new Response(JSON.stringify({ error: 'HTML tags are not allowed.' }), {
            status: 400,
            headers: hdrs
        });
    }

    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key not configured.' }), {
            status: 500,
            headers: hdrs
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
                headers: hdrs
            });
        }

        const data = await response.json();
        const corrected = data.choices?.[0]?.message?.content?.trim();

        if (!corrected) {
            return new Response(JSON.stringify({ error: 'Empty response from AI.' }), {
                status: 502,
                headers: hdrs
            });
        }

        return new Response(JSON.stringify({ original: trimmed, corrected }), {
            status: 200,
            headers: hdrs
        });
    } catch (e) {
        console.error('GrammarFix Worker error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error.' }), {
            status: 500,
            headers: hdrs
        });
    }
}
