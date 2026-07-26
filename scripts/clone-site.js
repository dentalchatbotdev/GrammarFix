import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const [,, source, name, description] = process.argv;

if (!source || !name) {
  console.error('Usage: node scripts/clone-site.js <source-path> <new-name> [description]');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/clone-site.js . SummarizeTube "Free AI YouTube Summarizer"');
  process.exit(1);
}

const srcPath = join(PROJECT_ROOT, source);
const destPath = join(PROJECT_ROOT, '..', name);

if (existsSync(destPath)) {
  console.error('Error: Destination already exists at ' + destPath);
  process.exit(1);
}

const toolName = name;
const toolSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const toolDescription = description || (toolName + ' - Free AI-powered tool');
const toolPrompt = 'You are ' + toolName + ', an AI assistant. ' + toolDescription + '. Return ONLY the result with no explanations, greetings, or formatting.';

console.log('Cloning ' + srcPath + ' -> ' + destPath);

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'scripts') continue;
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      writeFileSync(d, readFileSync(s));
    }
  }
}

copyDir(srcPath, destPath);

// Helper: replace in a file in the destination
function edit(path, fn) {
  const full = join(destPath, path);
  if (!existsSync(full)) return;
  const content = readFileSync(full, 'utf-8');
  writeFileSync(full, fn(content));
}

// index.html
edit('index.html', (c) => {
  return c
    .replace(/GrammarFix – Free AI Grammar Checker/g, toolName + ' - ' + toolDescription)
    .replace(/Check your grammar instantly/g, 'Get started instantly')
    .replace(/Paste or type your text here/g, 'Paste or type your content here')
    .replace(/Check Grammar/g, 'Check')
    .replace(/Get your corrected text instantly\./g, 'Get your result instantly.')
    .replace(/GrammarFix(?![a-zA-Z0-9-])/g, toolName);
});

// manifest.json
edit('manifest.json', (c) => {
  return c
    .replace(/GrammarFix - AI Grammar Checker/g, toolName + ' - ' + toolDescription)
    .replace(/"GrammarFix"/g, '"' + toolName + '"');
});

// lib/grammar.js — replace SYSTEM_PROMPT and tool name
edit('lib/grammar.js', (c) => {
  const lines = c.split('\n');
  const newLines = [];
  let inPrompt = false;
  for (const line of lines) {
    if (line.includes('export const SYSTEM_PROMPT =')) {
      newLines.push('export const SYSTEM_PROMPT =');
      newLines.push('  "' + toolPrompt + '";');
      inPrompt = true;
    } else if (inPrompt) {
      if (line.trim().endsWith('";')) {
        inPrompt = false;
      }
    } else {
      newLines.push(line.split('GrammarFix').join(toolName));
    }
  }
  return newLines.join('\n');
});

// package.json
edit('package.json', (c) => {
  return c
    .split('"grammarfix"').join('"' + toolSlug + '"')
    .split('Free AI grammar checker. No signup, no tracking, no storage.').join(toolDescription);
});

// wrangler.toml
edit('wrangler.toml', (c) => c.split('grammarfix').join(toolSlug));

// robots.txt
edit('robots.txt', (c) => c.split('grammarfix.pages.dev').join(toolSlug + '.pages.dev'));

console.log('\nCreated: ' + destPath);
console.log('\nNext steps:');
console.log('  cd ' + destPath);
console.log('  npm install');
console.log('  Set DEEPSEEK_API_KEY in .env');
console.log('  node server.js        # test locally');
console.log('  npx wrangler pages deploy . --project-name ' + toolSlug);
