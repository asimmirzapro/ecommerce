import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Address } from './address.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Address) private addressRepo: Repository<Address>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: Partial<User>) {
    await this.userRepo.update(userId, data);
    return this.getProfile(userId);
  }

  async getAddresses(userId: string) {
    return this.addressRepo.find({ where: { userId }, order: { isDefault: 'DESC' } });
  }

  async addAddress(userId: string, data: Partial<Address>) {
    if (data.isDefault) {
      await this.addressRepo.update({ userId }, { isDefault: false });
    }
    const address = this.addressRepo.create({ ...data, userId });
    return this.addressRepo.save(address);
  }

  async updateAddress(userId: string, addressId: string, data: Partial<Address>) {
    const address = await this.addressRepo.findOne({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    if (data.isDefault) await this.addressRepo.update({ userId }, { isDefault: false });
    Object.assign(address, data);
    return this.addressRepo.save(address);
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.addressRepo.findOne({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    await this.addressRepo.remove(address);
  }
}
