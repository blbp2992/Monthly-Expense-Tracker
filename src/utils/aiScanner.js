// AI Receipt Scanner Utility

export const resizeImageToBase64 = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

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

export const parseReceiptWithGemini = async (base64Image, apiKey, categories) => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  // Strip base64 prefix
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

  const categoryNames = categories.map((c) => `${c.id} (${c.name})`).join(', ');

  const prompt = `Analyze this receipt image carefully. Extract all itemized lines, amounts, merchant name, date, tax, payment method, and map each item to the closest matching category ID from this list: [${categoryNames}].
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
              mimeType: 'image/jpeg',
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

  // Retry on transient errors (rate limits / model overload) before giving up
  const RETRYABLE_STATUSES = new Set([429, 500, 503]);
  const MAX_ATTEMPTS = 3;
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
    } catch (networkErr) {
      lastError = networkErr;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }
      throw lastError;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      lastError = new Error(errorData?.error?.message || `API error: ${response.statusText}`);
      if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }
      throw lastError;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('No content returned from AI');

    try {
      return JSON.parse(rawText);
    } catch {
      // Occasionally the model wraps JSON in markdown fences despite instructions
      const stripped = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '');
      return JSON.parse(stripped);
    }
  }

  throw lastError;
};
