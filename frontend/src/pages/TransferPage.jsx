import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import transactionService from '../services/transaction.service.js';
import { formatMinorUnits, toMinorUnits } from '../utils/currency.js';
import Modal from '../components/Modal.jsx';
import {
  Send,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Key,
} from 'lucide-react';

export function TransferPage() {
  const { account, user, fetchAccount } = useAuth();
  const navigate = useNavigate();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [displayAmount, setDisplayAmount]   = useState('');
  const [description, setDescription]       = useState('');

  const [isConfirmOpen, setIsConfirmOpen]   = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [error, setError]                   = useState('');
  const [successTx, setSuccessTx]           = useState(null);

  const minorAmount = toMinorUnits(displayAmount);
  const userBalance = account?.cachedBalance || 0;
  const isInsufficient = minorAmount > userBalance;

  const generateIdempotencyKey = () => `IK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const handleOpenReview = (e) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setError('Please enter a valid recipient email address.');
      return;
    }
    if (recipientEmail.toLowerCase().trim() === user?.email?.toLowerCase().trim()) {
      setError('Cannot transfer money to yourself.');
      return;
    }
    if (!minorAmount || minorAmount <= 0) {
      setError('Transfer amount must be greater than ₹0.');
      return;
    }
    if (isInsufficient) {
      setError(`Insufficient balance. Maximum available: ${formatMinorUnits(userBalance)}`);
      return;
    }

    setError('');
    setIsConfirmOpen(true);
  };

  const handleExecuteTransfer = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const idempotencyKey = generateIdempotencyKey();
      const res = await transactionService.transfer({
        recipientEmail: recipientEmail.trim(),
        amount: minorAmount,
        currency: account?.currency || 'INR',
        description: description.trim() || undefined,
        idempotencyKey,
      });

      if (res.success && res.data) {
        setSuccessTx(res.data.transaction || res.data);
        await fetchAccount();
      } else {
        setError(res.error?.message || 'Transfer failed.');
        setIsConfirmOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Transfer failed.';
      setError(msg);
      setIsConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRecipientEmail('');
    setDisplayAmount('');
    setDescription('');
    setSuccessTx(null);
    setIsConfirmOpen(false);
    setError('');
  };

  return (
    <div className="content-wrapper">
      <div className="page-header" style={{ maxWidth: '580px', margin: '0 auto 2rem' }}>
        <h1>Send Money</h1>
        <p className="text-muted">
          Instant double-entry P2P transfer protected by idempotency & rule-based fraud checks.
        </p>
      </div>

      <div style={{ maxWidth: '580px', margin: '0 auto' }}>
        {/* Available Balance Banner */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="card-icon" style={{ width: 32, height: 32 }}>
              <ShieldCheck size={16} />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Available Balance</span>
          </div>
          <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 800 }}>
            {formatMinorUnits(userBalance)}
          </strong>
        </div>

        {/* Transfer Form Card */}
        <div className="glass-card">
          {error && (
            <div className="alert alert-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleOpenReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Recipient Email Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="recipient-email">
                Recipient Email
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute', left: '1rem', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)',
                    display: 'flex', pointerEvents: 'none',
                  }}
                >
                  <User size={18} />
                </span>
                <input
                  id="recipient-email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="recipient@example.com"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    setError('');
                  }}
                  required
                />
              </div>
              <div className="form-hint">Lookup recipient by registered email address</div>
            </div>

            {/* Amount Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-amount">
                Transfer Amount (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute', left: '1rem', top: '50%',
                    transform: 'translateY(-50%)', fontWeight: 700,
                    fontSize: '1.2rem', color: 'var(--brand-indigo)',
                    pointerEvents: 'none',
                  }}
                >
                  ₹
                </span>
                <input
                  id="transfer-amount"
                  type="number"
                  min="0.01"
                  step="any"
                  className="form-input"
                  style={{
                    paddingLeft: '2.5rem',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    height: '3.25rem',
                  }}
                  placeholder="0.00"
                  value={displayAmount}
                  onChange={(e) => {
                    setDisplayAmount(e.target.value);
                    setError('');
                  }}
                  required
                />
              </div>

              {displayAmount && minorAmount > 0 && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Equals: <strong style={{ color: 'var(--brand-indigo)' }}>{minorAmount}</strong> minor units
                </div>
              )}
            </div>

            {/* Note / Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-desc">
                Description / Reference (Optional)
              </label>
              <input
                id="transfer-desc"
                type="text"
                className="form-input"
                placeholder="What is this transfer for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={!recipientEmail || !displayAmount || isInsufficient}
            >
              <Send size={18} />
              Review Transfer <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Confirmation & Review Modal */}
      <Modal
        isOpen={isConfirmOpen && !successTx}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Transfer"
        subtitle="Double-entry ledger posting confirmation"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Recipient</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{recipientEmail}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Amount</span>
              <strong style={{ color: 'var(--brand-indigo)', fontSize: '1.25rem', fontWeight: 800 }}>
                {formatMinorUnits(minorAmount)}
              </strong>
            </div>

            {description && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Note</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{description}</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Balance After Transfer</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-success)' }}>
                  {formatMinorUnits(userBalance - minorAmount)}
                </strong>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-indigo-light)',
              fontSize: '0.8rem',
              color: 'var(--brand-indigo)',
            }}
          >
            <Key size={16} style={{ flexShrink: 0 }} />
            <span>Protected by unique idempotency key & atomic Mongo transaction.</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteTransfer}
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : (
                <>
                  <Sparkles size={16} /> Confirm & Pay
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={Boolean(successTx)}
        onClose={resetForm}
        title="Transfer Completed"
        subtitle="Double-entry debit & credit posted successfully"
        maxWidth="480px"
      >
        <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
            }}
          >
            <CheckCircle2 size={40} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatMinorUnits(minorAmount)} Sent
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Transferred to <strong>{recipientEmail}</strong>
            </p>
          </div>

          {successTx?._id && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Transaction Reference</span>
              <code style={{ color: 'var(--brand-indigo)', fontWeight: 600 }}>
                #{successTx._id.slice(-10).toUpperCase()}
              </code>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={resetForm} className="btn btn-secondary" style={{ flex: 1 }}>
              Send Another
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TransferPage;
