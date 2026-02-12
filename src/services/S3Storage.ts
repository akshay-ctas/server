import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { FileData, FileStorage } from '../types/storage.js';
import createHttpError from 'http-errors';

export class S3Storage implements FileStorage {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    });
  }

  async upload(data: FileData): Promise<void> {
    const objectParams = {
      Bucket: process.env.S3_BUCKET_NAME as string,
      Key: data.filename,
      Body: Buffer.isBuffer(data.fileData)
        ? data.fileData
        : Buffer.from(data.fileData),
    };
    this.client.send(new PutObjectCommand(objectParams));
  }
  async delete(fileName: string): Promise<void> {
    const objectParams = {
      Bucket: process.env.S3_BUCKET_NAME as string,
      Key: fileName,
    };

    await this.client.send(new DeleteObjectCommand(objectParams));
  }
  getObjectURI(fileName: string): string {
    const bucket = process.env.S3_BUCKET_NAME as string;
    const region = process.env.S3_REGION;

    if (typeof bucket === 'string' && typeof region === 'string') {
      return `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
    }
    const error = createHttpError(500, 'Invalid s3 configuration');
    throw error;
  }
}
