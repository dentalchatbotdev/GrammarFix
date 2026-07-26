(function () {
    var apiUrl = 'https://grammarfix.pages.dev/api/grammar';
    var brandUrl = 'https://grammarfix.pages.dev';
    var brandName = 'GrammarFix';

    var id = 'gf-' + Math.random().toString(36).slice(2, 9);

    var container = document.createElement('div');
    container.id = id;
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;font-family:system-ui,-apple-system,sans-serif;';

    var btn = document.createElement('button');
    btn.textContent = 'Check Grammar';
    btn.style.cssText = 'background:#0056b3;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.25);';
    btn.setAttribute('aria-label', 'Open GrammarFix grammar checker');

    var panel = document.createElement('div');
    panel.style.cssText = 'display:none;position:fixed;bottom:80px;right:20px;width:360px;max-width:calc(100vw - 40px);background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.2);overflow:hidden;color:#1a1a2e;';

    panel.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1a1a2e;color:#fff;font-weight:bold;font-size:15px;">' +
        'GrammarFix' +
        '<button id="' + id + '-close" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 4px;" aria-label="Close">&times;</button>' +
        '</div>' +
        '<div style="padding:12px 16px;">' +
        '<textarea id="' + id + '-input" rows="5" style="width:100%;padding:8px;font-size:14px;border:1px solid #ccc;border-radius:6px;resize:vertical;box-sizing:border-box;" placeholder="Paste your text here..."></textarea>' +
        '<div id="' + id + '-status" style="font-size:12px;color:#888;text-align:right;margin-top:4px;">0/2000</div>' +
        '<button id="' + id + '-check" style="width:100%;background:#0056b3;color:#fff;border:none;border-radius:6px;padding:10px;font-size:14px;font-weight:bold;cursor:pointer;margin-top:8px;">Check Grammar</button>' +
        '<div id="' + id + '-result" style="margin-top:10px;padding:10px;border-radius:6px;background:#f5f5f5;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word;display:none;"></div>' +
        '</div>' +
        '<div style="padding:8px 16px 10px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;">' +
        'Powered by <a href="' + brandUrl + '" target="_blank" rel="noopener noreferrer" style="color:#0056b3;text-decoration:none;">' + brandName + '</a>' +
        '</div>';

    container.appendChild(btn);
    container.appendChild(panel);
    document.body.appendChild(container);

    var input = panel.querySelector('#' + id + '-input');
    var status = panel.querySelector('#' + id + '-status');
    var checkBtn = panel.querySelector('#' + id + '-check');
    var resultDiv = panel.querySelector('#' + id + '-result');
    var closeBtn = panel.querySelector('#' + id + '-close');

    btn.addEventListener('click', function () {
        panel.style.display = 'block';
        btn.style.display = 'none';
        input.focus();
    });

    closeBtn.addEventListener('click', function () {
        panel.style.display = 'none';
        btn.style.display = 'block';
    });

    input.addEventListener('input', function () {
        var len = input.value.length;
        status.textContent = len + '/2000';
        status.style.color = len > 2000 ? '#d33' : '#888';
    });

    checkBtn.addEventListener('click', function () {
        var text = input.value.trim();
        if (!text) {
            resultDiv.textContent = 'Please enter some text.';
            resultDiv.style.display = 'block';
            return;
        }
        if (text.length > 2000) {
            resultDiv.textContent = 'Text must be under 2000 characters.';
            resultDiv.style.display = 'block';
            return;
        }

        resultDiv.textContent = 'Checking...';
        resultDiv.style.display = 'block';
        checkBtn.disabled = true;

        var xhr = new XMLHttpRequest();
        xhr.open('POST', apiUrl);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function () {
            checkBtn.disabled = false;
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    resultDiv.textContent = data.corrected || text;
                } catch (e) {
                    resultDiv.textContent = 'Error processing response.';
                }
            } else {
                try {
                    var err = JSON.parse(xhr.responseText);
                    resultDiv.textContent = err.error || 'Error: ' + xhr.status;
                } catch (e) {
                    resultDiv.textContent = 'Error: ' + xhr.status;
                }
            }
        };
        xhr.onerror = function () {
            checkBtn.disabled = false;
            resultDiv.textContent = 'Could not reach the server.';
        };
        xhr.send(JSON.stringify({ text: text }));
    });
})();
