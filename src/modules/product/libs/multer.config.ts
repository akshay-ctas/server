import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

export class MulterConfig {
  private static readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  private static readonly MAX_SIZE = 5 * 1024 * 1024;

  private static fileFilter(
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) {
    if (MulterConfig.ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP, GIF allowed'));
    }
  }

  static getUpload() {
    return multer({
      storage: multer.memoryStorage(),
      fileFilter: MulterConfig.fileFilter,
      limits: { fileSize: MulterConfig.MAX_SIZE },
    });
  }
}

export const upload = MulterConfig.getUpload();
