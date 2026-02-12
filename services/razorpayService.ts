
import { storageService } from './storage';

export const razorpayService = {
  async capturePayment(paymentId: string, amount: number): Promise<boolean> {
    const settings = await storageService.getAdminSettings();
    try {
      const res = await fetch('/api/razorpay-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'capture',
          paymentId,
          amount: Math.round(amount * 100),
          keyId: settings.payment.keyId,
          keySecret: settings.payment.keySecret
        })
      });
      const data = await res.json();
      return data.status === 'captured' || res.ok;
    } catch (e) {
      console.error("Capture failed", e);
      return false;
    }
  },

  async refundPayment(paymentId: string, amount: number): Promise<boolean> {
    const settings = await storageService.getAdminSettings();
    try {
      const res = await fetch('/api/razorpay-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refund',
          paymentId,
          amount: Math.round(amount * 100),
          keyId: settings.payment.keyId,
          keySecret: settings.payment.keySecret
        })
      });
      const data = await res.json();
      return data.status === 'processed' || res.ok;
    } catch (e) {
      console.error("Refund failed", e);
      return false;
    }
  }
};
