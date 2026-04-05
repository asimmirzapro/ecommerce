import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('admin')
@Controller('admin/reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('kpi')
  getKpi() { return this.service.getKpiDashboard(); }

  @Get('sales')
  getSales(@Query('from') from: string, @Query('to') to: string) {
    return this.service.getSalesReport(from || new Date(Date.now() - 30*24*60*60*1000).toISOString(), to || new Date().toISOString());
  }

  @Get('products')
  getTopProducts() { return this.service.getTopProducts(); }

  @Get('low-stock')
  getLowStock() { return this.service.getLowStockProducts(); }
}
