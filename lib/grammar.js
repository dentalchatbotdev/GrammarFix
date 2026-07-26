export const MAX_CHARS = 2000;

export const SYSTEM_PROMPT =
  "You are GrammarFix, a grammar checker. Correct the user's text for grammar, spelling, punctuation, and clarity. " +
  "Return ONLY the corrected text \u2014 no explanations, no greetings, no quotes, no formatting. " +
  "If the text is already correct, return it exactly as given.";

export function validateText(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: "Missing 'text' field.", status: 400 };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Text cannot be empty.', status: 400 };
  }
  if (trimmed.length > MAX_CHARS) {
    return { valid: false, error: `Text exceeds ${MAX_CHARS} character limit.`, status: 400 };
  }
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return { valid: false, error: 'HTML tags are not allowed.', status: 400 };
  }

  return { valid: true, trimmed };
}

export function cleanResponse(corrected) {
  if ((corrected.startsWith('"') && corrected.endsWith('"')) ||
      (corrected.startsWith("'") && corrected.endsWith("'"))) {
    return corrected.slice(1, -1);
  }
  return corrected;
}

export async function callDeepSeek(text, apiKey) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DeepSeek API error:', response.status, errorText);
    const err = new Error(`API error: ${response.status}`);
    err.status = 502;
    err.detail = errorText;
    throw err;
  }

  const data = await response.json();
  const corrected = data.choices?.[0]?.message?.content?.trim();

  if (!corrected) {
    const err = new Error('Empty response from AI.');
    err.status = 502;
    throw err;
  }

  return cleanResponse(corrected);
}
