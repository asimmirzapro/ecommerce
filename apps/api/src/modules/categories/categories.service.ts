import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category) private repo: Repository<Category>) {}

  async findAll() {
    const all = await this.repo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
    return this.buildTree(all);
  }

  async findOne(id: string) {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async findBySlug(slug: string) {
    const cat = await this.repo.findOne({ where: { slug } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  private buildTree(categories: Category[], parentId: string | null = null): Category[] {
    return categories
      .filter(c => c.parentId === parentId)
      .map(c => ({ ...c, children: this.buildTree(categories, c.id) }));
  }

  async create(data: Partial<Category>) {
    const cat = this.repo.create(data);
    return this.repo.save(cat);
  }

  async update(id: string, data: Partial<Category>) {
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { isActive: false });
  }
}
