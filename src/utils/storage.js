const STORAGE_PREFIX = 'spendwise_';

export const loadFromStorage = (key, fallback) => {
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (item === null) return fallback;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error loading key "${key}" from localStorage:`, error);
    return fallback;
  }
};

export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving key "${key}" to localStorage:`, error);
  }
};

export const exportDataAsJSON = (stateData) => {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(stateData, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute(
    'download',
    `expanses_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const exportTransactionsAsCSV = (transactions, categories, filename) => {
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

  const headers = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Payment Method', 'Description', 'Notes'];
  const rows = transactions.map((tx) => [
    `"${tx.id}"`,
    `"${tx.date}"`,
    `"${tx.type}"`,
    `"${categoryMap.get(tx.categoryId) || tx.categoryId || 'Uncategorized'}"`,
    Number(tx.amount) || 0,
    `"${tx.paymentMethod || 'credit_card'}"`,
    `"${(tx.description || '').replace(/"/g, '""')}"`,
    `"${(tx.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename || `expanses_tracker_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export { exportTransactionsAsExcel } from './fileImporter';

