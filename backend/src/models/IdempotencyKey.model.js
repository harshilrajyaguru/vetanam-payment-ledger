import mongoose from 'mongoose';

const idempotencyKeySchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: [true, 'Idempotency key is required'],
      trim: true,
    },
    requestHash: {
      type: String,
      required: [true, 'Request hash is required'],
      trim: true,
    },
    responseSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['IN_PROGRESS', 'COMPLETED'],
        message: 'Invalid idempotency key status',
      },
      default: 'IN_PROGRESS',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: { expires: 0 },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    _id: false,
  },
);

export const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencyKeySchema);
export default IdempotencyKey;
