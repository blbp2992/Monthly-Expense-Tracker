// Helpers for receipts whose line items carry their own categories.

// Normalizes receipt item names so small OCR differences still match
// e.g. "> S/A NAVEL ORANGE" and "S.A NAVEL ORANGE" -> "s a navel orange"
export const normalizeItemName = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const lineTotal = (item) => (Number(item.price) || 0) * (Number(item.qty) || 1);

const hasItemCategories = (tx) =>
  Array.isArray(tx.receiptItems) && tx.receiptItems.some((it) => it.categoryId);

// Splits a transaction's amount across categories. For receipts with categorized
// items, each category gets its share of the item subtotal, so tax, discounts
// and later amount edits are spread proportionally and the parts sum to tx.amount.
export const getCategoryAllocations = (tx) => {
  const amount = Number(tx.amount) || 0;
  if (!hasItemCategories(tx)) return [{ categoryId: tx.categoryId, amount }];

  const subtotalByCategory = {};
  let subtotal = 0;
  tx.receiptItems.forEach((item) => {
    const value = lineTotal(item);
    if (value <= 0) return;
    const catId = item.categoryId || tx.categoryId;
    subtotalByCategory[catId] = (subtotalByCategory[catId] || 0) + value;
    subtotal += value;
  });

  if (subtotal <= 0) return [{ categoryId: tx.categoryId, amount }];

  return Object.entries(subtotalByCategory).map(([categoryId, value]) => ({
    categoryId,
    amount: (value / subtotal) * amount
  }));
};

// One entry per purchased item: each receipt line, or the transaction itself when
// it has no receipt items. `printed` is the line amount on the receipt; `amount` is
// the item's share of what was actually paid (scaled the same way as
// getCategoryAllocations), so a receipt's items always add up to its total.
export const getLineItems = (tx) => {
  const paid = Number(tx.amount) || 0;
  const items = Array.isArray(tx.receiptItems)
    ? tx.receiptItems.filter((item) => lineTotal(item) > 0)
    : [];
  if (items.length === 0) {
    return [{ name: tx.description, qty: 1, price: paid, printed: paid, amount: paid, categoryId: tx.categoryId }];
  }
  const subtotal = items.reduce((acc, item) => acc + lineTotal(item), 0);
  return items.map((item) => ({
    name: String(item.name || 'Item'),
    qty: Number(item.qty) || 1,
    price: Number(item.price) || 0,
    printed: lineTotal(item),
    amount: (lineTotal(item) / subtotal) * paid,
    categoryId: item.categoryId || tx.categoryId
  }));
};

// Slack when comparing item sums with a receipt total (half-cent unit prices, rounding)
export const TALLY_TOLERANCE = 0.05;

// Sum of the receipt lines as printed, including discount lines
export const getItemsTotal = (items) => (items || []).reduce((acc, item) => acc + lineTotal(item), 0);

// Receipts print multi-quantity lines as their line total, and the scanner sometimes
// stores that as the unit price, so price x qty overshoots. If treating some of
// those lines as line totals makes the items match the paid total — and only one
// such choice does — returns the items with those prices turned into unit prices.
// Returns null when the items already match or there's no clear fix.
export const fixLineTotalPrices = (items, total) => {
  const paid = Number(total) || 0;
  const base = getItemsTotal(items);
  if (!paid || Math.abs(base - paid) <= TALLY_TOLERANCE) return null;

  // How much each multi-quantity line would drop if its price were the line total
  const candidates = (items || [])
    .map((item, index) => ({ index, qty: Number(item.qty) || 1, drop: lineTotal(item) - (Number(item.price) || 0) }))
    .filter((c) => c.qty > 1 && c.drop > 0);
  if (candidates.length === 0 || candidates.length > 16) return null;

  let match = null;
  for (let mask = 1; mask < 1 << candidates.length; mask++) {
    let sum = base;
    candidates.forEach((c, bit) => {
      if (mask & (1 << bit)) sum -= c.drop;
    });
    if (Math.abs(sum - paid) > TALLY_TOLERANCE) continue;
    if (match !== null) return null; // more than one way to fix it
    match = mask;
  }
  if (match === null) return null;

  const fixed = items.slice();
  candidates.forEach((c, bit) => {
    if (match & (1 << bit)) {
      const item = fixed[c.index];
      fixed[c.index] = { ...item, price: Math.round(((Number(item.price) || 0) / c.qty) * 10000) / 10000 };
    }
  });
  return fixed;
};

// Category with the largest share of the items, used as the transaction's headline category
export const getPrimaryCategoryId = (items, fallback) => {
  const totals = {};
  (items || []).forEach((item) => {
    if (!item.categoryId) return;
    totals[item.categoryId] = (totals[item.categoryId] || 0) + lineTotal(item);
  });
  const [top] = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return top ? top[0] : fallback;
};
