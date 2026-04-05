import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class SearchService {
  constructor(@InjectRepository(Product) private productRepo: Repository<Product>) {}

  async search(q: string, filters: { category?: string; minPrice?: number; maxPrice?: number; sort?: string; page?: number; limit?: number }) {
    const { category, minPrice, maxPrice, sort = 'newest', page = 1, limit = 20 } = filters;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'images')
      .leftJoinAndSelect('p.category', 'category')
      .where('p.isActive = true');

    if (q) {
      qb.andWhere(
        `to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.shortDescription, '')) @@ plainto_tsquery('english', :q)`,
        { q },
      );
    }
    if (category) qb.andWhere('category.slug = :category', { category });
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
    const items = await qb.skip((page - 1) * limit).take(limit).getMany();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async suggestions(q: string) {
    if (!q || q.length < 2) return [];
    const results = await this.productRepo
      .createQueryBuilder('p')
      .select(['p.id', 'p.name', 'p.slug'])
      .where('p.isActive = true')
      .andWhere('LOWER(p.name) LIKE LOWER(:q)', { q: `%${q}%` })
      .orderBy('p.soldCount', 'DESC')
      .take(8)
      .getMany();
    return results.map(p => ({ id: p.id, name: p.name, slug: p.slug }));
  }
}
