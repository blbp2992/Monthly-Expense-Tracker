import { loadFromStorage, saveToStorage } from './storage';

// Earlier versions seeded demo transactions, subscriptions and budgets into
// localStorage. This one-time migration strips those seeded records from
// existing installs while leaving anything the user created untouched.
const CLEANUP_FLAG = 'demo_data_removed_v1';

const DEMO_TRANSACTION_ID = /^tx-(j-\d+|july-inc-1)$/;
const DEMO_SUBSCRIPTION_IDS = new Set(['sub-1', 'sub-2', 'sub-3', 'sub-4', 'sub-5']);

// Budgets were merged in with these values; only drop entries still at the demo amount
const DEMO_BUDGETS = {
  cat_protein: 120,
  cat_carbohydrates: 80,
  cat_dairy: 60,
  cat_fruits: 70,
  cat_vegetable: 90,
  cat_pantry: 80,
  cat_can_food: 30,
  cat_eggs: 25,
  cat_pets: 40,
  cat_snacks: 30,
  cat_seafoods: 50,
  cat_detergents: 30,
  cat_housing: 1400,
  cat_utilities: 180,
  cat_transport: 200,
  cat_subscriptions: 85
};

export const removeLegacyDemoData = () => {
  if (loadFromStorage(CLEANUP_FLAG, false)) return;

  const transactions = loadFromStorage('transactions', null);
  if (Array.isArray(transactions)) {
    saveToStorage(
      'transactions',
      transactions.filter((t) => !DEMO_TRANSACTION_ID.test(String(t.id)))
    );
  }

  const subscriptions = loadFromStorage('subscriptions', null);
  if (Array.isArray(subscriptions)) {
    saveToStorage(
      'subscriptions',
      subscriptions.filter((s) => !DEMO_SUBSCRIPTION_IDS.has(s.id))
    );
  }

  const budgets = loadFromStorage('budgets', null);
  if (budgets && typeof budgets === 'object') {
    const cleaned = Object.fromEntries(
      Object.entries(budgets).filter(([catId, amount]) => DEMO_BUDGETS[catId] !== Number(amount))
    );
    saveToStorage('budgets', cleaned);
  }

  saveToStorage(CLEANUP_FLAG, true);
};
