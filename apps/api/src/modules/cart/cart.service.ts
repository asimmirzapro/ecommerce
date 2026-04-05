import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private itemRepo: Repository<CartItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(ProductVariant) private variantRepo: Repository<ProductVariant>,
  ) {}

  async getOrCreateCart(userId?: string, sessionId?: string): Promise<Cart> {
    let cart: Cart | null = null;

    if (userId) {
      cart = await this.cartRepo.findOne({
        where: { userId, status: 'active' },
        relations: ['items'],
      });
    } else if (sessionId) {
      cart = await this.cartRepo.findOne({
        where: { sessionId, status: 'active' },
        relations: ['items'],
      });
    }

    if (!cart) {
      cart = this.cartRepo.create({
        userId: userId || null,
        sessionId: sessionId || null,
        status: 'active',
        expiresAt: userId ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await this.cartRepo.save(cart);
      cart.items = [];
    }

    return this.enrichCart(cart);
  }

  async addItem(cartId: string, dto: AddCartItemDto): Promise<Cart> {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId, isActive: true },
      relations: ['images'],
    });
    if (!product) throw new NotFoundException('Product not found');

    let unitPrice = Number(product.price);
    if (dto.variantId) {
      const variant = await this.variantRepo.findOne({ where: { id: dto.variantId, isActive: true } });
      if (!variant) throw new NotFoundException('Variant not found');
      unitPrice += Number(variant.priceModifier);
    }

    const available = dto.variantId
      ? (await this.variantRepo.findOne({ where: { id: dto.variantId } }))?.stockQuantity || 0
      : product.stockQuantity;

    if (dto.quantity > available) {
      throw new BadRequestException(`Only ${available} items available`);
    }

    const existing = await this.itemRepo.findOne({
      where: { cartId, productId: dto.productId, variantId: (dto.variantId ?? undefined) as any },
    });

    if (existing) {
      existing.quantity += dto.quantity;
      await this.itemRepo.save(existing);
    } else {
      const item = this.itemRepo.create({
        cartId,
        productId: dto.productId,
        variantId: dto.variantId || null,
        quantity: dto.quantity,
        unitPrice,
      });
      await this.itemRepo.save(item);
    }

    return this.getCartById(cartId);
  }

  async updateItem(cartId: string, itemId: string, dto: UpdateCartItemDto): Promise<Cart> {
    const item = await this.itemRepo.findOne({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException('Cart item not found');
    item.quantity = dto.quantity;
    await this.itemRepo.save(item);
    return this.getCartById(cartId);
  }

  async removeItem(cartId: string, itemId: string): Promise<Cart> {
    const item = await this.itemRepo.findOne({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.itemRepo.remove(item);
    return this.getCartById(cartId);
  }

  async clearCart(cartId: string): Promise<void> {
    await this.itemRepo.delete({ cartId });
  }

  async mergeGuestCart(userId: string, sessionId: string): Promise<Cart> {
    const guestCart = await this.cartRepo.findOne({
      where: { sessionId, status: 'active' },
      relations: ['items'],
    });

    if (!guestCart || guestCart.items.length === 0) {
      return this.getOrCreateCart(userId);
    }

    const userCart = await this.getOrCreateCart(userId);

    for (const guestItem of guestCart.items) {
      await this.addItem(userCart.id, {
        productId: guestItem.productId,
        variantId: guestItem.variantId || undefined,
        quantity: guestItem.quantity,
      });
    }

    guestCart.status = 'merged';
    await this.cartRepo.save(guestCart);

    return this.getCartById(userCart.id);
  }

  private async getCartById(cartId: string): Promise<Cart> {
    const cart = await this.cartRepo.findOne({
      where: { id: cartId },
      relations: ['items'],
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return this.enrichCart(cart);
  }

  private async enrichCart(cart: Cart): Promise<Cart & { subtotal: number; total: number; itemCount: number }> {
    const itemsWithProducts = await Promise.all(
      cart.items.map(async item => {
        const product = await this.productRepo.findOne({
          where: { id: item.productId },
          relations: ['images'],
        });
        return { ...item, product };
      }),
    );

    const subtotal = itemsWithProducts.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );

    return {
      ...cart,
      items: itemsWithProducts as any,
      subtotal,
      total: subtotal,
      itemCount: itemsWithProducts.reduce((sum, i) => sum + i.quantity, 0),
    };
  }
}
