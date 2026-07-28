import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Transaction ID is required'],
    },
    type: {
      type: String,
      enum: {
        values: [
          'TXN_COMPLETED',
          'TXN_FAILED',
          'TXN_FLAGGED',
          'TRANSFER_RECEIVED',
          'TRANSACTION_SUCCESS',
          'ACCOUNT_DEPOSIT',
        ],
        message: 'Invalid notification type',
      },
      required: [true, 'Notification type is required'],
    },
    read: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
