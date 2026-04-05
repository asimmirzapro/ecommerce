import { Controller, Post, UseInterceptors, UploadedFiles, Delete, Param } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { unlink } from 'fs/promises';
import { join } from 'path';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private service: UploadsService) {}

  @Post('images')
  @Roles('admin')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const results = await Promise.all(
      files.map(file => this.service.processImage(file.filename)),
    );
    return results;
  }

  @Delete('images/:filename')
  @Roles('admin')
  async deleteImage(@Param('filename') filename: string) {
    const uploadDir = join(process.cwd(), 'uploads');
    await unlink(join(uploadDir, filename)).catch(() => {});
    return { deleted: true };
  }
}
