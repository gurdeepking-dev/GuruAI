
import type { VercelRequest, VercelResponse } from '@vercel/node';
// FIX: Explicitly importing Buffer from 'buffer' to resolve naming error in Vercel functions
import { Buffer } from 'buffer';

/**
 * Razorpay Management Proxy
 * Handles server-side Capture and Refund to ensure payment safety.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action, paymentId, amount, keyId, keySecret } = req.body;

  if (!keyId || !keySecret) {
    return res.status(400).json({ error: 'Razorpay credentials missing' });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  try {
    if (action === 'capture') {
      console.log(`[RazorpayProxy] Capturing payment ${paymentId} for ${amount}`);
      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, currency: 'INR' })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    if (action === 'refund') {
      console.log(`[RazorpayProxy] Refunding payment ${paymentId}`);
      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, speed: 'normal' })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
