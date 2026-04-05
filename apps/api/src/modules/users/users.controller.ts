import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) { return this.service.getProfile(user.id); }

  @Patch('profile')
  updateProfile(@CurrentUser() user: any, @Body() data: any) {
    return this.service.updateProfile(user.id, data);
  }

  @Get('addresses')
  getAddresses(@CurrentUser() user: any) { return this.service.getAddresses(user.id); }

  @Post('addresses')
  addAddress(@CurrentUser() user: any, @Body() data: any) {
    return this.service.addAddress(user.id, data);
  }

  @Patch('addresses/:id')
  updateAddress(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.service.updateAddress(user.id, id, data);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteAddress(user.id, id);
  }
}
