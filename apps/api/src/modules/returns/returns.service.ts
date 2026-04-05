import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReturnRequest } from './return-request.entity';

@Injectable()
export class ReturnsService {
  constructor(@InjectRepository(ReturnRequest) private repo: Repository<ReturnRequest>) {}

  async create(userId: string, data: Partial<ReturnRequest>) {
    const request = this.repo.create({ ...data, userId });
    return this.repo.save(request);
  }

  async findOne(id: string) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Return request not found');
    return r;
  }

  async findUserReturns(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findAll(page = 1, limit = 20) {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async updateStatus(id: string, status: string, adminNotes?: string) {
    await this.repo.update(id, { status, ...(adminNotes ? { adminNotes } : {}) });
    return this.findOne(id);
  }
}
