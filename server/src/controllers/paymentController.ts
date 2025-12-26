import { Request, Response } from 'express';
import db from '../models';
import { Op } from 'sequelize';

const Payment = db.Payment;

interface AuthRequest extends Request {
  userId?: string;
}

export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { payerId, payeeId, amount, currency, date, groupId, notes } = req.body;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    // Ensure the current user is either the payer or the payee
    console.log('Payment Check:', { currentUserId, payerId, payeeId });
    if (String(currentUserId) !== String(payerId) && String(currentUserId) !== String(payeeId)) {
      console.log('Payment Forbidden: ID mismatch');
      return res.status(403).json({ message: 'Forbidden: You can only create payments for yourself' });
    }

    const payment = await Payment.create({
      payerId,
      payeeId,
      amount,
      currency,
      date,
      groupId,
      notes,
    });

    // Verify user exists and get name
    const currentUser = await db.User.findByPk(currentUserId);
    const userName = currentUser?.name || 'Someone';

    // Notify the other party
    try {
      // If current user is the Payer, notify the Payee
      if (payerId === currentUserId && payeeId !== currentUserId) {
        await db.Notification.create({
          userId: payeeId,
          type: 'PAYMENT_CREATE',
          title: 'Payment Received',
          message: `${userName} paid you ${currency || '$'}${amount}.`,
          data: JSON.stringify({ paymentId: payment.id, groupId })
        });
      }
      // If current user is the Payee, notify the Payer
      else if (payeeId === currentUserId && payerId !== currentUserId) {
        await db.Notification.create({
          userId: payerId, // Notify the payer
          type: 'PAYMENT_CREATE', // Or PAYMENT_ACKNOWLEDGE
          title: 'Payment Recorded',
          message: `${userName} recorded a payment of ${currency || '$'}${amount} from you.`,
          data: JSON.stringify({ paymentId: payment.id, groupId })
        });
      }
    } catch (notifError) {
      console.error('Failed to create payment notification', notifError);
    }

    res.status(201).json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating payment' });
  }
};

export const createBatchPayments = async (req: AuthRequest, res: Response) => {
  const t = await db.sequelize.transaction();
  try {
    const { payments } = req.body; // Expects an array of payment objects
    const currentUserId = req.userId;

    if (!currentUserId) {
      await t.rollback();
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    if (!Array.isArray(payments) || payments.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid payload: payments array required' });
    }

    // Validate Authorization for ALL payments first
    for (const p of payments) {
      if (String(currentUserId) !== String(p.payerId) && String(currentUserId) !== String(p.payeeId)) {
        await t.rollback();
        return res.status(403).json({ message: 'Forbidden: You can only create payments involving yourself' });
      }
    }

    const createdPayments = await Payment.bulkCreate(payments, { transaction: t });

    await t.commit();

    // Notifications (Fire and forget, after commit)
    const currentUser = await db.User.findByPk(currentUserId);
    const userName = currentUser?.name || 'Someone';

    // Group notifications by recipient to avoid spam? 
    // Or just send one per payment. For Settle Up, usually it's multiple payments to SAME person.
    // Let's send one concise notification per payment for correctness, or one aggregate.
    // For simplicity / robustness, individual notifications are safer logic, but annoying.
    // Optimizing: "Settled all balances across X groups".
    // But generalized batch endpoint might be used for differnet things.
    // Let's stick to simple loop for now.

    for (const p of createdPayments) {
      try {
        const { payerId, payeeId, amount, currency, groupId } = p;
        if (payerId === currentUserId && payeeId !== currentUserId) {
          await db.Notification.create({
            userId: payeeId,
            type: 'PAYMENT_CREATE',
            title: 'Payment Received (Batch)',
            message: `${userName} paid you ${currency || '$'}${amount}.`,
            data: JSON.stringify({ paymentId: p.id, groupId })
          });
        } else if (payeeId === currentUserId && payerId !== currentUserId) {
          await db.Notification.create({
            userId: payerId,
            type: 'PAYMENT_CREATE',
            title: 'Payment Recorded (Batch)',
            message: `${userName} recorded a payment of ${currency || '$'}${amount} from you.`,
            data: JSON.stringify({ paymentId: p.id, groupId })
          });
        }
      } catch (e) {
        console.error("Failed to send notification for batch payment", e);
      }
    }

    res.status(201).json(createdPayments);

  } catch (error) {
    if (t) await t.rollback();
    console.error("Batch payment error", error);
    res.status(500).json({ message: 'Error processing batch payments' });
  }
};

export const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const payments = await Payment.findAll({
      where: {
        deletedAt: null,
        // Safety: Also exclude payments where groupId is in a deleted group
        [Op.or]: [
          { groupId: null }, // Non-group payments are always OK
          {
            groupId: {
              [Op.notIn]: db.sequelize.literal(`(SELECT id FROM groups WHERE deletedAt IS NOT NULL)`)
            }
          }
        ],
        [Op.and]: [
          {
            [Op.or]: [
              { payerId: currentUserId },
              { payeeId: currentUserId },
            ]
          }
        ],
      },
      order: [['date', 'DESC'], ['createdAt', 'DESC']], // Newest payments first
    });

    res.status(200).json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
};
