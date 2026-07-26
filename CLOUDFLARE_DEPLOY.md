# GrammarFix - Cloudflare Deployment Guide

## Prerequisites
- Cloudflare account with Workers subscription (free tier sufficient)
- DeepSeek API key
- Node.js installed locally

## Setup Steps

### 1. Clone and Install
```bash
cd GrammarFix
npm install
```

### 2. Create `.env` file
```bash
cp .env.example .env
# Edit .env with your DeepSeek API key:
# DEEPSEEK_API_KEY=sk-your-key-here
```

### 3. Test Locally
```bash
node server.js
# Visit http://localhost:3000 in browser
# Test with text: "I goes to school yesterday."
# Expected: "I went to school yesterday."
```

### 4. Deploy to Cloudflare Pages

**Option A: Cloudflare Pages with Functions (Recommended)**

1. Create `functions/api/grammar.js`:
```javascript
export async function onRequest(context) {
    const { request, env } = context;
    
    // Handle CORS preflight
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

    // Parse body
    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const text = body.text;
    if (!text || typeof text !== 'string') {
        return new Response(JSON.stringify({ error: "Missing 'text' field." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const trimmed = text.trim();
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

    const systemPrompt =
        "You are GrammarFix, a grammar checker. Correct the user's text for grammar, spelling, punctuation, and clarity. " +
        "Return ONLY the corrected text — no explanations, no greetings, no quotes, no formatting. " +
        "If the text is already correct, return it exactly as given.";

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: trimmed },
                ],
                max_tokens: 2000,
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek API error:', response.status, errorText);
            return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
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

        const cleaned = corrected.replace(/^["']|["']$/g, '');
        return new Response(JSON.stringify({ original: trimmed, corrected: cleaned }), {
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
```

2. Set environment variable in Cloudflare Dashboard:
   - Go to Workers & Pages > your-project > Settings > Environment Variables
   - Add variable: `DEEPSEEK_API_KEY` = `sk-your-key-here`

3. Deploy:
```bash
npm install wrangler --save-dev
npx wrangler pages project create grammarfix --production-branch main
npx wrangler pages deploy . --project-name grammarfix
```

**Option B: Cloudflare Workers**

1. Create `wrangler.toml`:
```toml
name = "grammarfix"
main = "worker.js"
compatibility_date = "2024-09-23"
```

2. Keep the static files separate (deploy to Pages, Workers for API only)

### 5. Verify Deployment

1. Visit your Cloudflare Pages URL
2. Test with "I runs everyday." → should return "I run everyday."
3. Test with HTML tags → should return error
4. Test empty text → should return error
5. Test over 2000 chars → should return error

## Monetization

### 1. DeepSeek Affiliate Link
1. Sign up at https://platform.deepseek.com/affiliate
2. Get your referral code
3. Replace `YOUR_REFERRAL_CODE` in `index.html` footer with your actual code
4. Earn ~20% commission on referred API spend

### 2. Pro Tier ($5/month)
The Pro upsell is built into the UI. To activate payments:
1. Create a Stripe account at https://stripe.com
2. Add Stripe Checkout — the Pro section in `index.html` is ready for the link
3. Set up a webhook to grant access (Stripe Customer Portal works well)
4. Price point: $5/month for unlimited characters, style suggestions, PDF export

### 3. Ad Placement (after 50k visits/month)
The layout has space for a non-intrusive ad unit in the info-section area.

## Rate Limiting (Optional Add-on)

For production, add rate limiting via Cloudflare WAF:
- Go to Security > WAF > Rate Limiting Rules
- Create rule: Block requests exceeding 100 requests per 10 minutes per IP to `/api/grammar`
- Action: Block with 429 status

## Security Notes

- API key is stored in Cloudflare environment variables, never in code
- Text is never persisted in any database or file
- All requests are logged server-side (Cloudflare logs) but no text is stored
- HTTPS is enforced by Cloudflare
- CORS is limited as needed (current: open for demo)

## Cost Estimates

- Cloudflare Workers/Pages: Free tier (100k requests/day)
- DeepSeek API: ~$0.14 per 1M tokens (pay-as-you-go)
- For 2000 char requests (avg 500 tokens each): ~$0.00007 per request
- 10,000 requests/month ≈ $0.70

## Maintenance

- Update DeepSeek API key rotation as needed
- Monitor Cloudflare analytics for usage spikes
- Check DeepSeek API status at status.deepseek.com
