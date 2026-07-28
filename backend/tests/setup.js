import mongoose from 'mongoose';

beforeAll(async () => {
  process.env.LOG_LEVEL = 'silent';
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
