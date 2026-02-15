import { randomUUID } from 'crypto';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

interface VariantSet {
  thumbnail?: string;
  medium?: string;
  large?: string;
  webp?: string;
}

const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  medium: { width: 800 },
  large: { width: 1920 },
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_MEDIA', 'agora-media');

    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    this.s3Client = new S3Client({
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      ...(endpoint && {
        endpoint,
        forcePathStyle: true, // Required for MinIO
      }),
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY', 'minioadmin'),
      },
    });
  }

  async upload(file: UploadedFile, userId: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    const fileId = randomUUID();
    const isImage = file.mimetype.startsWith('image/');
    const ext = this.getExtension(file.originalname);
    const baseKey = `media/${fileId}`;
    const primaryKey = `${baseKey}/original${ext}`;

    // Upload original
    await this.uploadToS3(primaryKey, file.buffer, file.mimetype);

    // Get dimensions for images
    let dimensions: { width: number; height: number } | null = null;
    const variants: VariantSet = {};

    if (isImage) {
      try {
        const metadata = await sharp(file.buffer).metadata();
        if (metadata.width && metadata.height) {
          dimensions = { width: metadata.width, height: metadata.height };
        }

        // Generate responsive variants + WebP
        for (const [sizeName, sizeOpts] of Object.entries(IMAGE_SIZES)) {
          const resized = await sharp(file.buffer)
            .resize(sizeOpts.width, (sizeOpts as any).height, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality: 80 })
            .toBuffer();

          const variantKey = `${baseKey}/${sizeName}.webp`;
          await this.uploadToS3(variantKey, resized, 'image/webp');
          variants[sizeName as keyof VariantSet] = variantKey;
        }

        // Full-size WebP
        const webpFull = await sharp(file.buffer).webp({ quality: 85 }).toBuffer();
        const webpKey = `${baseKey}/full.webp`;
        await this.uploadToS3(webpKey, webpFull, 'image/webp');
        variants.webp = webpKey;
      } catch (error) {
        this.logger.warn(`Image processing failed, continuing with original only: ${error}`);
      }
    }

    // Generate a clean filename
    const cleanFilename = `${fileId}${ext}`;

    const media = await this.prisma.media.create({
      data: {
        filename: cleanFilename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.buffer.length,
        s3Key: primaryKey,
        dimensions: dimensions as object | undefined,
        variants: Object.keys(variants).length > 0 ? (variants as object) : undefined,
        createdBy: userId,
      },
    });

    this.logger.log(`Media uploaded: ${media.id} (${file.originalname}, ${Object.keys(variants).length} variants)`);

    return {
      ...media,
      url: await this.getPublicUrl(primaryKey),
      thumbnailUrl: variants.thumbnail
        ? await this.getPublicUrl(variants.thumbnail)
        : undefined,
    };
  }

  async findAll(options: { page?: number; limit?: number; mimeType?: string }) {
    const { page = 1, limit = 20, mimeType } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (mimeType) {
      where.mimeType = { startsWith: mimeType };
    }

    const [data, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPresignedUrl(id: string): Promise<string> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Media with id "${id}" not found`);
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: media.s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  async delete(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Media with id "${id}" not found`);
    }

    // Delete all S3 objects (original + variants)
    const keysToDelete = [media.s3Key];
    if (media.variants) {
      keysToDelete.push(...Object.values(media.variants as Record<string, string>));
    }

    for (const key of keysToDelete) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
        );
      } catch (error) {
        this.logger.warn(`Failed to delete S3 object ${key}: ${error}`);
      }
    }

    await this.prisma.media.delete({ where: { id } });
    this.logger.log(`Media deleted: ${id}`);
  }

  private async uploadToS3(key: string, buffer: Buffer, contentType: string) {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch (error) {
      this.logger.error(`S3 upload failed for ${key}: ${error}`);
      throw new InternalServerErrorException('Failed to upload file to storage');
    }
  }

  private async getPublicUrl(key: string): Promise<string> {
    const endpoint = this.configService.get<string>('S3_ENDPOINT', '');
    if (endpoint) {
      // MinIO local: use direct URL
      return `${endpoint}/${this.bucketName}/${key}`;
    }
    // AWS S3: use presigned URL
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn: 86400 });
  }

  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }
}
