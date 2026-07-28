import Transaction from '../models/Transaction.model.js';
import auditLogRepository from '../repositories/auditLog.repository.js';

export class FraudService {
  /**
   * Evaluate fraud risk for a transfer request based on rule heuristics.
   *
   * @param {Object} params
   * @param {Object} params.senderAccount Sender Account document
   * @param {Object} params.receiverAccount Receiver Account document
   * @param {number} params.amount Transfer amount in minor units
   * @param {string} [params.currency='INR'] Currency code
   * @returns {Promise<Object>} Object containing { decision: 'ALLOW'|'FLAG'|'BLOCK', riskScore: number, rulesTriggered: Array<string> }
   */
  async evaluateTransactionRisk({ senderAccount, receiverAccount, amount }) {
    const rulesTriggered = [];
    let riskScore = 0;

    // Rule 1: Inactive or frozen/blocked account status
    if (
      senderAccount.status === 'frozen' ||
      senderAccount.status === 'blocked' ||
      senderAccount.status !== 'active'
    ) {
      rulesTriggered.push('ACCOUNT_BLOCKED');
      riskScore = 100;
    }

    if (
      receiverAccount.status === 'frozen' ||
      receiverAccount.status === 'blocked' ||
      receiverAccount.status !== 'active'
    ) {
      rulesTriggered.push('RECEIVER_ACCOUNT_BLOCKED');
      riskScore = 100;
    }

    if (riskScore < 100) {
      // Rule 2: High Transfer Amount Threshold (>= 100,000 minor units = 1,000.00 INR)
      const HIGH_AMOUNT_THRESHOLD = 100000;
      if (amount >= HIGH_AMOUNT_THRESHOLD) {
        riskScore += 40;
        rulesTriggered.push('HIGH_TRANSFER_AMOUNT');
      }

      // Rule 3: Velocity Limit (> 5 transfers within past 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentTransfersCount = await Transaction.countDocuments({
        senderAccountId: senderAccount._id,
        status: { $in: ['COMPLETED', 'PROCESSING', 'PENDING'] },
        createdAt: { $gte: oneHourAgo },
      });

      if (recentTransfersCount >= 5) {
        riskScore += 40;
        rulesTriggered.push('VELOCITY_LIMIT_EXCEEDED');
      }

      // Rule 4: Daily Cumulative Volume Threshold (>= 500,000 minor units in 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyTransactions = await Transaction.find({
        senderAccountId: senderAccount._id,
        status: { $in: ['COMPLETED', 'PROCESSING', 'PENDING'] },
        createdAt: { $gte: twentyFourHoursAgo },
      });

      const dailySum = dailyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const DAILY_VOLUME_LIMIT = 500000;

      if (dailySum + amount >= DAILY_VOLUME_LIMIT) {
        riskScore += 30;
        rulesTriggered.push('DAILY_VOLUME_EXCEEDED');
      }
    }

    // Determine final verdict
    let decision = 'ALLOW';
    if (riskScore >= 80) {
      decision = 'BLOCK';
    } else if (riskScore >= 50) {
      decision = 'FLAG';
    }

    // Persist decision in Audit Log
    try {
      await auditLogRepository.create({
        actorId: senderAccount.userId,
        action: 'FRAUD_EVALUATION',
        targetType: 'Account',
        targetId: senderAccount._id,
        metadata: {
          decision,
          riskScore,
          rulesTriggered,
          senderAccountId: senderAccount._id.toString(),
          receiverAccountId: receiverAccount._id.toString(),
          amount,
        },
      });
    } catch {
      // Audit log creation failure should not break critical path
    }

    return {
      decision,
      riskScore,
      rulesTriggered,
    };
  }
}

export default new FraudService();
