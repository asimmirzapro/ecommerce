import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProductsService, BulkImportItem } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';
import { OrdersService } from '../orders/orders.service';
import { ReturnsService } from '../returns/returns.service';
import { PromotionsService } from '../promotions/promotions.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class UpdateOrderStatusDto {
  @ApiProperty() @IsString() status: string;
}

class UpdateReturnDto {
  @ApiProperty() @IsEnum(['approved','rejected','received','refunded']) status: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() adminNotes?: string;
}

class BulkImageDto {
  @IsString() url: string;
  @IsOptional() @IsString() altText?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

class BulkImportItemDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() sku: string;
  @IsString() @IsNotEmpty() categorySlug: string;
  @IsNumber() @Type(() => Number) price: number;
  @IsOptional() @IsNumber() @Type(() => Number) compareAtPrice?: number;
  @IsOptional() @IsNumber() @Type(() => Number) costPrice?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsNumber() @Type(() => Number) stockQuantity?: number;
  @IsOptional() @IsNumber() @Type(() => Number) lowStockThreshold?: number;
  @IsOptional() @IsNumber() @Type(() => Number) weight?: number;
  @IsOptional() attributes?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() images?: BulkImageDto[];
}

class BulkImportDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => BulkImportItemDto) items: BulkImportItemDto[];
  @IsOptional() @IsBoolean() publishAll?: boolean;
}

class BulkPublishDto {
  @IsArray() @IsString({ each: true }) ids: string[];
  @IsBoolean() isActive: boolean;
}

class UpsertProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsNumber() @Type(() => Number) price?: number;
  @IsOptional() @IsNumber() @Type(() => Number) compareAtPrice?: number;
  @IsOptional() @IsNumber() @Type(() => Number) costPrice?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsNumber() @Type(() => Number) stockQuantity?: number;
  @IsOptional() @IsNumber() @Type(() => Number) lowStockThreshold?: number;
  @IsOptional() @IsNumber() @Type(() => Number) weight?: number;
  @IsOptional() attributes?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() images?: BulkImageDto[];
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private ordersService: OrdersService,
    private returnsService: ReturnsService,
    private promotionsService: PromotionsService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // ── Products ──────────────────────────────────────────────────────────
  @Get('products')
  getProducts(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.productsService.findAllAdmin({
      page: Number(page), limit: Number(limit), search, category, status,
    });
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post('products')
  async createProduct(@Body() dto: UpsertProductDto) {
    const categoryId = await this.resolveCategoryId(dto.categorySlug);
    return this.productsService.createProduct({ ...dto, categoryId } as BulkImportItem);
  }

  @Patch('products/bulk-publish')
  bulkPublish(@Body() dto: BulkPublishDto) {
    return this.productsService.bulkSetStatus(dto.ids, dto.isActive);
  }

  @Patch('products/:id')
  async updateProduct(@Param('id') id: string, @Body() dto: UpsertProductDto) {
    const update: Partial<BulkImportItem> = { ...dto };
    if (dto.categorySlug) {
      update.categoryId = await this.resolveCategoryId(dto.categorySlug);
    }
    return this.productsService.updateProduct(id, update);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Post('products/bulk-import')
  async bulkImport(@Body() dto: BulkImportDto) {
    // Resolve all category slugs up front
    const categories = await this.categoriesService.findAll();
    const catMap = new Map<string, string>();
    const flatCats = (cats: any[]): any[] => cats.flatMap(c => [c, ...flatCats(c.children || [])]);
    for (const cat of flatCats(categories as any[])) {
      catMap.set(cat.slug, cat.id);
    }

    const items: BulkImportItem[] = [];
    const errors: { sku: string; error: string }[] = [];

    for (const item of dto.items) {
      const categoryId = catMap.get(item.categorySlug);
      if (!categoryId) {
        errors.push({ sku: item.sku, error: `Category '${item.categorySlug}' not found` });
        continue;
      }
      items.push({
        ...item,
        categoryId,
        isActive: dto.publishAll ? true : (item.isActive ?? false),
      });
    }

    const results = await this.productsService.bulkImport(items);
    return {
      results: [...results, ...errors.map(e => ({ ...e, name: e.sku, success: false }))],
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length + errors.length,
    };
  }

  // ── Orders ────────────────────────────────────────────────────────────
  @Get('orders')
  getOrders(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    return this.ordersService.findAll(Number(page), Number(limit), status);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  // ── Customers ─────────────────────────────────────────────────────────
  @Get('customers')
  async getCustomers(@Query('page') page = 1, @Query('limit') limit = 20) {
    const [items, total] = await this.userRepo.findAndCount({
      where: { role: 'customer' },
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    return { items, total };
  }

  @Get('customers/:id')
  getCustomer(@Param('id') id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  @Patch('customers/:id')
  updateCustomer(@Param('id') id: string, @Body() data: Partial<User>) {
    return this.userRepo.update(id, data);
  }

  // ── Returns ───────────────────────────────────────────────────────────
  @Get('returns')
  getReturns(@Query('page') page = 1) {
    return this.returnsService.findAll(Number(page));
  }

  @Patch('returns/:id')
  updateReturn(@Param('id') id: string, @Body() dto: UpdateReturnDto) {
    return this.returnsService.updateStatus(id, dto.status, dto.adminNotes);
  }

  // ── Categories ────────────────────────────────────────────────────────
  @Get('categories')
  getCategories() {
    return this.categoriesService.findAll();
  }

  @Post('categories')
  createCategory(@Body() data: any) {
    return this.categoriesService.create(data);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() data: any) {
    return this.categoriesService.update(id, data);
  }

  // ── Promotions ────────────────────────────────────────────────────────
  @Get('promotions')
  getPromotions() {
    return this.promotionsService.findAll();
  }

  @Post('promotions')
  createPromotion(@Body() data: any) {
    return this.promotionsService.create(data);
  }

  @Patch('promotions/:id')
  updatePromotion(@Param('id') id: string, @Body() data: any) {
    return this.promotionsService.update(id, data);
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private async resolveCategoryId(slug?: string): Promise<string> {
    if (!slug) throw new BadRequestException('categorySlug is required');
    const categories = await this.categoriesService.findAll();
    const flatCats = (cats: any[]): any[] => cats.flatMap(c => [c, ...flatCats(c.children || [])]);
    const cat = flatCats(categories as any[]).find(c => c.slug === slug);
    if (!cat) throw new BadRequestException(`Category '${slug}' not found`);
    return cat.id;
  }
}
