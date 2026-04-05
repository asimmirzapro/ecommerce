import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Public()
  @Get()
  findAll() { return this.service.findAll(); }

  @Public()
  @Get(':slug/products')
  getCategoryProducts(@Param('slug') slug: string) {
    return { slug, message: 'Use /products?category=slug' };
  }
}
