export const DEFAULT_CURRENCIES = [
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AU$)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso (₱)' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit (RM)' }
];

export const PAYMENT_METHODS = [
  { id: 'credit_card', name: 'Credit Card', icon: 'CreditCard' },
  { id: 'debit_card', name: 'Debit Card', icon: 'CreditCard' },
  { id: 'cash', name: 'Cash', icon: 'Banknote' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: 'Landmark' },
  { id: 'digital_wallet', name: 'Digital Wallet (Apple/Google)', icon: 'Smartphone' },
  { id: 'other', name: 'Other', icon: 'CircleDollarSign' }
];

export const DEFAULT_CATEGORIES = [
  // User Grocery & Food Categories
  { id: 'cat_protein', name: 'Protein', type: 'expense', color: '#ef4444', icon: 'Utensils' },
  { id: 'cat_carbohydrates', name: 'Carbohydrates', type: 'expense', color: '#f59e0b', icon: 'Wheat' },
  { id: 'cat_dairy', name: 'Dairy', type: 'expense', color: '#38bdf8', icon: 'Milk' },
  { id: 'cat_fruits', name: 'Fruits', type: 'expense', color: '#ec4899', icon: 'Apple' },
  { id: 'cat_vegetable', name: 'Vegetable', type: 'expense', color: '#10b981', icon: 'Salad' },
  { id: 'cat_pantry', name: 'Pantry', type: 'expense', color: '#8b5cf6', icon: 'Package' },
  { id: 'cat_can_food', name: 'Can food', type: 'expense', color: '#06b6d4', icon: 'Archive' },
  { id: 'cat_eggs', name: 'Eggs', type: 'expense', color: '#fbbf24', icon: 'Egg' },
  { id: 'cat_pets', name: 'Pets', type: 'expense', color: '#d946ef', icon: 'Heart' },
  { id: 'cat_snacks', name: 'Snacks', type: 'expense', color: '#f97316', icon: 'Cookie' },
  { id: 'cat_seafoods', name: 'Seafoods', type: 'expense', color: '#0284c7', icon: 'Fish' },
  { id: 'cat_detergents', name: 'Detergents', type: 'expense', color: '#6366f1', icon: 'Sparkles' },

  // General Life Categories
  { id: 'cat_food', name: 'Food & Dining', type: 'expense', color: '#f97316', icon: 'Utensils' },
  { id: 'cat_groceries', name: 'Groceries', type: 'expense', color: '#10b981', icon: 'ShoppingBag' },
  { id: 'cat_housing', name: 'Housing & Rent', type: 'expense', color: '#6366f1', icon: 'Home' },
  { id: 'cat_transport', name: 'Transportation', type: 'expense', color: '#0ea5e9', icon: 'Car' },
  { id: 'cat_utilities', name: 'Utilities & Bills', type: 'expense', color: '#eab308', icon: 'Zap' },
  { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', color: '#ec4899', icon: 'Film' },
  { id: 'cat_shopping', name: 'Shopping', type: 'expense', color: '#8b5cf6', icon: 'Tag' },
  { id: 'cat_health', name: 'Health & Medical', type: 'expense', color: '#ef4444', icon: 'HeartPulse' },
  { id: 'cat_subscriptions', name: 'Subscriptions', type: 'expense', color: '#a855f7', icon: 'CalendarSync' },
  { id: 'cat_travel', name: 'Travel & Vacations', type: 'expense', color: '#06b6d4', icon: 'Plane' },
  { id: 'cat_other_exp', name: 'Miscellaneous', type: 'expense', color: '#64748b', icon: 'MoreHorizontal' },

  // Income Categories
  { id: 'cat_salary', name: 'Salary & Wages', type: 'income', color: '#10b981', icon: 'Briefcase' },
  { id: 'cat_freelance', name: 'Freelance & Side Gig', type: 'income', color: '#06b6d4', icon: 'Laptop' },
  { id: 'cat_investments', name: 'Investments & Dividends', type: 'income', color: '#84cc16', icon: 'TrendingUp' },
  { id: 'cat_gifts', name: 'Gifts & Grants', type: 'income', color: '#d946ef', icon: 'Gift' },
  { id: 'cat_other_inc', name: 'Other Income', type: 'income', color: '#64748b', icon: 'CircleDollarSign' }
];
