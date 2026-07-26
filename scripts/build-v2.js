import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const WORKSPACE = join(PROJECT_ROOT, '..');

const tools = [
  {
    name: 'YTDescGen',
    description: 'Free AI YouTube description generator. Create optimized descriptions, timestamps, and hashtags.',
    tagline: 'Generate YouTube descriptions, timestamps, and hashtags in seconds.',
    prompt: "You are YTDescGen, a YouTube description writer. Given the following video title and topic, generate a complete YouTube description including: 1) A compelling intro paragraph, 2) What viewers will learn, 3) 10-15 relevant hashtags. Return ONLY the description.",
    color: '#cc0000',
    domain: 'ytdescgen',
    placeholder: 'Enter your video title or topic...',
  },
  {
    name: 'CaptionGen',
    description: 'Free AI caption generator. Get 5 engaging social media captions for any post.',
    tagline: 'Generate Instagram, TikTok, and social media captions instantly.',
    prompt: "You are CaptionGen, a social media caption writer. Given the following context, generate 5 engaging social media captions suitable for Instagram and TikTok. Each caption should be under 2200 characters, include 3-5 relevant hashtags, and have a conversational tone. Number them 1-5. Return ONLY the numbered list.",
    color: '#e1306c',
    domain: 'captiongen',
    placeholder: 'Describe your photo or post...',
  },
];

function copyFile(src, dest) {
  if (existsSync(src)) writeFileSync(dest, readFileSync(src));
}

for (const tool of tools) {
  const dest = join(WORKSPACE, tool.name);
  const slug = tool.domain;

  console.log('\n=== Building ' + tool.name + ' ===');

  mkdirSync(dest, { recursive: true });
  mkdirSync(join(dest, 'lib'), { recursive: true });
  mkdirSync(join(dest, 'functions', 'api'), { recursive: true });
  mkdirSync(join(dest, 'images'), { recursive: true });

  // Config files
  const csp = 'default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; connect-src \'self\' https://api.web3forms.com; font-src \'self\'; base-uri \'self\'; form-action \'self\' https://api.web3forms.com; frame-ancestors \'none\';';

  writeFileSync(join(dest, '_headers'), '/*\n  Content-Security-Policy: ' + csp + '\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: geolocation=(), microphone=(), camera=()\n  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\n');
  writeFileSync(join(dest, '.env.example'), 'DEEPSEEK_API_KEY=sk-your-key-here\n');
  writeFileSync(join(dest, '.gitignore'), 'node_modules/\n.env\n');
  writeFileSync(join(dest, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://' + slug + '.pages.dev/sitemap.xml\n');
  writeFileSync(join(dest, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://' + slug + '.pages.dev/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url></urlset>\n');

  // Package.json
  writeFileSync(join(dest, 'package.json'), JSON.stringify({
    name: slug, version: '1.0.0', description: tool.description,
    main: 'server.js', type: 'module',
    scripts: { dev: 'node server.js', start: 'node server.js' },
    dependencies: { dotenv: '^16.6.1' }, private: true,
  }, null, 2));

  // Lib
  const lib = `export const MAX_CHARS = 2000;
export const SYSTEM_PROMPT =
  "${tool.prompt}";
export function validateText(text) {
  if (!text || typeof text !== 'string') return { valid: false, error: "Missing 'text' field.", status: 400 };
  const trimmed = text.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Text cannot be empty.', status: 400 };
  if (trimmed.length > MAX_CHARS) return { valid: false, error: 'Text exceeds ' + MAX_CHARS + ' character limit.', status: 400 };
  if (/<[a-z][\\s\\S]*>/i.test(trimmed)) return { valid: false, error: 'HTML tags are not allowed.', status: 400 };
  return { valid: true, trimmed };
}
export function cleanResponse(corrected) {
  if ((corrected.startsWith('"') && corrected.endsWith('"')) || (corrected.startsWith("'") && corrected.endsWith("'"))) return corrected.slice(1, -1);
  return corrected;
}
export async function callDeepSeek(text, apiKey) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: text }], max_tokens: 2000, temperature: 0.3 }),
  });
  if (!response.ok) { const e = await response.text(); console.error('API error:', response.status, e); const err = new Error('API error: ' + response.status); err.status = 502; throw err; }
  const data = await response.json();
  const corrected = data.choices?.[0]?.message?.content?.trim();
  if (!corrected) { const err = new Error('Empty response from AI.'); err.status = 502; throw err; }
  return cleanResponse(corrected);
}`;
  writeFileSync(join(dest, 'lib', slug + '.js'), lib);

  // Server
  const server = `import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { validateText, callDeepSeek } from './lib/${slug}.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '.env') });
const MIME_TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  if (req.url === '/api/${slug}') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return; }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid JSON body.' })); return; }
      const validation = validateText(parsed.text);
      if (!validation.valid) { res.writeHead(validation.status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: validation.error })); return; }
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'API key not configured.' })); return; }
      try {
        const corrected = await callDeepSeek(validation.trimmed, apiKey);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ original: validation.trimmed, corrected }));
      } catch (e) { console.error('Server error:', e); const status = e.status || 500; res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }
  const filePath = join(__dirname, req.url === '/' ? 'index.html' : req.url);
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end('Forbidden'); return; }
  const ext = extname(filePath);
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
  if (existsSync(filePath)) { const content = readFileSync(filePath); res.writeHead(200, { 'Content-Type': mimeType }); res.end(content); }
  else { const indexPath = join(__dirname, 'index.html'); if (existsSync(indexPath)) { const content = readFileSync(indexPath); res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(content); } else { res.writeHead(404); res.end('Not Found'); } }
});
const PORT = process.env.PORT || 3000;
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) server.listen(PORT, () => console.log('Server running at http://localhost:' + PORT));
export { server, PORT };
export default server;`;
  writeFileSync(join(dest, 'server.js'), server);

  // Cloudflare Function
  const func = `const RATE_WINDOW_MS = 60000;
const RATE_MAX = 60;
const rateMap = new Map();
function rateLimit(ip) { const now = Date.now(); const entry = rateMap.get(ip) || []; const valid = entry.filter(t => t > now - RATE_WINDOW_MS); if (valid.length >= RATE_MAX) return true; valid.push(now); rateMap.set(ip, valid); return false; }
const ALLOWED_ORIGINS = ['https://${slug}.pages.dev', 'http://localhost:3000'];
function corsHeaders(request) { const o = request.headers.get('Origin') || ''; return { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' }; }
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(request) });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders(request) });
  const hdrs = corsHeaders(request); hdrs['Content-Type'] = 'application/json';
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (rateLimit(ip)) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), { status: 429, headers: hdrs });
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), { status: 415, headers: hdrs });
  const cl = request.headers.get('Content-Length');
  if (cl && parseInt(cl) > 10000) return new Response(JSON.stringify({ error: 'Request body too large.' }), { status: 413, headers: hdrs });
  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), { status: 400, headers: hdrs }); }
  if (!body.text || typeof body.text !== 'string') return new Response(JSON.stringify({ error: "Missing 'text' field." }), { status: 400, headers: hdrs });
  const trimmed = body.text.trim();
  if (trimmed.length === 0) return new Response(JSON.stringify({ error: 'Text cannot be empty.' }), { status: 400, headers: hdrs });
  if (trimmed.length > 2000) return new Response(JSON.stringify({ error: 'Text exceeds 2000 character limit.' }), { status: 400, headers: hdrs });
  if (/<[a-z][\\s\\S]*>/i.test(trimmed)) return new Response(JSON.stringify({ error: 'HTML tags are not allowed.' }), { status: 400, headers: hdrs });
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured.' }), { status: 500, headers: hdrs });
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: "${tool.prompt}" }, { role: 'user', content: trimmed }], max_tokens: 2000, temperature: 0.3 }),
    });
    if (!response.ok) { const e = await response.text(); console.error('API error:', response.status, e); return new Response(JSON.stringify({ error: 'AI service error.' }), { status: 502, headers: hdrs }); }
    const data = await response.json();
    const corrected = data.choices?.[0]?.message?.content?.trim();
    if (!corrected) { return new Response(JSON.stringify({ error: 'Empty response from AI.' }), { status: 502, headers: hdrs }); }
    return new Response(JSON.stringify({ original: trimmed, corrected }), { status: 200, headers: hdrs });
  } catch (e) { console.error('Worker error:', e); return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500, headers: hdrs }); }
}`;
  writeFileSync(join(dest, 'functions', 'api', slug + '.js'), func);

  // HTML
  const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + tool.name + ' – ' + tool.description.split('.')[0] + '</title>\n<meta name="description" content="' + tool.description + '">\n<link rel="stylesheet" href="style.css">\n<meta name="theme-color" content="' + tool.color + '">\n<meta property="og:title" content="' + tool.name + ' – ' + tool.description.split('.')[0] + '">\n<meta property="og:description" content="' + tool.description + '">\n<meta property="og:url" content="https://' + slug + '.pages.dev">\n<meta property="og:type" content="website">\n<link rel="canonical" href="https://' + slug + '.pages.dev">\n</head>\n<body>\n<a href="#main-content" class="skip-link">Skip to main content</a>\n<header role="banner">\n<h1>' + tool.name + '</h1>\n<p>' + tool.tagline + '</p>\n</header>\n<main role="main" id="main-content" tabindex="-1">\n<section aria-label="Input">\n<label for="input-text" class="sr-only">Enter your text</label>\n<textarea id="input-text" rows="8" placeholder="' + tool.placeholder + ' (max 2000 characters)..." aria-required="true" maxlength="2100"></textarea>\n<div id="char-count" aria-live="polite">0/2000</div>\n<div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">\n<button id="check-btn" type="button" aria-label="Generate" class="btn-primary">Generate</button>\n<span id="loading-spinner" style="display:none;" aria-hidden="true">Processing...</span>\n</div>\n<div id="result" aria-live="polite" role="status" style="display:none;"></div>\n</section>\n<section aria-label="How it works" class="info-section">\n<h2>How It Works</h2>\n<ol>\n<li>Enter your text or topic.</li>\n<li>Click <strong>Generate</strong>.</li>\n<li>Get your results instantly.</li>\n</ol>\n<p>Your data is never stored or shared.</p>\n</section>\n<section aria-label="Upgrade option" class="pro-section">\n<h2>Pro</h2>\n<p><strong>' + tool.name + ' Pro</strong> — <strong>$5/month</strong> — unlimited length, priority processing, export.</p>\n<a href="https://buy.stripe.com/PLACEHOLDER" target="_blank" rel="noopener noreferrer" class="btn-primary" style="text-decoration:none;display:inline-block;margin-top:0.5rem;">Upgrade to Pro</a>\n<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">\n<p style="font-size:0.9rem;opacity:0.8;margin-bottom:0.5rem;">Get notified about updates and discounts:</p>\n<form id="email-form" style="display:flex;gap:0.5rem;flex-wrap:wrap;">\n<input type="email" id="email-input" placeholder="your@email.com" required style="flex:1;min-width:180px;padding:0.6rem;font-size:0.9rem;border:2px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);">\n<button type="submit" class="btn-primary" style="padding:0.6rem 1.2rem;font-size:0.9rem;">Notify Me</button>\n</form>\n<div id="email-status" style="font-size:0.85rem;margin-top:0.4rem;display:none;"></div>\n</div>\n</section>\n</main>\n<footer role="contentinfo">\n<p>No signup, no tracking, no storage. &copy; 2026 ' + tool.name + '.</p>\n</footer>\n<script src="app.js"></script>\n</body>\n</html>';
  writeFileSync(join(dest, 'index.html'), html);

  // CSS
  const css = ':root { --bg: #fff; --text: #1a1a2e; --accent: ' + tool.color + '; --btn-bg: ' + tool.color + '; --btn-text: #fff; --border: #b0b0b0; --focus: ' + tool.color + '; }\n@media (prefers-color-scheme: dark) { :root { --bg: #121212; --text: #e0e0e0; --accent: ' + tool.color + '; --btn-bg: ' + tool.color + '; --btn-text: #fff; --border: #555; --focus: ' + tool.color + '; } }\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 1rem; max-width: 800px; margin: auto; min-height: 100vh; display: flex; flex-direction: column; }\nheader, main, footer { margin-bottom: 2rem; }\nh1 { font-size: 2rem; margin-bottom: 0.5rem; }\nheader p { font-size: 1.1rem; opacity: 0.85; }\ntextarea { width: 100%; padding: 0.75rem; font-size: 1rem; border: 2px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); resize: vertical; }\ntextarea:focus { outline: 3px solid var(--focus); outline-offset: 2px; border-color: var(--focus); }\n.btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: bold; background: var(--btn-bg); color: var(--btn-text); border: none; border-radius: 8px; cursor: pointer; margin-top: 1rem; transition: background 0.2s; }\n.btn-primary:hover { opacity: 0.9; }\n.btn-primary:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }\n.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }\n.btn-secondary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600; background: transparent; color: var(--accent); border: 2px solid var(--accent); border-radius: 6px; cursor: pointer; text-decoration: none; }\n.btn-secondary:hover { opacity: 0.8; }\n.btn-secondary:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }\n#char-count { text-align: right; font-size: 0.85rem; margin-top: 0.25rem; opacity: 0.7; }\n#loading-spinner { display: inline; margin-left: 0.5rem; font-style: italic; opacity: 0.7; }\n#result { margin-top: 1rem; padding: 1rem; border-radius: 8px; background: var(--bg); border: 1px solid var(--border); white-space: pre-wrap; word-break: break-word; min-height: 2.5rem; }\n#result[aria-busy="true"] { opacity: 0.6; }\n#result:empty { display: none; }\n.info-section, .pro-section { margin-top: 2rem; padding: 1rem; border: 1px solid var(--border); border-radius: 8px; }\n.info-section h2, .pro-section h2 { font-size: 1.3rem; margin-bottom: 0.5rem; }\n.info-section ol { margin-left: 1.5rem; margin-bottom: 0.5rem; }\n.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }\n.skip-link { position: absolute; top: -100%; left: 0; background: var(--btn-bg); color: var(--btn-text); padding: 0.5rem 1rem; z-index: 100; text-decoration: none; font-weight: bold; }\n.skip-link:focus { top: 0; outline: 3px solid var(--focus); outline-offset: 2px; }\nfooter { margin-top: auto; font-size: 0.9rem; opacity: 0.8; border-top: 1px solid var(--border); padding-top: 1rem; }\na { color: var(--accent); }\n@media (max-width: 600px) { body { padding: 0.75rem; } h1 { font-size: 1.5rem; } .btn-primary { width: 100%; justify-content: center; } }\n';
  writeFileSync(join(dest, 'style.css'), css);

  // App JS
  const app = `document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('check-btn');
    const input = document.getElementById('input-text');
    const resultDiv = document.getElementById('result');
    const charCount = document.getElementById('char-count');
    const spinner = document.getElementById('loading-spinner');
    if (!btn || !input || !resultDiv) { console.error('Missing DOM elements'); return; }
    if (charCount) { input.addEventListener('input', () => { const l = input.value.length; charCount.textContent = l + '/2000'; charCount.style.color = l > 2000 ? '#d33' : ''; }); }
    async function generate(text) {
        resultDiv.innerHTML = ''; resultDiv.style.display = 'block'; btn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        try {
            const controller = new AbortController(); const tid = setTimeout(() => controller.abort(), 30000);
            const res = await fetch('/api/${slug}', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }), signal: controller.signal
            });
            clearTimeout(tid);
            if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Unknown error' })); throw new Error(err.error || 'HTTP ' + res.status); }
            const data = await res.json();
            resultDiv.innerHTML = '<div style="white-space:pre-wrap;word-break:break-word;margin-bottom:0.75rem;">' + (data.corrected || text).replace(/\\n/g, '<br>') + '</div><div style="display:flex;gap:0.5rem;flex-wrap:wrap;"><button id="copy-btn" class="btn-secondary">Copy</button><a id="share-btn" href="#" target="_blank" rel="noopener noreferrer" class="btn-secondary">Share on X</a></div>';
            document.getElementById('copy-btn').addEventListener('click', () => navigator.clipboard.writeText(data.corrected + '\\n\\nGenerated via ${tool.name} (${slug}.pages.dev)'));
            document.getElementById('share-btn').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(data.corrected) + '&url=' + encodeURIComponent('https://${slug}.pages.dev');
        } catch (error) {
            if (error.name === 'AbortError') resultDiv.innerHTML = 'Error: Request timed out.';
            else if (error.message === 'Failed to fetch') resultDiv.innerHTML = 'Error: Could not reach the server.';
            else resultDiv.innerHTML = 'Error: ' + error.message;
        } finally { btn.disabled = false; if (spinner) spinner.style.display = 'none'; }
    }
    btn.addEventListener('click', () => {
        const text = input.value.trim();
        if (!text) { resultDiv.innerHTML = 'Please enter some text.'; resultDiv.style.display = 'block'; return; }
        if (text.length > 2000) { resultDiv.innerHTML = 'Free limit is 2000 characters. Pro removes this limit.'; resultDiv.style.display = 'block'; return; }
        generate(text);
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); btn.click(); } });
    const emailForm = document.getElementById('email-form');
    const emailInput = document.getElementById('email-input');
    const emailStatus = document.getElementById('email-status');
    if (emailForm && emailInput && emailStatus) {
        const WEB3FORMS_KEY = 'eaa64dab-81bc-4e81-85cb-5c3525d5eb52';
        emailForm.addEventListener('submit', (e) => {
            e.preventDefault(); const email = emailInput.value.trim(); if (!email) return;
            emailStatus.style.display = 'block'; emailStatus.textContent = 'Joining...';
            if (WEB3FORMS_KEY !== 'YOUR_WEB3FORMS_KEY') { fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_key: WEB3FORMS_KEY, email, source: '${tool.name}' }) }).catch(() => {}); }
            try { const saved = JSON.parse(localStorage.getItem('${slug}_emails') || '[]'); saved.push({ email, date: new Date().toISOString() }); localStorage.setItem('${slug}_emails', JSON.stringify(saved)); } catch {}
            emailStatus.textContent = "You're on the list!"; emailStatus.style.color = '#2e7d32'; emailInput.value = '';
        });
    }
});`;
  writeFileSync(join(dest, 'app.js'), app);

  // Install
  try { execSync('npm install', { cwd: dest, stdio: 'pipe' }); } catch {}

  console.log('  Created: ' + dest);
}

console.log('\n=== DONE: 2 tools built ===');
