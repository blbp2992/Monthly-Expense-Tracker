export const formatCurrency = (amount, currencyCode = 'USD', symbol = '$') => {
  const numericAmount = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount);
  } catch {
    // Fallback if an exotic currency code is passed
    return `${symbol}${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatShortDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export const getMonthName = (monthNumber) => {
  const date = new Date(2024, Number(monthNumber) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long' });
};

export const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

export const getRemainingDaysInMonth = (year, month) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (Number(year) !== currentYear || Number(month) !== currentMonth) {
    return getDaysInMonth(year, month);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const todayDate = now.getDate();
  return Math.max(1, daysInMonth - todayDate + 1);
};
