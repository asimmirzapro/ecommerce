import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductQueryDto } from './dto/product-query.dto';

export interface BulkImportImage {
  url: string;
  altText?: string;
  isPrimary?: boolean;
}

export interface BulkImportItem {
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  description?: string;
  shortDescription?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  weight?: number | null;
  attributes?: Record<string, unknown>;
  isFeatured?: boolean;
  isActive?: boolean;
  images?: BulkImportImage[];
}

export interface BulkImportResult {
  sku: string;
  name: string;
  success: boolean;
  id?: string;
  error?: string;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private repo: Repository<Product>,
    @InjectRepository(ProductImage) private imageRepo: Repository<ProductImage>,
  ) {}

  async findAll(query: ProductQueryDto) {
    const { q, category, minPrice, maxPrice, sort, page = 1, limit = 20 } = query;
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'images')
      .leftJoinAndSelect('p.category', 'category')
      .where('p.isActive = true');

    if (q) {
      qb.andWhere(
        `to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', :q)`,
        { q },
      );
    }
    if (category) {
      qb.andWhere('category.slug = :category', { category });
    }
    if (minPrice !== undefined) qb.andWhere('p.price >= :minPrice', { minPrice });
    if (maxPrice !== undefined) qb.andWhere('p.price <= :maxPrice', { maxPrice });

    switch (sort) {
      case 'price_asc': qb.orderBy('p.price', 'ASC'); break;
      case 'price_desc': qb.orderBy('p.price', 'DESC'); break;
      case 'rating': qb.orderBy('p.averageRating', 'DESC'); break;
      case 'popularity': qb.orderBy('p.soldCount', 'DESC'); break;
      default: qb.orderBy('p.createdAt', 'DESC');
    }

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const items = await qb.getMany();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllAdmin(query: { page?: number; limit?: number; search?: string; category?: string; status?: string }) {
    const { page = 1, limit = 20, search, category, status } = query;
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'images')
      .leftJoinAndSelect('p.category', 'category');

    if (search) {
      qb.andWhere('(LOWER(p.name) LIKE :s OR LOWER(p.sku) LIKE :s)', { s: `%${search.toLowerCase()}%` });
    }
    if (category) {
      qb.andWhere('category.slug = :category', { category });
    }
    if (status === 'active') qb.andWhere('p.isActive = true');
    else if (status === 'inactive') qb.andWhere('p.isActive = false');

    qb.orderBy('p.createdAt', 'DESC');
    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const items = await qb.getMany();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findFeatured() {
    return this.repo.find({
      where: { isFeatured: true, isActive: true },
      relations: ['images', 'category'],
      order: { soldCount: 'DESC' },
      take: 8,
    });
  }

  async findTrending() {
    return this.repo.find({
      where: { isActive: true },
      relations: ['images'],
      order: { soldCount: 'DESC' },
      take: 8,
    });
  }

  async findRelated(categoryIds: string[], excludeProductIds: string[], limit = 6) {
    if (!categoryIds.length) return [];
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.isActive = true')
      .andWhere('p.categoryId IN (:...categoryIds)', { categoryIds })
      .orderBy('p.soldCount', 'DESC')
      .take(limit);
    if (excludeProductIds.length) {
      qb.andWhere('p.id NOT IN (:...excludeProductIds)', { excludeProductIds });
    }
    return qb.getMany();
  }

  async findDeals() {
    return this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.isActive = true')
      .andWhere('p.compareAtPrice IS NOT NULL')
      .andWhere('p.compareAtPrice > p.price')
      .addSelect('p.compareAtPrice - p.price', 'discount_amt')
      .orderBy('discount_amt', 'DESC')
      .take(12)
      .getMany();
  }

  async findBySlug(slug: string) {
    const product = await this.repo.findOne({
      where: { slug, isActive: true },
      relations: ['images', 'variants', 'category'],
    });
    if (!product) throw new NotFoundException('Product not found');
    await this.repo.increment({ id: product.id }, 'viewCount', 1);
    return product;
  }

  async findById(id: string) {
    const product = await this.repo.findOne({
      where: { id },
      relations: ['images', 'variants', 'category'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (true) {
      const qb = this.repo.createQueryBuilder('p').where('p.slug = :slug', { slug });
      if (excludeId) qb.andWhere('p.id != :id', { id: excludeId });
      const existing = await qb.getOne();
      if (!existing) return slug;
      slug = `${base}-${counter++}`;
    }
  }

  async createProduct(data: BulkImportItem): Promise<Product> {
    const baseSlug = this.generateSlug(data.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const product = this.repo.create({
      categoryId: data.categoryId,
      sku: data.sku,
      name: data.name,
      slug,
      description: data.description ?? null,
      shortDescription: data.shortDescription ?? null,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      costPrice: data.costPrice ?? null,
      stockQuantity: data.stockQuantity ?? 0,
      lowStockThreshold: data.lowStockThreshold ?? 5,
      weight: data.weight ?? null,
      attributes: data.attributes ?? {},
      isFeatured: data.isFeatured ?? false,
      isActive: data.isActive ?? false,
    });
    const saved = await this.repo.save(product);

    if (data.images?.length) {
      await this.saveImages(saved.id, data.images);
    }
    return this.findById(saved.id);
  }

  async updateProduct(id: string, data: Partial<BulkImportItem> & { slug?: string }): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    if (data.name && data.name !== product.name) {
      const baseSlug = this.generateSlug(data.name);
      data.slug = await this.ensureUniqueSlug(baseSlug, id);
    }

    const { images, ...productData } = data;
    Object.assign(product, productData);
    await this.repo.save(product);

    if (images !== undefined) {
      await this.imageRepo.delete({ productId: id });
      if (images.length) await this.saveImages(id, images);
    }
    return this.findById(id);
  }

  private async saveImages(productId: string, images: BulkImportImage[]) {
    const entities = images.map((img, i) =>
      this.imageRepo.create({
        productId,
        url: img.url,
        altText: img.altText ?? null,
        isPrimary: img.isPrimary ?? i === 0,
        sortOrder: i,
      }),
    );
    await this.imageRepo.save(entities);
  }

  async bulkImport(items: BulkImportItem[]): Promise<BulkImportResult[]> {
    const results: BulkImportResult[] = [];
    for (const item of items) {
      try {
        const existing = await this.repo.findOne({ where: { sku: item.sku } });
        if (existing) {
          const updated = await this.updateProduct(existing.id, item);
          results.push({ sku: item.sku, name: item.name, success: true, id: updated.id });
        } else {
          const created = await this.createProduct(item);
          results.push({ sku: item.sku, name: item.name, success: true, id: created.id });
        }
      } catch (err) {
        results.push({ sku: item.sku, name: item.name, success: false, error: (err as Error).message });
      }
    }
    return results;
  }

  async bulkSetStatus(ids: string[], isActive: boolean) {
    await this.repo.createQueryBuilder()
      .update(Product)
      .set({ isActive })
      .whereInIds(ids)
      .execute();
    return { updated: ids.length };
  }

  async create(data: Partial<Product>) {
    const product = this.repo.create(data);
    return this.repo.save(product);
  }

  async update(id: string, data: Partial<Product>) {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, data);
    return this.repo.save(product);
  }

  async remove(id: string) {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    await this.repo.update(id, { isActive: false });
  }
}
