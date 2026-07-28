import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    senderAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Sender account ID is required'],
      index: true,
    },
    receiverAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Receiver account ID is required'],
      index: true,
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
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'FLAGGED', 'REVERSED'],
        message: 'Invalid transaction status',
      },
      default: 'PENDING',
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required'],
      unique: true,
      index: true,
      trim: true,
    },
    riskScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    failureReason: {
      type: String,
      default: null,
    },
    fraudFlags: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: null,
      maxlength: 255,
    },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({ senderAccountId: 1, createdAt: -1 });
transactionSchema.index({ receiverAccountId: 1, createdAt: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
