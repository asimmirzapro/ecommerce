import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './promotion.entity';

@Injectable()
export class PromotionsService {
  constructor(@InjectRepository(Promotion) private repo: Repository<Promotion>) {}

  async findActive() {
    const now = new Date();
    return this.repo.createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.startsAt <= :now', { now })
      .andWhere('(p.expiresAt IS NULL OR p.expiresAt > :now)', { now })
      .andWhere('(p.usageLimit IS NULL OR p.usedCount < p.usageLimit)')
      .getMany();
  }

  async validateCode(code: string) {
    const promo = await this.repo.findOne({ where: { code, isActive: true } });
    if (!promo) throw new NotFoundException('Promotion code not found');
    const now = new Date();
    if (promo.startsAt > now) throw new BadRequestException('Promotion not yet active');
    if (promo.expiresAt && promo.expiresAt < now) throw new BadRequestException('Promotion expired');
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) throw new BadRequestException('Promotion usage limit reached');
    return promo;
  }

  calculateDiscount(promo: Promotion, subtotal: number): number {
    if (promo.minOrderAmount && subtotal < Number(promo.minOrderAmount)) return 0;
    let discount = 0;
    if (promo.type === 'percentage') discount = subtotal * (Number(promo.value) / 100);
    else if (promo.type === 'fixed_amount') discount = Number(promo.value);
    if (promo.maxDiscount) discount = Math.min(discount, Number(promo.maxDiscount));
    return Math.min(discount, subtotal);
  }

  async create(data: Partial<Promotion>) {
    const p = this.repo.create(data);
    return this.repo.save(p);
  }

  async update(id: string, data: Partial<Promotion>) {
    await this.repo.update(id, data);
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Promotion not found');
    return p;
  }

  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }
}
