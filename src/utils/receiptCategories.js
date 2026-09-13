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
