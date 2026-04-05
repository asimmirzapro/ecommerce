import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Public()
  @Get()
  findAll(@Query() query: ProductQueryDto) { return this.service.findAll(query); }

  @Public()
  @Get('featured')
  findFeatured() { return this.service.findFeatured(); }

  @Public()
  @Get('trending')
  findTrending() { return this.service.findTrending(); }

  @Public()
  @Get('deals')
  findDeals() { return this.service.findDeals(); }

  @Public()
  @Get('related')
  findRelated(
    @Query('categoryIds') categoryIds: string,
    @Query('exclude') exclude: string,
    @Query('limit') limit?: string,
  ) {
    const ids = categoryIds ? categoryIds.split(',').filter(Boolean) : [];
    const excludeIds = exclude ? exclude.split(',').filter(Boolean) : [];
    return this.service.findRelated(ids, excludeIds, limit ? parseInt(limit, 10) : 6);
  }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) { return this.service.findBySlug(slug); }
}
