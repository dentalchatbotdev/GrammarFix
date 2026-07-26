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
            if (len > 2000) {
                charCount.style.color = '#d33';
            } else {
                charCount.style.color = '';
            }
        });
    }

    async function checkGrammar(text) {
        resultDiv.textContent = '';
        resultDiv.setAttribute('aria-busy', 'true');
        checkBtn.disabled = true;
        if (loadingSpinner) loadingSpinner.style.display = 'inline-block';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
            resultDiv.textContent = data.corrected || text;
        } catch (error) {
            console.error('GrammarFix check error:', error);
            if (error.name === 'AbortError') {
                resultDiv.textContent = 'Error: Request timed out. Please try again.';
            } else if (error.message === 'Failed to fetch') {
                resultDiv.textContent = 'Error: Could not reach the server. Check your connection.';
            } else {
                resultDiv.textContent = `Error: ${error.message}`;
            }
        } finally {
            resultDiv.removeAttribute('aria-busy');
            checkBtn.disabled = false;
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    }

    checkBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if (!text) {
            resultDiv.textContent = 'Please enter some text to check.';
            resultDiv.style.display = 'block';
            return;
        }
        if (text.length > 2000) {
            resultDiv.textContent = 'Free limit is 2000 characters. GrammarFix Pro (coming soon) removes this limit and adds style suggestions.';
            resultDiv.style.display = 'block';
            return;
        }
        checkGrammar(text);
    });

    // Allow Ctrl+Enter to submit
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            checkBtn.click();
        }
    });
});