import { useState } from 'react';
import Modal from './Modal.jsx';
import accountApi from '../services/account.api.js';
import { formatMinorUnits, toMinorUnits } from '../utils/currency.js';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Building2,
  Smartphone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

const PAYMENT_METHODS = [
  { id: 'upi', name: 'Instant UPI', desc: 'GPay, PhonePe, Paytm', icon: Smartphone },
  { id: 'card', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { id: 'netbanking', name: 'Net Banking', desc: 'HDFC, ICICI, SBI, Axis', icon: Building2 },
];

export function AddFundsModal({ isOpen, onClose, currentBalance = 0, onDepositSuccess }) {
  const [step, setStep] = useState(1); // 1: Input, 2: Review, 3: Processing/Success
  const [displayAmount, setDisplayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const minorAmount = toMinorUnits(displayAmount);

  const resetState = () => {
    setStep(1);
    setDisplayAmount('');
    setDescription('');
    setError('');
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleQuickSelect = (val) => {
    setDisplayAmount(String(val));
    setError('');
  };

  const handleNextToReview = (e) => {
    e.preventDefault();
    if (!minorAmount || minorAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleConfirmDeposit = async () => {
    setIsProcessing(true);
    setError('');
    setStep(3);

    try {
      const res = await accountApi.deposit({
        amount: minorAmount,
        description: description.trim() || undefined,
      });

      setIsProcessing(false);
      if (res.success) {
        if (onDepositSuccess) {
          await onDepositSuccess(minorAmount);
        }
      } else {
        setError(res.error?.message || 'Deposit failed');
        setStep(1);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Deposit failed';
      setError(msg);
      setIsProcessing(false);
      setStep(1);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 3 && !isProcessing ? 'Funds Added Successfully' : 'Add Funds to Wallet'}
      subtitle={
        step === 1
          ? 'Instant deposit to your Vetanam Wallet'
          : step === 2
          ? 'Review deposit details before confirming'
          : step === 3 && isProcessing
          ? 'Connecting to ledger service...'
          : 'Double-entry transaction verified'
      }
      maxWidth="480px"
    >
      {/* STEP 1: AMOUNT & METHOD SELECTOR */}
      {step === 1 && (
        <form onSubmit={handleNextToReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* Quick Balance Preview */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Current Balance</span>
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              {formatMinorUnits(currentBalance)}
            </strong>
          </div>

          {/* Amount Input */}
          <div>
            <label className="form-label" htmlFor="deposit-amount">
              Deposit Amount (₹)
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: 'var(--brand-indigo)',
                }}
              >
                ₹
              </span>
              <input
                id="deposit-amount"
                type="number"
                min="1"
                step="any"
                className="form-input"
                style={{
                  paddingLeft: '2.5rem',
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  height: '3.25rem',
                }}
                placeholder="0.00"
                value={displayAmount}
                onChange={(e) => {
                  setDisplayAmount(e.target.value);
                  setError('');
                }}
                autoFocus
                required
              />
            </div>

            {/* Quick Amount Chips */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickSelect(amt)}
                  className={`btn btn-sm ${
                    displayAmount === String(amt) ? 'btn-primary' : 'btn-secondary'
                  }`}
                  style={{ borderRadius: 'var(--radius-full)', padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                >
                  +₹{amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="form-label">Select Payment Method (Demo)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {PAYMENT_METHODS.map((method) => {
                const IconComponent = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <div
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected
                        ? '2px solid var(--brand-indigo)'
                        : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--brand-indigo-light)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'var(--brand-indigo)' : 'var(--bg-elevated)',
                        color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComponent size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {method.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {method.desc}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: isSelected
                          ? '5px solid var(--brand-indigo)'
                          : '2px solid var(--border-default)',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="form-label" htmlFor="deposit-desc">
              Description / Note (Optional)
            </label>
            <input
              id="deposit-desc"
              type="text"
              className="form-input"
              placeholder="e.g. Monthly salary top-up"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* CTA */}
          <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '0.5rem', width: '100%' }}>
            Proceed to Review <ArrowRight size={18} />
          </button>
        </form>
      )}

      {/* STEP 2: REVIEW */}
      {step === 2 && (
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
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Deposit Amount</span>
              <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                {formatMinorUnits(minorAmount)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Payment Gateway Fee</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.85rem' }}>
                ₹0.00 (FREE)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Payment Source</span>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.name}
              </span>
            </div>

            {description && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Note</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{description}</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Charge</span>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--brand-indigo)' }}>
                  {formatMinorUnits(minorAmount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Updated Wallet Balance</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>
                  {formatMinorUnits(currentBalance + minorAmount)}
                </span>
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
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '0.8rem',
              color: 'var(--color-success)',
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>Double-entry ledger invariant verified. Immediate availability.</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmDeposit}
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              <Sparkles size={16} /> Confirm & Deposit
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PROCESSING / SUCCESS */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
          {isProcessing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: '3px solid var(--border-default)',
                  borderTopColor: 'var(--brand-indigo)',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Verifying transaction & posting to double-entry ledger...
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
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
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
                }}
              >
                <CheckCircle2 size={40} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formatMinorUnits(minorAmount)} Added
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                  Your wallet has been updated successfully.
                </p>
              </div>

              <div
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>New Available Balance</span>
                <strong style={{ fontWeight: 800, color: 'var(--brand-indigo)', fontSize: '1.1rem' }}>
                  {formatMinorUnits(currentBalance + minorAmount)}
                </strong>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default AddFundsModal;
