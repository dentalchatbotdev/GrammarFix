# GrammarFix

Free AI grammar checker. No signup, no tracking, no storage.

## Features

- Grammar, spelling, and punctuation correction
- 2000-character free limit
- WCAG accessible, keyboard navigable
- Rate-limited API (60 req/min/IP)
- CSP-secured, no cookies, no analytics
- Embeddable widget for any site

## Quick start

```bash
npm install
cp .env.example .env
# Add your DEEPSEEK_API_KEY
node server.js
```

## Deploy

```bash
npx wrangler pages deploy . --project-name grammarfix --branch main
```

Set `DEEPSEEK_API_KEY` in Cloudflare Dashboard → Environment Variables.

## Widget

Add to any site:
```html
<script src="https://grammarfix.pages.dev/widget.js"></script>
```

## Clone for new tools

```bash
node scripts/clone-site.js . NewToolName "Description"
```

## License

MIT
