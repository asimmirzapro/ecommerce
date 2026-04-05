import { Injectable, BadRequestException, RawBodyRequest } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment } from './payment.entity';
import { OrdersService } from '../orders/orders.service';
import { Request } from 'express';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    private ordersService: OrdersService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY', ''), { apiVersion: '2023-10-16' });
  }

  async createPaymentIntent(orderId: string) {
    const order = await this.ordersService.findOne(orderId);
    const amountCents = Math.round(Number(order.totalAmount) * 100);

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: order.currency.toLowerCase(),
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });

    const payment = this.paymentRepo.create({
      orderId: order.id,
      stripePaymentIntentId: intent.id,
      amount: order.totalAmount,
      currency: order.currency,
      status: 'pending',
    });
    await this.paymentRepo.save(payment);

    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  }

  async handleWebhook(req: RawBodyRequest<Request>) {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET', '');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(req.rawBody!, sig, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.paymentRepo.update(
        { stripePaymentIntentId: intent.id },
        { status: 'succeeded', stripeChargeId: intent.latest_charge as string },
      );
      const orderId = intent.metadata.orderId;
      if (orderId) await this.ordersService.updateStatus(orderId, 'confirmed');
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.paymentRepo.update(
        { stripePaymentIntentId: intent.id },
        { status: 'failed', failureReason: intent.last_payment_error?.message || 'Payment failed' },
      );
      const orderId = intent.metadata.orderId;
      if (orderId) await this.ordersService.updateStatus(orderId, 'payment_failed');
    }

    return { received: true };
  }

  async createRefund(stripePaymentIntentId: string, amount?: number) {
    const payment = await this.paymentRepo.findOne({ where: { stripePaymentIntentId } });
    if (!payment?.stripeChargeId) throw new BadRequestException('No charge found for this payment');

    const refundParams: Stripe.RefundCreateParams = { charge: payment.stripeChargeId };
    if (amount) refundParams.amount = Math.round(amount * 100);

    return this.stripe.refunds.create(refundParams);
  }
}
