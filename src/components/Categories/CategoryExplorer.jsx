import React, { useMemo, useState } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency, formatDate, formatShortDate, getMonthName } from '../../utils/formatters';
import { getLineItems } from '../../utils/receiptCategories';
import { CategoryIcon } from '../UI/CategoryIcon';
import { Tags, Search, ArrowUp, ArrowDown, ArrowUpDown, Package } from 'lucide-react';

const UNCATEGORIZED = { name: 'Uncategorized', color: '#64748b', icon: 'CircleDollarSign' };

// Direction a column sorts in when first clicked
const DEFAULT_SORT_DIR = { name: 'asc', date: 'desc', total: 'desc' };

export const CategoryExplorer = () => {
  const { transactions, categories, currency, selectedMonth, selectedYear } = useExpense();

  const [period, setPeriod] = useState('month'); // month | all
  const [selectedCatId, setSelectedCatId] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'total', dir: 'desc' });

  const money = (amount) => formatCurrency(amount, currency.code, currency.symbol);
  const monthLabel = `${getMonthName(selectedMonth)} ${selectedYear}`;

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const getCategory = (id) => categoryById.get(id) || UNCATEGORIZED;

  // Every purchased item in the chosen period
  const items = useMemo(() => {
    const prefix = `${selectedYear}-${selectedMonth}`;
    return transactions
      .filter((tx) => tx.type === 'expense' && (period === 'all' || (tx.date && tx.date.startsWith(prefix))))
      .flatMap((tx) => {
        const fromReceipt = Array.isArray(tx.receiptItems) && tx.receiptItems.length > 0;
        return getLineItems(tx).map((item, index) => ({
          ...item,
          key: `${tx.id}-${index}`,
          date: tx.date || '',
          merchant: fromReceipt ? tx.description : null
        }));
      });
  }, [transactions, period, selectedYear, selectedMonth]);

  // Per-category totals and priciest item, biggest spend first
  const categoryStats = useMemo(() => {
    const stats = new Map();
    items.forEach((item) => {
      const s = stats.get(item.categoryId) || { categoryId: item.categoryId, total: 0, count: 0, top: null };
      s.total += item.total;
      s.count += 1;
      if (!s.top || item.total > s.top.total) s.top = item;
      stats.set(item.categoryId, s);
    });
    return [...stats.values()].sort((a, b) => b.total - a.total);
  }, [items]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const dir = sort.dir === 'asc' ? 1 : -1;
    return items
      .filter((item) => selectedCatId === 'all' || item.categoryId === selectedCatId)
      .filter((item) => !query || item.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sort.key === 'name') return dir * a.name.localeCompare(b.name);
        if (sort.key === 'date') return dir * a.date.localeCompare(b.date) || b.total - a.total;
        return dir * (a.total - b.total);
      });
  }, [items, selectedCatId, search, sort]);

  const visibleTotal = visibleItems.reduce((acc, item) => acc + item.total, 0);
  const priciest = visibleItems.reduce((top, item) => (!top || item.total > top.total ? item : top), null);

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: DEFAULT_SORT_DIR[key] }
    );
  };

  const sortHeader = (sortKey, label, align = 'left') => {
    const active = sort.key === sortKey;
    const Arrow = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th style={{ textAlign: align }}>
        <button
          type="button"
          onClick={() => handleSort(sortKey)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            color: active ? 'var(--text-main)' : 'inherit'
          }}
        >
          {label}
          <Arrow size={12} style={{ opacity: active ? 1 : 0.5 }} />
        </button>
      </th>
    );
  };

  const tileStyle = (selected) => ({
    textAlign: 'left',
    cursor: 'pointer',
    background: 'var(--bg-card)',
    border: selected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
    boxShadow: selected ? '0 0 0 3px var(--primary-glow)' : 'none',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem 0.85rem',
    color: 'var(--text-main)',
    font: 'inherit',
    minWidth: 0
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Category Tiles */}
      <div className="glass-panel">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="panel-title">
            <Tags size={22} color="var(--primary)" />
            <span>Spending by Category</span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { id: 'month', label: monthLabel },
              { id: 'all', label: 'All Time' }
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                className={`btn ${period === option.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                onClick={() => setPeriod(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '0.75rem'
          }}
        >
          <button type="button" style={tileStyle(selectedCatId === 'all')} onClick={() => setSelectedCatId('all')}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>All Categories</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', margin: '0.2rem 0' }}>
              {money(categoryStats.reduce((acc, s) => acc + s.total, 0))}
            </div>
            <div className="tx-date-sub">{items.length} items</div>
          </button>

          {categoryStats.map((s) => {
            const cat = getCategory(s.categoryId);
            return (
              <button
                key={s.categoryId}
                type="button"
                style={tileStyle(selectedCatId === s.categoryId)}
                onClick={() => setSelectedCatId(s.categoryId)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                  <CategoryIcon name={cat.icon} size={14} color={cat.color} />
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cat.name}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', margin: '0.2rem 0' }}>
                  {money(s.total)}
                </div>
                <div className="tx-date-sub">
                  {s.count} {s.count === 1 ? 'item' : 'items'}
                </div>
                <div
                  className="tx-date-sub"
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={`${s.top.name} — ${money(s.top.total)}`}
                >
                  Top: {s.top.name} · {money(s.top.total)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Item List */}
      <div className="glass-panel">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="panel-title">
            <Package size={20} color="var(--primary)" />
            <span>{selectedCatId === 'all' ? 'All Items' : getCategory(selectedCatId).name}</span>
          </div>
          <div style={{ position: 'relative', flex: '0 1 260px', minWidth: '180px' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.1rem' }}
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {visibleItems.length > 0 && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-main)' }}>{money(visibleTotal)}</strong> across {visibleItems.length}{' '}
            {visibleItems.length === 1 ? 'item' : 'items'} · average {money(visibleTotal / visibleItems.length)} · most
            expensive: <strong style={{ color: 'var(--text-main)' }}>{priciest.name}</strong> ({money(priciest.total)},{' '}
            {formatDate(priciest.date)})
          </div>
        )}

        {visibleItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Package size={28} />
            </div>
            <h3>No items found</h3>
            <p>
              {search.trim()
                ? 'No items match your search.'
                : period === 'month'
                  ? `Nothing in this category for ${monthLabel}. Try All Time.`
                  : 'Nothing recorded in this category yet.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table item-table">
              <thead>
                <tr>
                  {sortHeader('name', 'Item')}
                  {sortHeader('date', 'Date')}
                  {sortHeader('total', 'Price', 'right')}
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const cat = getCategory(item.categoryId);
                  return (
                    <tr key={item.key}>
                      <td>
                        <div className="tx-desc-text" style={{ fontSize: '0.88rem' }}>
                          {item.name}
                        </div>
                        <div className="tx-date-sub">
                          {selectedCatId === 'all' && <span style={{ color: cat.color, fontWeight: 600 }}>{cat.name}</span>}
                          {selectedCatId === 'all' && item.merchant && ' · '}
                          {item.merchant}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {period === 'month' ? formatShortDate(item.date) : formatDate(item.date)}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div className="tx-amount">{money(item.total)}</div>
                        {item.qty > 1 && (
                          <div className="tx-date-sub">
                            {item.qty} × {money(item.price)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="tx-date-sub" style={{ marginTop: '0.75rem' }}>
          Receipt items show the price printed on the receipt, before tax and receipt-wide discounts.
        </div>
      </div>
    </div>
  );
};
