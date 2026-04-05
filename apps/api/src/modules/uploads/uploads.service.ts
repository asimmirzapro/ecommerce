import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import { join } from 'path';
import { promises as fsPromises } from 'fs';

@Injectable()
export class UploadsService {
  constructor(private config: ConfigService) {}

  async processImage(filename: string): Promise<{ url: string; thumbnailUrl: string }> {
    const uploadDir = join(process.cwd(), 'uploads');
    const inputPath = join(uploadDir, filename);
    const thumbFilename = `thumb_${filename.replace(/\.[^.]+$/, '.webp')}`;
    const thumbPath = join(uploadDir, thumbFilename);

    await (sharp as any)(inputPath)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    const apiBase = this.config.get('API_URL', 'http://localhost:3001');
    return {
      url: `${apiBase}/uploads/${filename}`,
      thumbnailUrl: `${apiBase}/uploads/${thumbFilename}`,
    };
  }

  async deleteImage(filename: string): Promise<void> {
    const uploadDir = join(process.cwd(), 'uploads');
    await fsPromises.unlink(join(uploadDir, filename)).catch(() => {});
    const thumb = `thumb_${filename.replace(/\.[^.]+$/, '.webp')}`;
    await fsPromises.unlink(join(uploadDir, thumb)).catch(() => {});
  }
}
