import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG_PATH = join(__dirname, '..', '.env.promote');
const SITE_URL = 'https://grammarfix.pages.dev';

const post = `Free AI grammar checker. No signup, no tracking, no storage.
${SITE_URL}
Powered by DeepSeek.`;

function loadConfig() {
    if (!existsSync(CONFIG_PATH)) return {};
    const lines = readFileSync(CONFIG_PATH, 'utf-8').split('\n').filter(Boolean);
    const config = {};
    for (const line of lines) {
        const [key, ...rest] = line.split('=');
        config[key.trim()] = rest.join('=').trim();
    }
    return config;
}

async function postBluesky(config) {
    if (!config.BLUESKY_USER || !config.BLUESKY_PASS) {
        console.log('  SKIP: BLUESKY_USER or BLUESKY_PASS not set');
        return false;
    }
    try {
        const session = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: config.BLUESKY_USER, password: config.BLUESKY_PASS }),
        }).then(r => r.json());

        const record = {
            repo: session.did,
            collection: 'app.bsky.feed.post',
            record: {
                text: post,
                createdAt: new Date().toISOString(),
            }
        };

        await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.accessJwt,
            },
            body: JSON.stringify(record),
        });
        console.log('  POSTED to Bluesky');
        return true;
    } catch (e) {
        console.log('  FAIL Bluesky:', e.message);
        return false;
    }
}

async function postMastodon(config) {
    if (!config.MASTODON_TOKEN || !config.MASTODON_INSTANCE) {
        console.log('  SKIP: MASTODON_TOKEN or MASTODON_INSTANCE not set');
        return false;
    }
    try {
        const url = config.MASTODON_INSTANCE.replace(/\/$/, '') + '/api/v1/statuses';
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + config.MASTODON_TOKEN,
            },
            body: JSON.stringify({ status: post }),
        });
        console.log('  POSTED to Mastodon');
        return true;
    } catch (e) {
        console.log('  FAIL Mastodon:', e.message);
        return false;
    }
}

async function pingGoogle() {
    try {
        await fetch('https://www.google.com/ping?sitemap=' + SITE_URL + '/sitemap.xml');
        console.log('  PINGED Google');
    } catch {
        console.log('  FAIL Google ping');
    }
}

async function healthCheck() {
    try {
        const res = await fetch(SITE_URL + '/');
        console.log('  SITE: ' + res.status);
        return res.status === 200;
    } catch {
        console.log('  SITE: DOWN');
        return false;
    }
}

async function main() {
    console.log('GrammarFix Auto-Promote\n');

    console.log('[Health]');
    await healthCheck();

    console.log('\n[Google]');
    await pingGoogle();

    console.log('\n[Social]');
    const config = loadConfig();
    await postBluesky(config);
    await postMastodon(config);

    if (!config.BLUESKY_USER && !config.MASTODON_TOKEN) {
        console.log('\nNo social accounts configured.');
        console.log('To add: create .env.promote with:');
        console.log('  BLUESKY_USER=your@email.com');
        console.log('  BLUESKY_PASS=your-app-password');
        console.log('  MASTODON_INSTANCE=https://mastodon.social');
        console.log('  MASTODON_TOKEN=your-token');
    }

    console.log('\nDone.');
}

main().catch(console.error);
