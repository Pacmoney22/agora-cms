import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { MediaController } from '../../src/modules/media/media.controller';
import { MediaService } from '../../src/modules/media/media.service';

describe('MediaController', () => {
  let controller: MediaController;

  const mockMediaService = {
    upload: jest.fn(),
    findAll: jest.fn(),
    getPresignedUrl: jest.fn(),
    delete: jest.fn(),
  };

  const mockReq = { user: { sub: 'user-1', role: 'admin' } };

  const mockFile: Partial<Express.Multer.File> = {
    originalname: 'test.png',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('fake-image-data'),
    fieldname: 'file',
    encoding: '7bit',
    destination: '',
    filename: 'test.png',
    path: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: MediaService, useValue: mockMediaService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MediaController>(MediaController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── upload ────────────────────────────────────────────────────

  describe('upload', () => {
    it('should call mediaService.upload with the file and user sub', async () => {
      const expected = { id: 'media-1', url: '/uploads/test.webp' };
      mockMediaService.upload.mockResolvedValue(expected);

      const result = await controller.upload(mockFile as Express.Multer.File, mockReq);

      expect(mockMediaService.upload).toHaveBeenCalledWith(mockFile, 'user-1');
      expect(result).toEqual(expected);
    });

    it('should default to "system" when user is not present', async () => {
      mockMediaService.upload.mockResolvedValue({});

      await controller.upload(mockFile as Express.Multer.File, { user: {} });

      expect(mockMediaService.upload).toHaveBeenCalledWith(mockFile, 'system');
    });

    it('should throw BadRequestException when no file is provided', async () => {
      await expect(
        controller.upload(undefined as any, mockReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message when no file', async () => {
      await expect(
        controller.upload(null as any, mockReq),
      ).rejects.toThrow('No file provided');
    });
  });

  // ── findAll ───────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call mediaService.findAll with query parameters', async () => {
      const expected = { data: [], total: 0 };
      mockMediaService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(1, 20, 'image');

      expect(mockMediaService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        mimeType: 'image',
      });
      expect(result).toEqual(expected);
    });

    it('should call mediaService.findAll with undefined optional params', async () => {
      mockMediaService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll();

      expect(mockMediaService.findAll).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        mimeType: undefined,
      });
    });
  });

  // ── getPresignedUrl ───────────────────────────────────────────

  describe('getPresignedUrl', () => {
    it('should call mediaService.getPresignedUrl and return url object', async () => {
      mockMediaService.getPresignedUrl.mockResolvedValue('https://s3.example.com/file.webp');

      const result = await controller.getPresignedUrl('media-1');

      expect(mockMediaService.getPresignedUrl).toHaveBeenCalledWith('media-1');
      expect(result).toEqual({ url: 'https://s3.example.com/file.webp' });
    });

    it('should propagate errors from mediaService', async () => {
      mockMediaService.getPresignedUrl.mockRejectedValue(new Error('not found'));

      await expect(controller.getPresignedUrl('bad-id')).rejects.toThrow('not found');
    });
  });

  // ── delete ────────────────────────────────────────────────────

  describe('delete', () => {
    it('should call mediaService.delete with the id', async () => {
      mockMediaService.delete.mockResolvedValue(undefined);

      await controller.delete('media-1');

      expect(mockMediaService.delete).toHaveBeenCalledWith('media-1');
    });

    it('should propagate errors from mediaService', async () => {
      mockMediaService.delete.mockRejectedValue(new Error('not found'));

      await expect(controller.delete('bad-id')).rejects.toThrow('not found');
    });
  });
});
