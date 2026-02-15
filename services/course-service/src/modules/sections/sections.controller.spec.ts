import { Test, TestingModule } from '@nestjs/testing';

import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';

describe('SectionsController', () => {
  let controller: SectionsController;

  const mockSectionsService = {
    findByCourseId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SectionsController],
      providers: [
        { provide: SectionsService, useValue: mockSectionsService },
      ],
    }).compile();

    controller = module.get<SectionsController>(SectionsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByCourseId', () => {
    it('should call sectionsService.findByCourseId', async () => {
      mockSectionsService.findByCourseId.mockResolvedValue([{ id: 's1' }]);

      const response = await controller.findByCourseId('c1');

      expect(response).toEqual([{ id: 's1' }]);
    });
  });

  describe('create', () => {
    it('should call sectionsService.create', async () => {
      const dto = { title: 'Section 1' } as any;
      mockSectionsService.create.mockResolvedValue({ id: 's1' });

      const response = await controller.create('c1', dto);

      expect(response).toEqual({ id: 's1' });
      expect(mockSectionsService.create).toHaveBeenCalledWith('c1', dto);
    });
  });

  describe('update', () => {
    it('should call sectionsService.update', async () => {
      const dto = { title: 'Updated' } as any;
      mockSectionsService.update.mockResolvedValue({ id: 's1' });

      const response = await controller.update('s1', dto);

      expect(response).toEqual({ id: 's1' });
    });
  });

  describe('remove', () => {
    it('should call sectionsService.remove', async () => {
      mockSectionsService.remove.mockResolvedValue(undefined);

      await controller.remove('s1');

      expect(mockSectionsService.remove).toHaveBeenCalledWith('s1');
    });
  });
});
