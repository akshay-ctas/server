import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export class S3Service {
  private client: S3Client;
  private bucket: string;
  private cdnUrl: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.bucket = process.env.AWS_S3_BUCKET!;
    this.cdnUrl = `https://${this.bucket}.s3.amazonaws.com`;
  }

  async upload(
    file: Express.Multer.File,
    folder = 'products'
  ): Promise<string> {
    const ext = path.extname(file.originalname);
    const filename = `${folder}/${uuidv4()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    return `${this.cdnUrl}/${filename}`;
  }

  async uploadMany(
    files: Express.Multer.File[],
    folder = 'products'
  ): Promise<string[]> {
    return Promise.all(files.map((f) => this.upload(f, folder)));
  }

  async delete(url: string): Promise<void> {
    const key = url.replace(`${this.cdnUrl}/`, '');
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }
}

export const s3Service = new S3Service();
