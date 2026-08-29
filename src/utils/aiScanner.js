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

// Preset demo receipt breakdowns for quick-testing
export const DEMO_RECEIPTS = [
  {
    id: 'demo_groceries',
    title: 'Supermarket Grocery Run',
    merchant: 'Whole Foods Market',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'credit_card',
    tax: 4.85,
    total: 62.35,
    items: [
      { name: 'Organic Almond Milk 1L', qty: 2, price: 3.99, categoryId: 'cat_groceries' },
      { name: 'Fresh Hass Avocados (Bag)', qty: 1, price: 5.49, categoryId: 'cat_groceries' },
      { name: 'Wild Sockeye Salmon Fillet', qty: 1, price: 18.90, categoryId: 'cat_groceries' },
      { name: 'Artisan Sourdough Bread', qty: 1, price: 5.25, categoryId: 'cat_groceries' },
      { name: 'Greek Yogurt 32oz', qty: 2, price: 6.20, categoryId: 'cat_groceries' },
      { name: 'Organic Spinach 5oz', qty: 2, price: 3.49, categoryId: 'cat_groceries' },
      { name: 'Dark Chocolate Sea Salt', qty: 1, price: 4.95, categoryId: 'cat_food' }
    ]
  },
  {
    id: 'demo_restaurant',
    title: 'Italian Bistro Dinner',
    merchant: 'Trattoria Bella Italia',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'credit_card',
    tax: 9.20,
    total: 88.70,
    items: [
      { name: 'Handmade Truffle Tagliatelle', qty: 1, price: 26.00, categoryId: 'cat_food' },
      { name: 'Wood-fired Margherita Pizza', qty: 1, price: 21.50, categoryId: 'cat_food' },
      { name: 'Classic Tiramisu Dessert', qty: 1, price: 11.00, categoryId: 'cat_food' },
      { name: 'Sparkling San Pellegrino (750ml)', qty: 2, price: 6.50, categoryId: 'cat_food' },
      { name: 'Espresso Romano', qty: 2, price: 4.00, categoryId: 'cat_food' }
    ]
  },
  {
    id: 'demo_tech',
    title: 'Electronics & Accessories',
    merchant: 'Apex Tech Electronics',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'digital_wallet',
    tax: 12.40,
    total: 147.38,
    items: [
      { name: 'USB-C 100W Braided Cable (2m)', qty: 2, price: 14.99, categoryId: 'cat_shopping' },
      { name: '65W GaN Fast Charger', qty: 1, price: 39.99, categoryId: 'cat_shopping' },
      { name: 'Ergonomic Memory Foam Mousepad', qty: 1, price: 24.50, categoryId: 'cat_shopping' },
      { name: 'Wireless Bluetooth Earbuds Case', qty: 1, price: 40.51, categoryId: 'cat_shopping' }
    ]
  }
];

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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || `API error: ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('No content returned from AI');

  return JSON.parse(rawText);
};

// Built-in intelligent simulated parser (fallback if no API key is provided)
export const parseReceiptSmartFallback = async (base64Image, fileName = 'Receipt', categories) => {
  // Simulate AI latency for realistic scanning effect
  await new Promise((res) => setTimeout(res, 1400));

  const sample = DEMO_RECEIPTS[Math.floor(Math.random() * DEMO_RECEIPTS.length)];
  const today = new Date().toISOString().slice(0, 10);

  // Return a realistic itemized structure
  return {
    merchant: sample.merchant,
    date: today,
    paymentMethod: sample.paymentMethod,
    tax: sample.tax,
    total: sample.total,
    items: sample.items.map((item) => {
      // Validate categoryId
      const exists = categories.some((c) => c.id === item.categoryId);
      return {
        ...item,
        categoryId: exists ? item.categoryId : 'cat_groceries'
      };
    })
  };
};
