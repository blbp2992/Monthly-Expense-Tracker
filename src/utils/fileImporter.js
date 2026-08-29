import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Normalizes string for fuzzy matching
 */
const normalizeText = (text) => {
  if (!text) return '';
  return String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Keyword-based category mapper fallback
 */
export const guessCategoryFromText = (text, categories = []) => {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Try direct category name match first
  for (const cat of categories) {
    if (lower.includes(cat.name.toLowerCase()) || cat.name.toLowerCase().includes(lower)) {
      return cat.id;
    }
  }

  // Common keywords matching specific categories in our app
  const rules = [
    { catId: 'cat_protein', keywords: ['chicken', 'pork', 'beef', 'meat', 'ribs', 'sausage', 'ham', 'collar', 'fillet', 'steak', 'bacon'] },
    { catId: 'cat_dairy', keywords: ['milk', 'cheese', 'butter', 'yoghurt', 'yogurt', 'dairy', 'latte', 'cream', 'soya milk'] },
    { catId: 'cat_carbohydrates', keywords: ['rice', 'bread', 'noodle', 'noodles', 'spaghetti', 'pasta', 'macaroni', 'bao', 'potato', 'vermicelli', 'prata', 'flour'] },
    { catId: 'cat_fruits', keywords: ['apple', 'banana', 'kiwi', 'durian', 'watermelon', 'blueberry', 'grapes', 'pear', 'cherry', 'orange', 'longan', 'dragon fruit', 'berry', 'fruits'] },
    { catId: 'cat_vegetable', keywords: ['spinach', 'cabbage', 'mushroom', 'onion', 'carrot', 'cucumber', 'lettuce', 'asparagus', 'broccoli', 'brocolli', 'bean', 'peas', 'sprout', 'chilli', 'corn', 'vege', 'vegetable', 'tomato', 'coriander', 'chives', 'leek'] },
    { catId: 'cat_pantry', keywords: ['sauce', 'oil', 'spice', 'salt', 'sugar', 'vinegar', 'curry', 'broth', 'tofu', 'tau kwa', 'garlic', 'ginger', 'pancake', 'pastry', 'baking', 'hai di lao'] },
    { catId: 'cat_seafoods', keywords: ['fish', 'salmon', 'tuna fresh', 'prawn', 'shrimp', 'crab', 'seafood', 'squid', 'clam'] },
    { catId: 'cat_can_food', keywords: ['luncheon', 'canned', 'can food', 'tuna flakes', 'canned tomato', 'sardines'] },
    { catId: 'cat_eggs', keywords: ['egg', 'eggs'] },
    { catId: 'cat_snacks', keywords: ['snack', 'chips', 'chocolate', 'cookie', 'calbee', 'cadbury', 'wafer', 'candy', 'biscuit'] },
    { catId: 'cat_detergents', keywords: ['detergent', 'soap', 'magic clean', 'tissue', 'shampoo', 'cleaner', 'bleach', 'sponge', 'wash'] },
    { catId: 'cat_pets', keywords: ['pet', 'dog', 'cat food', 'pets', 'kibble'] },
    { catId: 'cat_salary', keywords: ['salary', 'paycheck', 'wage', 'payroll', 'stipend', 'bonus', 'direct deposit'] },
    { catId: 'cat_subscriptions', keywords: ['netflix', 'spotify', 'subscription', 'cloud', 'google one', 'apple music', 'prime', 'youtube', 'patreon'] },
    { catId: 'cat_transport', keywords: ['grab', 'mrt', 'bus', 'taxi', 'petrol', 'parking', 'ezlink', 'transit', 'uber', 'fuel'] },
    { catId: 'cat_utilities', keywords: ['electric', 'water', 'utility', 'utilities', 'wifi', 'broadband', 'singtel', 'starhub', 'power', 'telecom'] },
    { catId: 'cat_housing', keywords: ['rent', 'mortgage', 'housing', 'landlord', 'condo', 'maintenance fee'] },
    { catId: 'cat_health', keywords: ['clinic', 'doctor', 'pharmacy', 'medicine', 'hospital', 'dentist', 'health', 'guardian', 'watsons'] },
    { catId: 'cat_entertainment', keywords: ['cinema', 'movie', 'game', 'steam', 'concert', 'museum', 'bowling', 'karaoke'] },
    { catId: 'cat_food', keywords: ['restaurant', 'cafe', 'dinner', 'lunch', 'breakfast', 'starbucks', 'mcdonald', 'kfc', 'foodpanda', 'deliveroo', 'eatery'] },
    { catId: 'cat_groceries', keywords: ['fairprice', 'ntuc', 'cold storage', 'shengsiong', 'giant', 'supermarket', 'mart', 'grocery', 'groceries'] }
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      const exists = categories.find((c) => c.id === rule.catId);
      if (exists) return rule.catId;
    }
  }

  return null;
};

/**
 * Robust date parser converting diverse string formats or Excel dates to YYYY-MM-DD
 */
export const parseToStandardDate = (val) => {
  if (!val) return '';

  // If already a JS Date object (e.g. from SheetJS cellDates: true)
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If Excel serial number (e.g. 45123)
  if (typeof val === 'number') {
    // Excel base date: Dec 30 1899
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    if (!isNaN(dateInfo.getTime())) {
      const y = dateInfo.getUTCFullYear();
      const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateInfo.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();
  if (!str) return '';

  // Case: ISO or standard YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(ymdMatch[2]).padStart(2, '0');
    const d = String(ymdMatch[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Case: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    let d = String(dmyMatch[1]).padStart(2, '0');
    let m = String(dmyMatch[2]).padStart(2, '0');
    let y = dmyMatch[3];
    if (y.length === 2) {
      y = Number(y) < 50 ? `20${y}` : `19${y}`;
    }
    // Check if month > 12 (means user passed MM/DD/YYYY)
    if (Number(m) > 12 && Number(d) <= 12) {
      const temp = m;
      m = d;
      d = temp;
    }
    return `${y}-${m}-${d}`;
  }

  // Try Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
};

/**
 * Parses amount numbers from string/number with currency symbols
 */
export const parseCleanAmount = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }

  let str = String(val).trim();

  // Handle accounting format (123.45) as negative
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1);
  } else if (str.startsWith('-') || str.includes('-')) {
    isNegative = true;
  }

  // Strip currency symbols ($ S$ € £ ¥ RM ₹ SGD USD etc) and whitespace/commas
  str = str.replace(/[^0-9.]/g, '');
  const num = parseFloat(str);
  if (isNaN(num)) return null;

  return isNegative ? -Math.abs(num) : Math.abs(num);
};

/**
 * Auto-detect column mappings given header list
 */
export const autoDetectColumns = (headers = []) => {
  const detected = {
    date: '',
    description: '',
    amountMode: 'single', // 'single' or 'split'
    amount: '',
    debit: '',
    credit: '',
    category: '',
    paymentMethod: '',
    type: '',
    notes: ''
  };

  headers.forEach((hdr) => {
    const norm = normalizeText(hdr);

    // Date detection
    if (!detected.date) {
      if (
        norm === 'date' ||
        norm === 'txndate' ||
        norm === 'transactiondate' ||
        norm === 'postingdate' ||
        norm === 'transdate' ||
        norm === 'valuedate' ||
        norm === 'time' ||
        norm === 'day'
      ) {
        detected.date = hdr;
      }
    }

    // Description / Payee detection
    if (!detected.description) {
      if (
        norm === 'description' ||
        norm === 'desc' ||
        norm === 'details' ||
        norm === 'narrative' ||
        norm === 'particulars' ||
        norm === 'payee' ||
        norm === 'merchant' ||
        norm === 'item' ||
        norm === 'itemname' ||
        norm === 'transaction' ||
        norm === 'title' ||
        norm === 'name'
      ) {
        detected.description = hdr;
      }
    }

    // Debit column
    if (!detected.debit) {
      if (
        norm === 'debit' ||
        norm === 'debitamount' ||
        norm === 'withdrawal' ||
        norm === 'moneyout' ||
        norm === 'spent' ||
        norm === 'expenseamount'
      ) {
        detected.debit = hdr;
      }
    }

    // Credit column
    if (!detected.credit) {
      if (
        norm === 'credit' ||
        norm === 'creditamount' ||
        norm === 'deposit' ||
        norm === 'moneyin' ||
        norm === 'received' ||
        norm === 'incomeamount'
      ) {
        detected.credit = hdr;
      }
    }

    // Single Amount detection
    if (!detected.amount) {
      if (
        norm === 'amount' ||
        norm === 'total' ||
        norm === 'sum' ||
        norm === 'netamount' ||
        norm === 'value' ||
        norm === 'price' ||
        norm === 'cost'
      ) {
        detected.amount = hdr;
      }
    }

    // Category detection
    if (!detected.category) {
      if (
        norm === 'category' ||
        norm === 'cat' ||
        norm === 'categoryname' ||
        norm === 'classification' ||
        norm === 'group' ||
        norm === 'tag' ||
        norm === 'expensecategory'
      ) {
        detected.category = hdr;
      }
    }

    // Payment Method detection
    if (!detected.paymentMethod) {
      if (
        norm === 'paymentmethod' ||
        norm === 'paymenttype' ||
        norm === 'method' ||
        norm === 'account' ||
        norm === 'card' ||
        norm === 'paymode' ||
        norm === 'mode'
      ) {
        detected.paymentMethod = hdr;
      }
    }

    // Type detection (Expense / Income)
    if (!detected.type) {
      if (
        norm === 'type' ||
        norm === 'transactiontype' ||
        norm === 'txntype' ||
        norm === 'flow' ||
        norm === 'drcr' ||
        norm === 'incomeexpense'
      ) {
        detected.type = hdr;
      }
    }

    // Notes detection
    if (!detected.notes) {
      if (
        norm === 'notes' ||
        norm === 'note' ||
        norm === 'remarks' ||
        norm === 'comment' ||
        norm === 'comments' ||
        norm === 'reference' ||
        norm === 'ref' ||
        norm === 'memo'
      ) {
        detected.notes = hdr;
      }
    }
  });

  // If both debit and credit columns were found, suggest split mode
  if (detected.debit && detected.credit) {
    detected.amountMode = 'split';
  } else {
    detected.amountMode = 'single';
  }

  return detected;
};

/**
 * Parses raw file content from an uploaded File (CSV or Excel)
 */
export const parseRawFile = async (file) => {
  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
  const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt');

  if (!isExcel && !isCsv) {
    throw new Error('Unsupported file format. Please upload a .csv or .xlsx / .xls file.');
  }

  const arrayBuffer = await file.arrayBuffer();

  if (isExcel) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const sheetNames = workbook.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      throw new Error('Excel workbook contains no sheets.');
    }

    // Parse all sheets
    const sheetsData = {};
    sheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      sheetsData[sheetName] = jsonRows;
    });

    return {
      type: 'excel',
      fileName: file.name,
      fileSize: file.size,
      sheets: sheetNames,
      sheetsData
    };
  } else {
    // CSV parsing using PapaParse for best CSV handling
    const text = new TextDecoder('utf-8').decode(arrayBuffer);
    const parsed = Papa.parse(text, { skipEmptyLines: 'greedy' });

    if (parsed.errors && parsed.errors.length > 0 && (!parsed.data || parsed.data.length === 0)) {
      throw new Error(`CSV parsing error: ${parsed.errors[0].message}`);
    }

    return {
      type: 'csv',
      fileName: file.name,
      fileSize: file.size,
      sheets: ['Sheet 1'],
      sheetsData: {
        'Sheet 1': parsed.data
      }
    };
  }
};

/**
 * Formats a 2D raw grid into headers and structured row objects
 */
export const extractHeaderAndRows = (gridData = []) => {
  if (!gridData || gridData.length === 0) {
    return { headers: [], rows: [] };
  }

  // Find the first row that looks like a header (has multiple non-empty string cells)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(gridData.length, 10); i++) {
    const row = gridData[i];
    const nonEmpties = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmpties.length >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = gridData[headerRowIndex] || [];
  const cleanHeaders = rawHeaders.map((h, i) => {
    const val = String(h || '').trim();
    return val ? val : `Column ${i + 1}`;
  });

  const rowData = [];
  for (let r = headerRowIndex + 1; r < gridData.length; r++) {
    const row = gridData[r];
    if (!row) continue;
    // Check if entire row is empty
    const hasData = row.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasData) continue;

    const rowObj = {};
    cleanHeaders.forEach((hdr, colIdx) => {
      rowObj[hdr] = row[colIdx] !== undefined ? row[colIdx] : '';
    });
    rowData.push(rowObj);
  }

  return {
    headers: cleanHeaders,
    rows: rowData
  };
};

/**
 * Process raw rows with mapping configuration into standardized transaction objects
 */
export const mapRowsToTransactions = ({
  rows = [],
  mapping = {},
  categories = [],
  defaultCategory = '',
  defaultPaymentMethod = 'credit_card',
  signInterpretation = 'negative_is_expense', // 'negative_is_expense', 'positive_is_expense', 'auto'
  existingTransactions = []
}) => {
  const existingSet = new Set(
    existingTransactions.map(
      (t) => `${t.date}_${(Number(t.amount) || 0).toFixed(2)}_${(t.description || '').toLowerCase().trim()}`
    )
  );

  const fallbackExpenseCat =
    defaultCategory || (categories.find((c) => c.type === 'expense')?.id || 'cat_groceries');
  const fallbackIncomeCat =
    categories.find((c) => c.type === 'income')?.id || 'cat_salary';

  const categoryLookupByName = new Map();
  categories.forEach((cat) => {
    categoryLookupByName.set(cat.name.toLowerCase().trim(), cat);
    categoryLookupByName.set(cat.id.toLowerCase().trim(), cat);
  });

  return rows.map((row, index) => {
    // 1. Date
    const rawDate = mapping.date ? row[mapping.date] : '';
    const date = parseToStandardDate(rawDate);

    // 2. Description
    const rawDesc = mapping.description ? String(row[mapping.description] || '').trim() : '';
    const description = rawDesc || `Imported Item #${index + 1}`;

    // 3. Notes
    const notes = mapping.notes ? String(row[mapping.notes] || '').trim() : '';

    // 4. Payment Method
    let paymentMethod = defaultPaymentMethod || 'credit_card';
    if (mapping.paymentMethod && row[mapping.paymentMethod]) {
      const pmStr = String(row[mapping.paymentMethod]).toLowerCase().trim();
      if (pmStr.includes('debit')) paymentMethod = 'debit_card';
      else if (pmStr.includes('credit')) paymentMethod = 'credit_card';
      else if (pmStr.includes('cash')) paymentMethod = 'cash';
      else if (pmStr.includes('transfer') || pmStr.includes('bank') || pmStr.includes('wire')) paymentMethod = 'bank_transfer';
      else if (pmStr.includes('pay') || pmStr.includes('wallet') || pmStr.includes('apple') || pmStr.includes('google')) paymentMethod = 'digital_wallet';
      else paymentMethod = 'other';
    }

    // 5. Amount & Type
    let amount = 0;
    let type = 'expense';

    if (mapping.amountMode === 'split') {
      const debitVal = mapping.debit ? parseCleanAmount(row[mapping.debit]) : null;
      const creditVal = mapping.credit ? parseCleanAmount(row[mapping.credit]) : null;

      if (creditVal !== null && creditVal > 0) {
        amount = creditVal;
        type = 'income';
      } else if (debitVal !== null && debitVal > 0) {
        amount = debitVal;
        type = 'expense';
      } else if (debitVal !== null && debitVal < 0) {
        amount = Math.abs(debitVal);
        type = 'expense';
      } else {
        amount = 0;
        type = 'expense';
      }
    } else {
      // Single Amount Column
      const rawAmt = mapping.amount ? parseCleanAmount(row[mapping.amount]) : 0;
      const parsedAmt = rawAmt !== null ? rawAmt : 0;

      // Check explicit type column first
      let explicitType = null;
      if (mapping.type && row[mapping.type]) {
        const tStr = String(row[mapping.type]).toLowerCase().trim();
        if (tStr.includes('inc') || tStr.includes('credit') || tStr.includes('deposit') || tStr.includes('salary') || tStr === 'cr') {
          explicitType = 'income';
        } else if (tStr.includes('exp') || tStr.includes('debit') || tStr.includes('withdrawal') || tStr.includes('out') || tStr === 'dr') {
          explicitType = 'expense';
        }
      }

      if (explicitType) {
        type = explicitType;
        amount = Math.abs(parsedAmt);
      } else {
        const guessedCat = guessCategoryFromText(description, categories);
        const foundCat = categories.find((c) => c.id === guessedCat);

        if (signInterpretation === 'negative_is_expense') {
          // Bank Statement standard: negative = money out (expense), positive = money in (income)
          if (parsedAmt < 0) {
            type = 'expense';
            amount = Math.abs(parsedAmt);
          } else if (parsedAmt > 0) {
            // If category is explicitly an expense category, prioritize that if amount is positive
            if (foundCat && foundCat.type === 'expense') {
              type = 'expense';
            } else {
              type = 'income';
            }
            amount = parsedAmt;
          } else {
            amount = 0;
            type = 'expense';
          }
        } else if (signInterpretation === 'positive_is_expense') {
          // Standard Expense Tracker export: positive numbers represent expenses, negative = income
          amount = Math.abs(parsedAmt);
          if (parsedAmt < 0) {
            type = 'income';
          } else if (foundCat && foundCat.type === 'income') {
            type = 'income';
          } else {
            type = 'expense';
          }
        } else {
          // Auto
          amount = Math.abs(parsedAmt);
          if (foundCat && foundCat.type === 'income') {
            type = 'income';
          } else {
            type = parsedAmt < 0 ? 'income' : 'expense';
          }
        }
      }
    }

    // 6. Category mapping
    let categoryId = type === 'income' ? fallbackIncomeCat : fallbackExpenseCat;

    if (mapping.category && row[mapping.category]) {
      const catVal = String(row[mapping.category]).toLowerCase().trim();
      const matched = categoryLookupByName.get(catVal);
      if (matched) {
        categoryId = matched.id;
      } else {
        // Try guessing from category string or description
        const guessed = guessCategoryFromText(catVal, categories) || guessCategoryFromText(description, categories);
        if (guessed) categoryId = guessed;
      }
    } else {
      // Auto-guess category from description
      const guessed = guessCategoryFromText(description, categories);
      if (guessed) categoryId = guessed;
    }

    // Validation Status
    const isValid = Boolean(date && amount > 0 && description);
    const key = `${date}_${amount.toFixed(2)}_${description.toLowerCase().trim()}`;
    const isDuplicate = existingSet.has(key);

    return {
      tempId: `import-row-${index}-${Date.now()}`,
      selected: isValid,
      date,
      description,
      amount: parseFloat(amount.toFixed(2)),
      type,
      categoryId,
      paymentMethod,
      notes,
      isValid,
      isDuplicate,
      rawRow: row
    };
  });
};

/**
 * Downloads sample CSV template
 */
export const downloadSampleCSV = () => {
  const sampleHeaders = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Payment Method', 'Notes'];
  const sampleRows = [
    ['2026-07-08', 'Frozen Pork (1kg)', '7.55', 'expense', 'Protein', 'Credit Card', 'Grocery run'],
    ['2026-07-08', 'Meiji Milk (4L)', '13.40', 'expense', 'Dairy', 'Credit Card', 'Weekly milk supply'],
    ['2026-07-08', 'Watermelon (3-4kg)', '4.50', 'expense', 'Fruits', 'Credit Card', 'Fresh produce'],
    ['2026-07-08', 'Spinach (200g)', '1.75', 'expense', 'Vegetable', 'Credit Card', 'Organic greens'],
    ['2026-07-13', 'Beef cubes', '6.50', 'expense', 'Protein', 'Credit Card', 'Dinner stew'],
    ['2026-07-13', 'Eggs (12-720g)', '3.95', 'expense', 'Eggs', 'Credit Card', 'Farm fresh'],
    ['2026-07-01', 'Monthly Salary Paycheck', '4500.00', 'income', 'Salary & Wages', 'Bank Transfer', 'Direct payroll deposit'],
    ['2026-07-10', 'Netflix Premium 4K', '15.99', 'expense', 'Subscriptions', 'Credit Card', 'Auto recurring charge'],
    ['2026-07-15', 'Electric & Water Utility', '125.40', 'expense', 'Utilities & Bills', 'Debit Card', 'SP Services'],
    ['2026-07-19', 'Starbucks Coffee & Bagel', '9.50', 'expense', 'Food & Dining', 'Digital Wallet', 'Morning breakfast']
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + [sampleHeaders.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'sample_expenses_template.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Downloads sample Excel (.xlsx) template
 */
export const downloadSampleExcel = () => {
  const sampleData = [
    {
      Date: '2026-07-08',
      Description: 'Frozen Pork (1kg)',
      Amount: 7.55,
      Type: 'expense',
      Category: 'Protein',
      'Payment Method': 'Credit Card',
      Notes: 'Grocery run'
    },
    {
      Date: '2026-07-08',
      Description: 'Meiji Milk (4L)',
      Amount: 13.40,
      Type: 'expense',
      Category: 'Dairy',
      'Payment Method': 'Credit Card',
      Notes: 'Weekly milk supply'
    },
    {
      Date: '2026-07-08',
      Description: 'Watermelon (3-4kg)',
      Amount: 4.50,
      Type: 'expense',
      Category: 'Fruits',
      'Payment Method': 'Credit Card',
      Notes: 'Fresh produce'
    },
    {
      Date: '2026-07-08',
      Description: 'Spinach (200g)',
      Amount: 1.75,
      Type: 'expense',
      Category: 'Vegetable',
      'Payment Method': 'Credit Card',
      Notes: 'Organic greens'
    },
    {
      Date: '2026-07-13',
      Description: 'Beef cubes',
      Amount: 6.50,
      Type: 'expense',
      Category: 'Protein',
      'Payment Method': 'Credit Card',
      Notes: 'Dinner stew'
    },
    {
      Date: '2026-07-13',
      Description: 'Eggs (12-720g)',
      Amount: 3.95,
      Type: 'expense',
      Category: 'Eggs',
      'Payment Method': 'Credit Card',
      Notes: 'Farm fresh'
    },
    {
      Date: '2026-07-01',
      Description: 'Monthly Salary Paycheck',
      Amount: 4500.00,
      Type: 'income',
      Category: 'Salary & Wages',
      'Payment Method': 'Bank Transfer',
      Notes: 'Direct payroll deposit'
    },
    {
      Date: '2026-07-10',
      Description: 'Netflix Premium 4K',
      Amount: 15.99,
      Type: 'expense',
      Category: 'Subscriptions',
      'Payment Method': 'Credit Card',
      Notes: 'Auto recurring charge'
    },
    {
      Date: '2026-07-15',
      Description: 'Electric & Water Utility',
      Amount: 125.40,
      Type: 'expense',
      Category: 'Utilities & Bills',
      'Payment Method': 'Debit Card',
      Notes: 'SP Services'
    },
    {
      Date: '2026-07-19',
      Description: 'Starbucks Coffee & Bagel',
      Amount: 9.50,
      Type: 'expense',
      Category: 'Food & Dining',
      'Payment Method': 'Digital Wallet',
      Notes: 'Morning breakfast'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Column formatting
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 28 }, // Description
    { wch: 12 }, // Amount
    { wch: 12 }, // Type
    { wch: 20 }, // Category
    { wch: 18 }, // Payment Method
    { wch: 26 }  // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, 'sample_expenses_template.xlsx');
};

/**
 * Export transactions to an Excel (.xlsx) file
 */
export const exportTransactionsAsExcel = (transactions = [], categories = [], filename) => {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const formattedData = transactions.map((tx) => ({
    ID: tx.id,
    Date: tx.date,
    Type: tx.type,
    Category: categoryMap.get(tx.categoryId) || tx.categoryId || 'Uncategorized',
    Amount: Number(tx.amount) || 0,
    'Payment Method': tx.paymentMethod || 'credit_card',
    Description: tx.description || '',
    Notes: tx.notes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(formattedData);
  ws['!cols'] = [
    { wch: 18 }, // ID
    { wch: 14 }, // Date
    { wch: 12 }, // Type
    { wch: 20 }, // Category
    { wch: 14 }, // Amount
    { wch: 18 }, // Payment Method
    { wch: 30 }, // Description
    { wch: 30 }  // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  const finalName =
    filename || `expanses_tracker_transactions_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, finalName);
};
