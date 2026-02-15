import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { MediaService, UploadedFile } from '../../src/modules/media/media.service';

// Mock S3 client
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((args) => ({ ...args, _type: 'PutObject' })),
  GetObjectCommand: jest.fn().mockImplementation((args) => ({ ...args, _type: 'GetObject' })),
  DeleteObjectCommand: jest.fn().mockImplementation((args) => ({ ...args, _type: 'DeleteObject' })),
}));

// Mock presigner
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com/file'),
}));

// Mock sharp
const mockSharp = {
  metadata: jest.fn().mockResolvedValue({ width: 1920, height: 1080 }),
  resize: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized-image')),
};
jest.mock('sharp', () => jest.fn(() => mockSharp));

describe('MediaService', () => {
  let service: MediaService;

  const mockPrisma = {
    media: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        S3_BUCKET_MEDIA: 'test-bucket',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'us-east-1',
        S3_ACCESS_KEY: 'test-access-key',
        S3_SECRET_KEY: 'test-secret-key',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: 'PRISMA', useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    jest.clearAllMocks();

    // Re-setup sharp mocks after clearAllMocks
    mockSharp.metadata.mockResolvedValue({ width: 1920, height: 1080 });
    mockSharp.resize.mockReturnThis();
    mockSharp.webp.mockReturnThis();
    mockSharp.toBuffer.mockResolvedValue(Buffer.from('resized-image'));
  });

  // -----------------------------------------------------------------------
  // upload
  // -----------------------------------------------------------------------
  describe('upload', () => {
    const createFile = (overrides?: Partial<UploadedFile>): UploadedFile => ({
      fieldname: 'file',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
      ...overrides,
    });

    it('should upload an image and create media record', async () => {
      mockSend.mockResolvedValue({});
      mockPrisma.media.create.mockResolvedValue({
        id: 'media-1',
        filename: 'uuid.jpg',
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        s3Key: 'media/uuid/original.jpg',
        size: 1024,
      });

      const file = createFile();
      const result = await service.upload(file, 'user-1');

      expect(result).toHaveProperty('id', 'media-1');
      expect(result).toHaveProperty('url');
      expect(mockPrisma.media.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          originalName: 'photo.jpg',
          mimeType: 'image/jpeg',
          createdBy: 'user-1',
        }),
      });
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(service.upload(null as any, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file has no buffer', async () => {
      const file = createFile({ buffer: undefined as any });
      await expect(service.upload(file, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload non-image file without generating variants', async () => {
      mockSend.mockResolvedValue({});
      mockPrisma.media.create.mockResolvedValue({
        id: 'media-2',
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        s3Key: 'media/uuid/original.pdf',
      });

      const file = createFile({
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      });

      const result = await service.upload(file, 'user-1');

      expect(result).toHaveProperty('id', 'media-2');
      // sharp should not be called for non-images
      expect(mockSharp.metadata).not.toHaveBeenCalled();
    });

    it('should handle image processing failure gracefully', async () => {
      mockSend.mockResolvedValue({});
      mockSharp.metadata.mockRejectedValue(new Error('Sharp error'));
      mockPrisma.media.create.mockResolvedValue({
        id: 'media-3',
        filename: 'bad.jpg',
        mimeType: 'image/jpeg',
        s3Key: 'media/uuid/original.jpg',
      });

      const file = createFile();
      const result = await service.upload(file, 'user-1');

      // Should still succeed, just without variants
      expect(result).toHaveProperty('id', 'media-3');
    });

    it('should throw InternalServerErrorException when S3 upload fails', async () => {
      mockSend.mockRejectedValue(new Error('S3 error'));

      const file = createFile({ mimetype: 'application/pdf', originalname: 'doc.pdf' });

      await expect(service.upload(file, 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated media', async () => {
      const media = [{ id: 'm1', filename: 'file.jpg' }];
      mockPrisma.media.findMany.mockResolvedValue(media);
      mockPrisma.media.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toEqual(media);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by mimeType', async () => {
      mockPrisma.media.findMany.mockResolvedValue([]);
      mockPrisma.media.count.mockResolvedValue(0);

      await service.findAll({ mimeType: 'image' });

      expect(mockPrisma.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { mimeType: { startsWith: 'image' } },
        }),
      );
    });

    it('should handle custom pagination', async () => {
      mockPrisma.media.findMany.mockResolvedValue([]);
      mockPrisma.media.count.mockResolvedValue(100);

      const result = await service.findAll({ page: 5, limit: 10 });

      expect(result.meta.page).toBe(5);
      expect(result.meta.totalPages).toBe(10);
    });
  });

  // -----------------------------------------------------------------------
  // getPresignedUrl
  // -----------------------------------------------------------------------
  describe('getPresignedUrl', () => {
    it('should return presigned URL for existing media', async () => {
      mockPrisma.media.findUnique.mockResolvedValue({
        id: 'm1',
        s3Key: 'media/uuid/original.jpg',
      });

      const url = await service.getPresignedUrl('m1');

      expect(url).toBe('https://signed-url.example.com/file');
    });

    it('should throw NotFoundException for non-existent media', async () => {
      mockPrisma.media.findUnique.mockResolvedValue(null);

      await expect(service.getPresignedUrl('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------
  describe('delete', () => {
    it('should delete media and S3 objects', async () => {
      mockSend.mockResolvedValue({});
      mockPrisma.media.findUnique.mockResolvedValue({
        id: 'm1',
        s3Key: 'media/uuid/original.jpg',
        variants: {
          thumbnail: 'media/uuid/thumbnail.webp',
          medium: 'media/uuid/medium.webp',
        },
      });
      mockPrisma.media.delete.mockResolvedValue({});

      await service.delete('m1');

      // Should delete original + all variants
      expect(mockSend).toHaveBeenCalledTimes(3);
      expect(mockPrisma.media.delete).toHaveBeenCalledWith({
        where: { id: 'm1' },
      });
    });

    it('should throw NotFoundException for non-existent media', async () => {
      mockPrisma.media.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should continue deleting even if S3 delete fails', async () => {
      mockSend.mockRejectedValue(new Error('S3 delete failed'));
      mockPrisma.media.findUnique.mockResolvedValue({
        id: 'm1',
        s3Key: 'media/uuid/original.jpg',
        variants: null,
      });
      mockPrisma.media.delete.mockResolvedValue({});

      // Should not throw
      await service.delete('m1');

      expect(mockPrisma.media.delete).toHaveBeenCalledWith({
        where: { id: 'm1' },
      });
    });

    it('should handle media with no variants', async () => {
      mockSend.mockResolvedValue({});
      mockPrisma.media.findUnique.mockResolvedValue({
        id: 'm1',
        s3Key: 'media/uuid/original.pdf',
        variants: null,
      });
      mockPrisma.media.delete.mockResolvedValue({});

      await service.delete('m1');

      // Only original should be deleted
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });
});
