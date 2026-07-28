import { useState } from 'react';
import { Wallet, Copy, Check, Send, RefreshCw, PlusCircle, ShieldCheck } from 'lucide-react';
import { formatMinorUnits } from '../utils/currency.js';
import StatusBadge from './StatusBadge.jsx';
import AddFundsModal from './AddFundsModal.jsx';

export function BalanceCard({ account, onRefresh, onSendClick }) {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);

  if (!account) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Wallet unavailable</p>
      </div>
    );
  }

  const handleCopy = () => {
    if (account.id) {
      navigator.clipboard.writeText(account.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <>
      <div
        className="glass-card glass-card-interactive"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Subtle Background Glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79, 70, 229, 0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="card-icon">
              <Wallet size={19} color="var(--brand-indigo)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Vetanam Wallet
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Double-Entry Verified Ledger
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <StatusBadge status={account.status} />
            {onRefresh && (
              <button
                onClick={handleRefresh}
                className="btn btn-ghost btn-icon btn-sm"
                title="Refresh balance"
                aria-label="Refresh balance"
                disabled={isRefreshing}
                style={{
                  color: 'var(--text-muted)',
                  transition: 'transform 0.4s ease',
                  transform: isRefreshing ? 'rotate(360deg)' : 'none',
                }}
              >
                <RefreshCw size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Balance Display */}
        <div style={{ marginBottom: '1.75rem' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Available Balance
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                fontSize: '2.75rem',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
                lineHeight: 1,
              }}
            >
              {formatMinorUnits(account.cachedBalance, account.currency)}
            </span>
          </div>

          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={14} color="var(--color-success)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-success)' }}>
              100% Auditable Ledger State
            </span>
          </div>
        </div>

        {/* Wallet ID Strip */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.15rem' }}>
              Wallet ID
            </div>
            <code style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-indigo)' }}>
              {account.id ? account.id.slice(0, 12) + '...' + account.id.slice(-6) : '—'}
            </code>
          </div>
          <button
            onClick={handleCopy}
            className="btn btn-ghost btn-icon btn-sm"
            title={copied ? 'Copied!' : 'Copy wallet ID'}
            aria-label="Copy wallet ID"
            style={{ color: copied ? 'var(--color-success)' : 'var(--text-muted)' }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        {/* Dual CTAs: Add Funds + Send Money */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setIsAddFundsOpen(true)}
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <PlusCircle size={17} />
            Add Funds
          </button>

          {onSendClick && (
            <button
              onClick={onSendClick}
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Send size={17} />
              Send Money
            </button>
          )}
        </div>
      </div>

      {/* Add Funds Modal */}
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        currentBalance={account?.cachedBalance || 0}
        onDepositSuccess={async () => {
          if (onRefresh) await onRefresh();
        }}
      />
    </>
  );
}

export default BalanceCard;
