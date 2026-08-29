import React from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { PAYMENT_METHODS } from '../../data/initialData';
import { exportTransactionsAsCSV } from '../../utils/storage';
import { Search, Download, RotateCcw } from 'lucide-react';

export const TransactionFilter = () => {
  const {
    categories,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filterType,
    setFilterType,
    filterPaymentMethod,
    setFilterPaymentMethod,
    sortBy,
    setSortBy,
    currentMonthTransactions
  } = useExpense();

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterType('all');
    setFilterPaymentMethod('all');
    setSortBy('date-desc');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    filterCategory !== 'all' ||
    filterType !== 'all' ||
    filterPaymentMethod !== 'all' ||
    sortBy !== 'date-desc';

  return (
    <div className="filter-bar">
      {/* Search Input */}
      <div className="search-input-wrap">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          className="input-field"
          placeholder="Search by description, notes or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Type Filter */}
      <select
        className="select-field"
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
      >
        <option value="all">All Types</option>
        <option value="expense">Expenses Only</option>
        <option value="income">Income Only</option>
      </select>

      {/* Category Filter */}
      <select
        className="select-field"
        value={filterCategory}
        onChange={(e) => setFilterCategory(e.target.value)}
      >
        <option value="all">All Categories</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name} ({cat.type})
          </option>
        ))}
      </select>

      {/* Payment Method Filter */}
      <select
        className="select-field"
        value={filterPaymentMethod}
        onChange={(e) => setFilterPaymentMethod(e.target.value)}
      >
        <option value="all">All Payment Methods</option>
        {PAYMENT_METHODS.map((pm) => (
          <option key={pm.id} value={pm.id}>
            {pm.name}
          </option>
        ))}
      </select>

      {/* Sort By */}
      <select
        className="select-field"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
      >
        <option value="date-desc">Newest First</option>
        <option value="date-asc">Oldest First</option>
        <option value="amount-desc">Highest Amount</option>
        <option value="amount-asc">Lowest Amount</option>
      </select>

      {/* Reset Filter Button */}
      {hasActiveFilters && (
        <button
          className="btn btn-secondary"
          onClick={handleResetFilters}
          title="Reset Filters"
          style={{ padding: '0.65rem 0.9rem' }}
        >
          <RotateCcw size={15} />
          <span>Reset</span>
        </button>
      )}

      {/* Export to CSV */}
      <button
        className="btn btn-secondary"
        onClick={() => exportTransactionsAsCSV(currentMonthTransactions, categories)}
        title="Export Monthly Transactions as CSV"
        style={{ padding: '0.65rem 0.9rem', marginLeft: 'auto' }}
      >
        <Download size={15} />
        <span>Export CSV</span>
      </button>
    </div>
  );
};
