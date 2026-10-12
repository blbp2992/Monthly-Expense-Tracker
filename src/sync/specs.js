// Describes how each piece of app state maps to a Firestore collection under
// users/{uid}/{name}. Each spec converts state <-> [docId, docData] entries so
// the sync engine can diff and merge records individually.

import { DEFAULT_CATEGORIES } from '../data/initialData';

const byIdEntries = (list) => list.map((item) => [item.id, item]);

const DEFAULTS_BY_ID = new Map(DEFAULT_CATEGORIES.map((cat) => [cat.id, cat]));
const isUntouchedDefault = (cat) => {
  const def = DEFAULTS_BY_ID.get(cat.id);
  return Boolean(def) && ['name', 'type', 'color', 'icon'].every((key) => def[key] === cat[key]);
};

export const SYNC_SPECS = {
  transactions: {
    toEntries: byIdEntries,
    fromEntries: (entries) =>
      entries
        .map(([id, data]) => ({ ...data, id }))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id))
  },

  subscriptions: {
    toEntries: byIdEntries,
    fromEntries: (entries) =>
      entries.map(([id, data]) => ({ ...data, id })).sort((a, b) => a.id.localeCompare(b.id))
  },

  // Categories keep their display order via sortIndex
  categories: {
    // A new device starts with the built-in categories; when the account already
    // has categories, don't upload unchanged ones so removed categories stay removed
    skipOnMerge: ([, cat]) => isUntouchedDefault(cat),
    toEntries: (list) => list.map((cat, index) => [cat.id, { ...cat, sortIndex: index }]),
    fromEntries: (entries) =>
      entries
        .map(([id, data]) => ({ ...data, id }))
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
        .map(({ sortIndex, ...cat }) => cat)
  },

  // { categoryId: amount }
  budgets: {
    toEntries: (map) => Object.entries(map).map(([catId, amount]) => [catId, { amount }]),
    fromEntries: (entries) => Object.fromEntries(entries.map(([catId, data]) => [catId, data.amount]))
  },

  // Single weekly budget doc; keeps the current value if none exists yet
  budgetSettings: {
    toEntries: (weeklyBudget) => [['settings', { weeklyBudget }]],
    fromEntries: (entries, prev) =>
      entries.find(([id]) => id === 'settings')?.[1].weeklyBudget ?? prev
  },

  // { normalizedItemName: categoryId }
  itemCategoryMemory: {
    toEntries: (map) =>
      Object.entries(map)
        .filter(([key]) => key)
        .map(([key, categoryId]) => [key, { categoryId }]),
    fromEntries: (entries) => Object.fromEntries(entries.map(([key, data]) => [key, data.categoryId]))
  },

  // Single preferences doc; keeps the current value if none exists yet
  preferences: {
    toEntries: (currency) => [['preferences', { currency }]],
    fromEntries: (entries, prev) => entries.find(([id]) => id === 'preferences')?.[1].currency || prev
  }
};

export const SYNC_NAMES = Object.keys(SYNC_SPECS);
