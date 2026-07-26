# GrammarFix - Deployment

## Deploy

```bash
npx wrangler pages deploy . --project-name grammarfix --branch main
```

## Environment Variables (Cloudflare Dashboard)

Workers & Pages → grammarfix → Settings → Environment Variables:

| Name | Value |
|------|-------|
| `DEEPSEEK_API_KEY` | `sk-your-key-here` |

## Rate Limiting

Built into the function (free, no addon needed):
- 60 requests per minute per IP
- Returns 429 when exceeded

For stronger protection at scale, upgrade to Cloudflare WAF rate limiting in the dashboard.

## Monetization

### Add Stripe Pro ($5/month)
1. Create a Stripe account at https://stripe.com
2. Get a Stripe Checkout link for $5/month subscription
3. Add the link to the Pro button in `index.html`

### Clone for another tool
```bash
node scripts/clone-site.js . ToolName "Description"
cd ../ToolName
npx wrangler pages deploy . --project-name tool-name --branch main
```

## Cost

- Cloudflare Pages: Free (100k req/day)
- DeepSeek API: ~$0.00007 per request
- 10k requests/month ≈ $0.70
