import { Test, TestingModule } from '@nestjs/testing';

import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

describe('LessonsController', () => {
  let controller: LessonsController;

  const mockLessonsService = {
    findBySectionId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonsController],
      providers: [
        { provide: LessonsService, useValue: mockLessonsService },
      ],
    }).compile();

    controller = module.get<LessonsController>(LessonsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findBySectionId', () => {
    it('should call lessonsService.findBySectionId', async () => {
      mockLessonsService.findBySectionId.mockResolvedValue([{ id: 'l1' }]);

      const response = await controller.findBySectionId('s1');

      expect(response).toEqual([{ id: 'l1' }]);
    });
  });

  describe('create', () => {
    it('should call lessonsService.create', async () => {
      const dto = { title: 'Lesson 1', type: 'video' } as any;
      mockLessonsService.create.mockResolvedValue({ id: 'l1' });

      const response = await controller.create('s1', dto);

      expect(response).toEqual({ id: 'l1' });
      expect(mockLessonsService.create).toHaveBeenCalledWith('s1', dto);
    });
  });

  describe('findById', () => {
    it('should call lessonsService.findById', async () => {
      mockLessonsService.findById.mockResolvedValue({ id: 'l1' });

      const response = await controller.findById('l1');

      expect(response).toEqual({ id: 'l1' });
    });
  });

  describe('update', () => {
    it('should call lessonsService.update', async () => {
      const dto = { title: 'Updated' } as any;
      mockLessonsService.update.mockResolvedValue({ id: 'l1' });

      const response = await controller.update('l1', dto);

      expect(response).toEqual({ id: 'l1' });
    });
  });

  describe('remove', () => {
    it('should call lessonsService.remove', async () => {
      mockLessonsService.remove.mockResolvedValue(undefined);

      await controller.remove('l1');

      expect(mockLessonsService.remove).toHaveBeenCalledWith('l1');
    });
  });
});
