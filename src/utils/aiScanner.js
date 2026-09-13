// AI Receipt Scanner Utility

// Scales the image so its longest side is at most maxDimension. Limiting by the
// longest side (not width) keeps long, narrow receipts legible.
export const resizeImageToBase64 = (file, maxDimension = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const elem = document.createElement('canvas');
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(elem.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const SCAN_TIMEOUT_MS = 120000;

const toLocalISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const RECENT_DAYS = 90;

// Flags receipt dates that are likely misread (missing, in the future, or old).
// If swapping day and month gives a plausible recent date, suggest it.
export const checkReceiptDate = (dateStr) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  if (!match) return { warning: 'No valid date was detected — please set it.' };

  const [, y, m, d] = match.map(Number);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isPlausible = (date) =>
    date <= todayStart && (todayStart - date) / 86400000 <= RECENT_DAYS;

  const parsed = new Date(y, m - 1, d);
  if (isPlausible(parsed)) return null;

  const candidates = [];
  if (d <= 12) candidates.push(new Date(y, d - 1, m)); // day/month swapped
  if (y !== now.getFullYear()) {
    candidates.push(new Date(now.getFullYear(), m - 1, d)); // wrong year
    if (d <= 12) candidates.push(new Date(now.getFullYear(), d - 1, m));
  }
  const suggestion = candidates.find(isPlausible);

  return {
    warning:
      parsed > todayStart
        ? 'This date is in the future — the AI may have misread it.'
        : `This date is more than ${RECENT_DAYS} days ago — the AI may have misread it.`,
    suggestion: suggestion ? toLocalISODate(suggestion) : null
  };
};

export const parseReceiptWithGemini = async (
  base64Data,
  apiKey,
  categories,
  { signal, onStatus, mimeType = 'image/jpeg' } = {}
) => {
  // Strip base64 prefix
  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');

  const categoryNames = categories
    .filter((c) => c.type === 'expense')
    .map((c) => `${c.id} (${c.name})`)
    .join(', ');

  const today = toLocalISODate(new Date());

  const prompt = `Analyze this receipt (a photo or PDF) carefully. Extract all itemized lines, amounts, merchant name, date, tax, payment method, and map each item to the closest matching category ID from this list: [${categoryNames}].
Category rules: judge each item individually by what the product actually is. First expand abbreviated supermarket names (e.g. "CKN" = chicken, "S/A" = South African, "FZN" = frozen). Prefer the most specific matching category over broad ones like Groceries, Food & Dining or Miscellaneous. Only use IDs from the list above.
Item rules: "price" is the unit price and "qty" the quantity, so price x qty equals the line amount printed on the receipt.
Date rules: today is ${today}. Receipts are usually from Singapore, where dates are printed day-first (DD/MM/YY or DD/MM/YYYY), so "02/09/26" means 2 September 2026. A two-digit year "26" means 2026. Read the year digits exactly as printed; receipts are almost always recent and never in the future.
Return ONLY a valid JSON object without markdown formatting, code blocks, or preamble. Use this exact structure:
{
  "merchant": "Store Name",
  "date": "YYYY-MM-DD",
  "paymentMethod": "credit_card" | "debit_card" | "cash" | "bank_transfer" | "digital_wallet" | "other",
  "tax": 0.00,
  "total": 0.00,
  "items": [
    {
      "name": "Item Description",
      "qty": 1,
      "price": 0.00,
      "categoryId": "category_id_here"
    }
  ]
}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  // Try the main model first; if it stays overloaded, fall back to the lighter
  // model, which runs on separate capacity.
  const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  const RETRYABLE_STATUSES = new Set([429, 500, 503]);
  const ATTEMPTS_PER_MODEL = 3;
  const BACKOFF_MS = [2000, 5000];

  const body = JSON.stringify(requestBody);
  const startedAt = performance.now();
  const elapsedSec = () => ((performance.now() - startedAt) / 1000).toFixed(1);
  console.info(`[ReceiptScan] Sending ${mimeType} (${Math.round(cleanBase64.length / 1024)} KB base64)`);

  const wait = (ms) =>
    new Promise((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new Error('Scan cancelled'));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      signal?.addEventListener('abort', onAbort, { once: true });
    });

  let lastError;

  for (const [modelIndex, model] of MODELS.entries()) {
    if (modelIndex > 0) onStatus?.(`Main model is busy — trying ${model}...`);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
      if (signal?.aborted) throw new Error('Scan cancelled');

      // Abort when the user cancels or the attempt exceeds the timeout
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, SCAN_TIMEOUT_MS);
      const onCancel = () => controller.abort();
      signal?.addEventListener('abort', onCancel);

      let response;
      let data;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal
        });
        data = response.ok ? await response.json() : await response.json().catch(() => null);
      } catch (fetchErr) {
        if (signal?.aborted) throw new Error('Scan cancelled');
        if (timedOut) {
          throw new Error(`Gemini did not respond within ${SCAN_TIMEOUT_MS / 1000} seconds`);
        }
        lastError = fetchErr;
        console.warn(`[ReceiptScan] ${model} attempt ${attempt} network error after ${elapsedSec()}s:`, fetchErr);
        if (attempt < ATTEMPTS_PER_MODEL) await wait(BACKOFF_MS[attempt - 1]);
        continue;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onCancel);
      }

      if (!response.ok) {
        lastError = new Error(data?.error?.message || `API error ${response.status}: ${response.statusText}`);
        console.warn(`[ReceiptScan] ${model} attempt ${attempt} failed after ${elapsedSec()}s:`, response.status, data);
        // Model unavailable for this key: move on to the next model
        if (response.status === 404) break;
        if (!RETRYABLE_STATUSES.has(response.status)) throw lastError;
        if (attempt < ATTEMPTS_PER_MODEL) {
          onStatus?.(`Gemini is busy — retrying (attempt ${attempt + 1} of ${ATTEMPTS_PER_MODEL})...`);
          await wait(BACKOFF_MS[attempt - 1]);
        }
        continue;
      }

      const candidate = data?.candidates?.[0];
      console.info(`[ReceiptScan] Response in ${elapsedSec()}s`, {
        requestedModel: model,
        model: data?.modelVersion,
        finishReason: candidate?.finishReason,
        usage: data?.usageMetadata
      });

      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`AI stopped early (${candidate.finishReason})`);
      }

      // Skip any "thought" parts and join the actual answer text
      const rawText = (candidate?.content?.parts || [])
        .filter((p) => p.text && !p.thought)
        .map((p) => p.text)
        .join('');
      if (!rawText) throw new Error('No content returned from AI');

      try {
        return JSON.parse(rawText);
      } catch {
        // Occasionally the model wraps JSON in markdown fences despite instructions
        const stripped = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '');
        return JSON.parse(stripped);
      }
    }
  }

  throw lastError;
};
