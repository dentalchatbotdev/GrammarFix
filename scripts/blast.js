import { exec } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const STATE_FILE = '.blast-progress.json';

const SITE = 'https://grammarfix.pages.dev';
const TOOL_NAME = 'GrammarFix';
const DESC = 'Free AI grammar checker. No signup, no tracking, no storage.';
const TAGS = 'ai grammar checker, grammar fix, free grammar checker, ai writing tool, text correction';

const directories = [
  { n: 'AlternativeTo', u: 'https://alternativeto.net/software/grammarfix/about/' },
  { n: "There's An AI For That", u: 'https://theresanaiforthat.com/submit/' },
  { n: 'Futurepedia', u: 'https://www.futurepedia.io/submit-tool' },
  { n: 'AI Tools Explorer', u: 'https://www.aitoolsexplorer.com/submit-tool' },
  { n: 'SaaSHub', u: 'https://www.saashub.com/submit' },
  { n: 'CursorList', u: 'https://cursorlist.com/submit' },
  { n: 'ToolScout', u: 'https://toolscout.ai/submit' },
  { n: 'AI Tool Hunt', u: 'https://aitoolhunt.com/submit-tool' },
  { n: 'Insidr.ai', u: 'https://insidr.ai/submit-tool' },
  { n: 'TopAI.tools', u: 'https://topai.tools/submit' },
  { n: 'AI Scout', u: 'https://aiscout.net/submit-tool/' },
  { n: 'Dang AI', u: 'https://www.dang.ai/tools/submit' },
  { n: 'What AI Can Do Today', u: 'https://www.whataicandotoday.com/submit-tool/' },
  { n: 'AI Library', u: 'https://library.phygital.ai/submit-a-tool/' },
  { n: 'GoAI', u: 'https://goai.info/submit/' },
  { n: 'AI Menu', u: 'https://aimenu.ai/submit' },
  { n: 'Toolpilot', u: 'https://toolpilot.ai/submit' },
  { n: 'AI Tools Guru', u: 'https://aitoolsguru.com/submit-tool/' },
  { n: 'Easy With AI', u: 'https://easywithai.com/submit-a-tool/' },
  { n: 'AI Territory', u: 'https://aiterritory.com/submit/' },
  { n: 'AI Toolkits', u: 'https://aitoolkits.com/submit' },
  { n: 'GetinAI', u: 'https://getinai.com/submit-tool/' },
  { n: 'Supertools', u: 'https://supertools.therundown.ai/submit' },
  { n: 'TopTools', u: 'https://toptools.ai/submit/' },
  { n: 'AI Toolbox', u: 'https://aitoolbox.ai/submit' },
  { n: "Zapier's AI Tools", u: 'https://zapier.com/apps/ai-tools/submit' },
  { n: 'AI Finder', u: 'https://ai-finder.net/submit' },
  { n: 'ToolBaz', u: 'https://toolbaz.com/submit' },
  { n: 'SaaS AI Tools', u: 'https://www.saasaitools.com/submit-tool/' },
  { n: 'AI Tools Club', u: 'https://aitoolsclub.com/submit' },
  { n: 'All Things AI', u: 'https://allthingsai.com/submit-tool/' },
  { n: 'AI Tool Net', u: 'https://aitoolnet.com/submit-tool/' },
  { n: 'Crazy AI Tools', u: 'https://www.crazyaitools.com/submit-tool/' },
  { n: 'AI Tools Update', u: 'https://aitoolsupdate.com/submit' },
  { n: 'AI Collection', u: 'https://aicollection.org/submit' },
  { n: 'AiTutorial', u: 'https://aitutorial.ai/submit-tool/' },
  { n: 'AI Rising', u: 'https://airising.media/submit-startup/' },
  { n: 'ToolList', u: 'https://toollist.ai/submit' },
  { n: 'AI Encyclopedia', u: 'https://aiencyclopedia.com/submit-tool/' },
  { n: 'GPTE.ai', u: 'https://gpte.ai/submit' },
  { n: 'AI Tool Wizard', u: 'https://aitoolwizard.com/submit/' },
  { n: 'Best AI Tools', u: 'https://bestai.tools/submit' },
  { n: 'Startup AI Tools', u: 'https://startupaitools.com/submit-tool/' },
  { n: 'AI Tools List', u: 'https://aitoolslist.com/submit' },
  { n: 'Resources AI', u: 'https://resources.ai/submit-tool/' },
  { n: 'AI Toolkit', u: 'https://www.aitoolkit.org/submit' },
  { n: 'Toolify', u: 'https://www.toolify.ai/submit' },
  { n: 'SupaTool', u: 'https://supatool.ai/submit' },
  { n: 'AI Tool Directory', u: 'https://aitooldirectory.com/submit/' },
  { n: 'Found AI', u: 'https://found.ai/submit-tool' },
];

function load() {
  if (!existsSync(STATE_FILE)) return { index: 0, results: {} };
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
}

function save(s) { writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

function openBrowser(url) { try { exec('start "" "' + url + '"'); } catch {} }

const cmd = process.argv[2] || 'status';
const state = load();

if (cmd === 'done') {
  state.results[state.index] = 'done';
  state.index++;
  save(state);
}

if (cmd === 'skip' || cmd === 's') {
  state.results[state.index] = 'skip';
  state.index++;
  save(state);
}

if (state.index >= directories.length) {
  const done = Object.values(state.results).filter(r => r === 'done').length;
  const skipped = Object.values(state.results).filter(r => r === 'skip').length;
  console.log('\n=== ALL DONE! ' + done + ' submitted, ' + skipped + ' skipped ===\n');
  process.exit(0);
}

const d = directories[state.index];
console.log('\n[' + (state.index + 1) + '/' + directories.length + '] ' + d.n);
console.log('  ' + d.u);
console.log('  Name: ' + TOOL_NAME + ' | URL: ' + SITE);
console.log('  Description: ' + DESC);
console.log('  Tags: ' + TAGS);
openBrowser(d.u);
console.log('\nRun:  node scripts/blast.js done   (after submitting)');
console.log('      node scripts/blast.js skip   (to skip)');
console.log('      node scripts/blast.js        (show current)\n');
