if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
    const checkBtn = document.getElementById('check-btn');
    const input = document.getElementById('input-text');
    const resultDiv = document.getElementById('result');
    const charCount = document.getElementById('char-count');
    const loadingSpinner = document.getElementById('loading-spinner');

    if (!checkBtn || !input || !resultDiv) {
        console.error('GrammarFix: Required DOM elements not found');
        return;
    }

    // Character counter
    if (charCount) {
        input.addEventListener('input', () => {
            const len = input.value.length;
            charCount.textContent = `${len}/2000`;
            charCount.style.color = len > 2000 ? '#d33' : '';
        });
    }

    let lastCorrected = '';

    async function checkGrammar(text) {
        resultDiv.innerHTML = '';
        resultDiv.style.display = 'block';
        checkBtn.disabled = true;
        if (loadingSpinner) loadingSpinner.style.display = 'inline-block';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch('/api/grammar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(err.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            lastCorrected = data.corrected || text;
            showResult(lastCorrected);
        } catch (error) {
            console.error('GrammarFix check error:', error);
            if (error.name === 'AbortError') {
                resultDiv.innerHTML = 'Error: Request timed out. Please try again.';
            } else if (error.message === 'Failed to fetch') {
                resultDiv.innerHTML = 'Error: Could not reach the server. Check your connection.';
            } else {
                resultDiv.innerHTML = 'Error: ' + error.message;
            }
        } finally {
            resultDiv.removeAttribute('aria-busy');
            checkBtn.disabled = false;
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    }

    function showResult(text) {
        resultDiv.innerHTML =
            '<div style="white-space:pre-wrap;word-break:break-word;margin-bottom:0.75rem;">' + text.replace(/\n/g, '<br>') + '</div>' +
            '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
            '<button id="copy-grammar-btn" class="btn-secondary">Copy</button>' +
            '<a id="share-grammar-btn" href="#" target="_blank" rel="noopener noreferrer" class="btn-secondary">Share on X</a>' +
            '</div>';

        document.getElementById('copy-grammar-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(text + '\n\nCorrected via GrammarFix (grammarfix.pages.dev)');
        });

        document.getElementById('share-grammar-btn').href =
            'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) +
            '&url=' + encodeURIComponent('https://grammarfix.pages.dev') +
            '&hashtags=writing,grammar';
    }

    checkBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if (!text) {
            resultDiv.innerHTML = 'Please enter some text to check.';
            resultDiv.style.display = 'block';
            return;
        }
        if (text.length > 2000) {
            resultDiv.innerHTML = 'Free limit is 2000 characters. GrammarFix Pro ($5/mo) removes this limit. <a href="https://buy.stripe.com/7sY9AUaSs6C222Teula3u00" target="_blank" rel="noopener noreferrer" style="color:var(--accent);"> Upgrade to Pro</a>.';
            resultDiv.style.display = 'block';
            return;
        }
        checkGrammar(text);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            checkBtn.click();
        }
    });

    // Email capture
    const emailForm = document.getElementById('email-form');
    const emailInput = document.getElementById('email-input');
    const emailStatus = document.getElementById('email-status');

    if (emailForm && emailInput && emailStatus) {
        const WEB3FORMS_KEY = 'eaa64dab-81bc-4e81-85cb-5c3525d5eb52'; // Replace with real key

        emailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (!email) return;

            emailStatus.style.display = 'block';
            emailStatus.textContent = 'Joining...';
            emailStatus.style.color = '';

            if (WEB3FORMS_KEY !== 'YOUR_WEB3FORMS_KEY') {
                fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_key: WEB3FORMS_KEY,
                        email: email,
                        source: 'GrammarFix Pro waitlist'
                    })
                }).catch(() => {});
            }

            // Also save locally
            try {
                const saved = JSON.parse(localStorage.getItem('gf_emails') || '[]');
                saved.push({ email, date: new Date().toISOString() });
                localStorage.setItem('gf_emails', JSON.stringify(saved));
            } catch {}

            emailStatus.textContent = 'You\'re on the list!';
            emailStatus.style.color = 'var(--success, #2e7d32)';
            emailInput.value = '';
        });
    }
});
