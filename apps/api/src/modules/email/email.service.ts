import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private from: string;

  private configured: boolean;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY', '');
    this.configured = !!apiKey && !apiKey.startsWith('re_...');
    this.resend = new Resend(apiKey || 'placeholder');
    this.from = config.get('EMAIL_FROM', 'noreply@store.com');
    if (!this.configured) {
      this.logger.warn('RESEND_API_KEY not configured — emails will not be sent');
    }
  }

  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    items: Array<{ productName: string; quantity: number; unitPrice: number; totalPrice: number; imageUrl?: string | null }>,
    subtotal: number,
    shippingCost: number,
    taxAmount: number,
    totalAmount: number,
  ) {
    if (!this.configured) {
      this.logger.warn(`Email skipped (not configured): order confirmation for ${orderNumber} to ${to}`);
      return;
    }
    try {
      const isPublicUrl = (url?: string | null) =>
        !!url && !url.includes('localhost') && !url.includes('127.0.0.1');

      const itemRows = items.map(item => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">
            <div style="display:flex;align-items:center;gap:10px">
              ${isPublicUrl(item.imageUrl)
                ? `<img src="${item.imageUrl}" alt="${item.productName}" width="40" height="40" style="width:40px;height:40px;object-fit:cover;border-radius:4px;flex-shrink:0" />`
                : ''
              }
              <span>${item.productName}</span>
            </div>
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;vertical-align:middle">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;vertical-align:middle">$${Number(item.unitPrice).toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;vertical-align:middle">$${Number(item.totalPrice).toFixed(2)}</td>
        </tr>`).join('');

      await this.resend.emails.send({
        from: this.from,
        to,
        subject: `Order Confirmed - ${orderNumber}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h1 style="color:#1a1a2e">Thank you for your order!</h1>
            <p>Your order <strong>${orderNumber}</strong> has been confirmed and is being processed.</p>
            <h2 style="margin-top:24px;font-size:16px;color:#444">Order Summary</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr style="background:#f5f5f5">
                  <th style="padding:8px;text-align:left">Item</th>
                  <th style="padding:8px;text-align:center">Qty</th>
                  <th style="padding:8px;text-align:right">Unit Price</th>
                  <th style="padding:8px;text-align:right">Total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <table style="width:100%;margin-top:16px;font-size:14px">
              <tr><td style="padding:4px 8px;color:#666">Subtotal</td><td style="padding:4px 8px;text-align:right">$${Number(subtotal).toFixed(2)}</td></tr>
              <tr><td style="padding:4px 8px;color:#666">Shipping</td><td style="padding:4px 8px;text-align:right">$${Number(shippingCost).toFixed(2)}</td></tr>
              <tr><td style="padding:4px 8px;color:#666">Tax</td><td style="padding:4px 8px;text-align:right">$${Number(taxAmount).toFixed(2)}</td></tr>
              <tr style="font-weight:bold;font-size:16px;border-top:2px solid #eee">
                <td style="padding:8px">Total</td>
                <td style="padding:8px;text-align:right;color:#f97316">$${Number(totalAmount).toFixed(2)}</td>
              </tr>
            </table>
            <p style="margin-top:24px;color:#666">We'll send you another email when your order ships.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send order confirmation email', err);
    }
  }

  async sendOrderCancellation(
    to: string,
    orderNumber: string,
    items: Array<{ productName: string; quantity: number; totalPrice: number; imageUrl?: string | null }>,
    totalAmount: number,
  ) {
    if (!this.configured) {
      this.logger.warn(`Email skipped (not configured): order cancellation for ${orderNumber} to ${to}`);
      return;
    }
    try {
      const isPublicUrl = (url?: string | null) =>
        !!url && !url.includes('localhost') && !url.includes('127.0.0.1');

      const itemRows = items.map(item => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">
            <div style="display:flex;align-items:center;gap:10px">
              ${isPublicUrl(item.imageUrl)
                ? `<img src="${item.imageUrl}" alt="${item.productName}" width="40" height="40" style="width:40px;height:40px;object-fit:cover;border-radius:4px;flex-shrink:0" />`
                : ''
              }
              <span>${item.productName}</span>
            </div>
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;vertical-align:middle">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;vertical-align:middle">$${Number(item.totalPrice).toFixed(2)}</td>
        </tr>`).join('');

      await this.resend.emails.send({
        from: this.from,
        to,
        subject: `Order Cancelled - ${orderNumber}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h1 style="color:#dc2626">Your order has been cancelled</h1>
            <p>Order <strong>${orderNumber}</strong> has been successfully cancelled. If you paid for this order, a refund will be processed within 5–10 business days.</p>
            <h2 style="margin-top:24px;font-size:16px;color:#444">Cancelled Items</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr style="background:#f5f5f5">
                  <th style="padding:8px;text-align:left">Item</th>
                  <th style="padding:8px;text-align:center">Qty</th>
                  <th style="padding:8px;text-align:right">Total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <table style="width:100%;margin-top:16px;font-size:14px">
              <tr style="font-weight:bold;font-size:16px;border-top:2px solid #eee">
                <td style="padding:8px">Order Total</td>
                <td style="padding:8px;text-align:right;color:#dc2626">$${Number(totalAmount).toFixed(2)}</td>
              </tr>
            </table>
            <p style="margin-top:24px;color:#666">If you have any questions, please contact our support team.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send order cancellation email', err);
    }
  }

  async sendPromotion(to: string, subject: string, html: string) {
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error('Failed to send promotion email', err);
    }
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Reset Your Password',
        html: `
          <h1>Password Reset</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This link expires in 1 hour.</p>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send password reset email', err);
    }
  }
}
