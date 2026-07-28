import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Transaction ID is required'],
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['DEBIT', 'CREDIT'],
        message: 'Ledger entry type must be DEBIT or CREDIT',
      },
      required: [true, 'Ledger entry type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than zero'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer (in minor units)',
      },
    },
    balanceAfter: {
      type: Number,
      required: [true, 'Balance after is required'],
      validate: {
        validator: Number.isInteger,
        message: 'Balance after must be an integer (in minor units)',
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

ledgerEntrySchema.index({ accountId: 1, createdAt: -1 });

export const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
export default LedgerEntry;
