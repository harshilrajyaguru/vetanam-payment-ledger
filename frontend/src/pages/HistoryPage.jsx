import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import transactionService from '../services/transaction.service.js';
import { formatMinorUnits } from '../utils/currency.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import {
  History,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Search,
  Filter,
} from 'lucide-react';

const STATUS_FILTERS = ['ALL', 'COMPLETED', 'PENDING', 'FAILED', 'FLAGGED'];

export function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const [isLoading, setIsLoading]       = useState(true);

  const [searchQuery, setSearchQuery]   = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const [selectedTx, setSelectedTx]         = useState(null);
  const [ledgerEntries, setLedgerEntries]   = useState([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [isModalOpen, setIsModalOpen]       = useState(false);

  const loadHistory = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const res = await transactionService.getMyTransactions({ page: p, limit: 10 });
      if (res.success && res.data) {
        setTransactions(res.data.transactions);
        setTotalPages(res.data.totalPages || 1);
        setPage(res.data.page || 1);
        setTotal(res.data.total || 0);
      }
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(page); }, [loadHistory, page]);

  const handleOpenLedger = async (tx) => {
    setSelectedTx(tx);
    setIsModalOpen(true);
    setIsLoadingLedger(true);
    try {
      const res = await transactionService.getTransactionLedger(tx._id);
      if (res.success && res.data) setLedgerEntries(res.data.entries || []);
    } catch { setLedgerEntries([]); } finally {
      setIsLoadingLedger(false);
    }
  };

  // Filter transactions locally by search query and status filter tab
  const displayed = transactions.filter((tx) => {
    const matchesSearch =
      !searchQuery ||
      tx._id.includes(searchQuery) ||
      tx.senderAccountId?.includes(searchQuery) ||
      tx.receiverAccountId?.includes(searchQuery) ||
      (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      activeFilter === 'ALL' ||
      (activeFilter === 'PENDING' && ['PENDING', 'PROCESSING'].includes(tx.status)) ||
      tx.status === activeFilter;

    return matchesSearch && matchesStatus;
  });

  const { account } = useAuth();

  return (
    <div className="content-wrapper">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <h1>Transaction History</h1>
          <p className="text-muted">
            {total > 0 ? `${total} total transaction${total !== 1 ? 's' : ''}` : 'Double-entry ledger audit trail'}
          </p>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute', left: '0.85rem', top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex',
            }}
          >
            <Search size={16} />
          </span>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.4rem', width: '260px', fontSize: '0.875rem' }}
            placeholder="Search by ID or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.35rem' }}>
          <Filter size={14} /> Filter:
        </span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`btn btn-sm ${activeFilter === f ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.35rem 0.9rem', fontSize: '0.78rem' }}
          >
            {f === 'ALL' ? 'All Transactions' : f}
          </button>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="glass-card">
        {isLoading ? (
          <SkeletonLoader count={6} height="3.5rem" />
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><History size={26} /></div>
            <h3>{searchQuery || activeFilter !== 'ALL' ? 'No matching transactions' : 'No transactions recorded'}</h3>
            <p>
              {searchQuery || activeFilter !== 'ALL'
                ? 'Try adjusting your search or status filter'
                : 'Your transaction audit history will appear here'}
            </p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th style={{ textAlign: 'right' }}>Ledger Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((tx) => {
                    const isDeposit = String(tx.senderAccountId) === String(tx.receiverAccountId);
                    const isReceived = account?.id ? String(tx.receiverAccountId) === String(account.id) && !isDeposit : false;
                    const typeLabel = isDeposit ? 'Deposit' : isReceived ? 'Received' : 'Sent';
                    const amountClass = isDeposit || isReceived ? 'tx-amount-credit' : 'tx-amount-debit';

                    return (
                      <tr key={tx._id}>
                        <td>
                          <div>
                            <code style={{ fontSize: '0.8rem', color: 'var(--brand-indigo)', fontWeight: 600 }}>
                              #{tx._id.slice(-10).toUpperCase()}
                            </code>
                            {tx.description && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                {tx.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                              fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)',
                            }}
                          >
                            {isDeposit ? (
                              <PlusCircle size={15} color="var(--brand-indigo)" />
                            ) : isReceived ? (
                              <ArrowDownLeft size={15} color="var(--color-success)" />
                            ) : (
                              <ArrowUpRight size={15} color="var(--color-error)" />
                            )}
                            {typeLabel}
                          </span>
                        </td>
                        <td>
                          <span className={amountClass}>
                            {formatMinorUnits(tx.amount, tx.currency)}
                          </span>
                        </td>
                        <td><StatusBadge status={tx.status} /></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          {new Date(tx.createdAt).toLocaleString([], {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenLedger(tx)}
                            className="btn btn-secondary btn-sm"
                            title="View double-entry postings"
                            aria-label="View double-entry postings"
                          >
                            <Eye size={14} /> Entries
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: '1.5rem', paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={15} /> Previous
              </button>

              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="btn btn-secondary btn-sm"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Double-Entry Ledger Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setLedgerEntries([]); }}
        title="Double-Entry Ledger Postings"
        subtitle={selectedTx ? `Ref #${selectedTx._id.slice(-10).toUpperCase()}` : ''}
        maxWidth="540px"
      >
        {selectedTx && (
          <>
            <div
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Total Amount</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{formatMinorUnits(selectedTx.amount, selectedTx.currency)}</div>
              </div>
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Status</div>
                <StatusBadge status={selectedTx.status} />
              </div>
            </div>

            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Immutable Double-Entry Pair
            </h4>

            {isLoadingLedger ? (
              <SkeletonLoader count={2} height="3rem" />
            ) : ledgerEntries.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                No ledger entries — transaction was flagged or failed prior to posting.
              </p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Account</th>
                      <th>Amount</th>
                      <th>Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry) => (
                      <tr key={entry._id}>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            {entry.type === 'DEBIT' ? (
                              <ArrowUpRight size={15} color="var(--color-error)" />
                            ) : (
                              <ArrowDownLeft size={15} color="var(--color-success)" />
                            )}
                            <span className={`badge ${entry.type === 'DEBIT' ? 'badge-danger' : 'badge-success'}`}>
                              {entry.type}
                            </span>
                          </span>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.78rem', color: 'var(--brand-indigo)', fontWeight: 600 }}>
                            {entry.accountId ? String(entry.accountId).slice(-8).toUpperCase() : '—'}
                          </code>
                        </td>
                        <td className={entry.type === 'DEBIT' ? 'tx-amount-debit' : 'tx-amount-credit'}>
                          {formatMinorUnits(entry.amount, selectedTx.currency)}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                          {formatMinorUnits(entry.balanceAfter, selectedTx.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

export default HistoryPage;
