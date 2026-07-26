import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const WORKSPACE = join(PROJECT_ROOT, '..');

const tools = [
  {
    name: 'RewriteText',
    description: 'Free AI paraphrasing tool. Rewrite sentences, paragraphs, or articles in seconds.',
    prompt: "You are RewriteText, a rewriting assistant. Rewrite the following text to improve clarity, tone, and flow while preserving the original meaning. Return ONLY the rewritten text \u2014 no explanations, no greetings, no quotes, no formatting.",
    color: '#2e7d32',
    domain: 'rewritetext',
  },
  {
    name: 'HeadlineGen',
    description: 'Free AI headline generator. Get 10 click-worthy headlines for any topic.',
    prompt: "You are HeadlineGen, a headline writer. Generate 10 attention-grabbing headlines for the following topic. Each headline should be unique and under 80 characters. Number them 1-10. Return ONLY the numbered list \u2014 no explanations, no greetings, no extra text.",
    color: '#e65100',
    domain: 'headlinegen',
  },
  {
    name: 'ReadableAI',
    description: 'Free readability checker. Analyze text for grade level, reading time, and clarity.',
    prompt: "You are ReadableAI, a readability expert. Analyze the following text. Provide: 1) Estimated US grade level, 2) Estimated reading time, 3) Sentence count, 4) Complex words (3+ syllables), 5) 3 specific suggestions to improve readability. Return ONLY the analysis \u2014 no greetings, no extra text.",
    color: '#6a1b9a',
    domain: 'readableai',
  },
];

function getPlaceholder(name) {
  if (name === 'RewriteText') return 'Paste or type your text here to rewrite...';
  if (name === 'HeadlineGen') return 'Describe your topic or paste your content...';
  if (name === 'ReadableAI') return 'Paste your text to analyze readability...';
  return 'Paste your text here...';
}

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'scripts' || entry.name === '.github') continue;
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      writeFileSync(d, readFileSync(s));
    }
  }
}

for (const tool of tools) {
  const dest = join(WORKSPACE, tool.name);
  const slug = tool.domain;

  console.log('\n=== Building ' + tool.name + ' ===\n');

  // Clone from GrammarFix
  copyDir(join(PROJECT_ROOT, 'lib'), join(dest, 'lib'));
  copyDir(join(PROJECT_ROOT, 'images'), join(dest, 'images'));

  const templateFiles = ['_headers', '.env.example', '.gitignore', 'robots.txt', 'sitemap.xml', 'wrangler.toml', 'manifest.json', 'service-worker.js'];
  for (const f of templateFiles) {
    const src = join(PROJECT_ROOT, f);
    if (existsSync(src)) writeFileSync(join(dest, f), readFileSync(src));
  }

  // Custom package.json
  writeFileSync(join(dest, 'package.json'), JSON.stringify({
    name: slug,
    version: '1.0.0',
    description: tool.description,
    main: 'server.js',
    type: 'module',
    scripts: { dev: 'node server.js', start: 'node server.js' },
    dependencies: { dotenv: '^16.6.1' },
    private: true,
  }, null, 2));

  // server.js (copy from GrammarFix server.js, change import)
  let serverCode = readFileSync(join(PROJECT_ROOT, 'server.js'), 'utf-8')
    .replace('./lib/grammar.js', './lib/' + slug + '.js')
    .replace('grammarfix.pages.dev', slug + '.pages.dev');

  // Fix paths
  serverCode = serverCode.split('GrammarFix').join(tool.name);
  writeFileSync(join(dest, 'server.js'), serverCode);

  // index.html
  let html = readFileSync(join(PROJECT_ROOT, 'index.html'), 'utf-8');
  html = html
    .replace(/GrammarFix/g, tool.name)
    .replace(/grammarfix/g, slug)
    .replace('Free AI Grammar Checker', tool.description.split('. ')[0])
    .replace('Check your grammar instantly', tool.description.split('.')[0])
    .replace(/stripe\.com\/[^\s"]+/g, 'buy.stripe.com/PLACEHOLDER')
    .replace('Paste or type your text here', getPlaceholder(tool.name));
  writeFileSync(join(dest, 'index.html'), html);

  // app.js
  let app = readFileSync(join(PROJECT_ROOT, 'app.js'), 'utf-8');
  app = app
    .replace('/api/grammar', '/api/' + slug)
    .replace('GrammarFix', tool.name);
  writeFileSync(join(dest, 'app.js'), app);

  // style.css with custom color
  let css = readFileSync(join(PROJECT_ROOT, 'style.css'), 'utf-8');
  css = css
    .replace(/#0056b3/g, tool.color)
    .replace(/#0f4c81/g, tool.color);
  writeFileSync(join(dest, 'style.css'), css);

  // lib file
  let lib = readFileSync(join(PROJECT_ROOT, 'lib', 'grammar.js'), 'utf-8');
  lib = lib
    .split('GrammarFix').join(tool.name)
    .replace(/'text' field/, "'text' field")
    .replace(/SYSTEM_PROMPT[\s\S]*?(?=\nexport)/, 'SYSTEM_PROMPT =\n  "' + tool.prompt + '";');
  writeFileSync(join(dest, 'lib', slug + '.js'), lib);

  // Cloudflare function
  mkdirSync(join(dest, 'functions', 'api'), { recursive: true });
  let func = readFileSync(join(PROJECT_ROOT, 'functions', 'api', 'grammar.js'), 'utf-8');
  func = func
    .replace('grammarfix.pages.dev', slug + '.pages.dev')
    .replace(/localhost:3000/g, 'localhost:' + (3001 + tools.indexOf(tool)))
    .replace(new RegExp(tool.name === 'RewriteText' ? 'RewriteText' : 'GrammarFix', 'g'), tool.name);
  // Update the system prompt in the inlined function
  const promptStart = func.indexOf('You are');
  if (promptStart !== -1) {
    const promptEnd = func.indexOf('"', promptStart + 100);
    if (promptEnd !== -1) {
      func = func.slice(0, promptStart) + tool.prompt + func.slice(promptEnd);
    }
  }
  func = func.replace('/api/grammar', '/api/' + slug);
  writeFileSync(join(dest, 'functions', 'api', slug + '.js'), func);

  // .gitignore
  writeFileSync(join(dest, '.gitignore'), 'node_modules/\n.env\n');

  // Install deps
  try { execSync('npm install', { cwd: dest, stdio: 'pipe' }); } catch {}

  console.log('  Created: ' + dest);
  console.log('  Deploy:  npx wrangler pages deploy . --project-name ' + slug + ' --branch main');
}

console.log('\n=== DONE: 3 tools created ===');
