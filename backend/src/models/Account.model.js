import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    currency: {
      type: String,
      default: 'INR',
      required: [true, 'Currency is required'],
      uppercase: true,
      trim: true,
    },
    cachedBalance: {
      type: Number,
      required: [true, 'Cached balance is required'],
      default: 0,
      min: [0, 'Cached balance cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Balance must be an integer (in minor units)',
      },
    },
    version: {
      type: Number,
      default: 0,
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'frozen'],
        message: 'Status must be either active or frozen',
      },
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
    // Disable Mongoose's built-in __v versioning to avoid conflict with our manual version field
    versionKey: false,
  },
);

export const Account = mongoose.model('Account', accountSchema);
export default Account;
