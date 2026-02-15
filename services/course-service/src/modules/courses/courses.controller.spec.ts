import { Test, TestingModule } from '@nestjs/testing';

import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

describe('CoursesController', () => {
  let controller: CoursesController;

  const mockCoursesService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        { provide: CoursesService, useValue: mockCoursesService },
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call coursesService.findAll with query params', async () => {
      const result = { data: [], meta: {} };
      mockCoursesService.findAll.mockResolvedValue(result);

      const response = await controller.findAll(1, 20, 'published', 'Tech', 'beginner', 'title', 'asc');

      expect(response).toEqual(result);
      expect(mockCoursesService.findAll).toHaveBeenCalledWith({
        page: 1, limit: 20, status: 'published', category: 'Tech', level: 'beginner', sortBy: 'title', sortOrder: 'asc',
      });
    });
  });

  describe('create', () => {
    it('should call coursesService.create', async () => {
      const dto = { title: 'Test', description: 'Desc' } as any;
      mockCoursesService.create.mockResolvedValue({ id: 'c1' });

      const response = await controller.create(dto);

      expect(response).toEqual({ id: 'c1' });
      expect(mockCoursesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findById', () => {
    it('should call coursesService.findById', async () => {
      mockCoursesService.findById.mockResolvedValue({ id: 'c1' });

      const response = await controller.findById('c1');

      expect(response).toEqual({ id: 'c1' });
    });
  });

  describe('update', () => {
    it('should call coursesService.update', async () => {
      const dto = { title: 'Updated' } as any;
      mockCoursesService.update.mockResolvedValue({ id: 'c1', title: 'Updated' });

      const response = await controller.update('c1', dto);

      expect(response).toEqual({ id: 'c1', title: 'Updated' });
    });
  });

  describe('remove', () => {
    it('should call coursesService.remove', async () => {
      mockCoursesService.remove.mockResolvedValue(undefined);

      await controller.remove('c1');

      expect(mockCoursesService.remove).toHaveBeenCalledWith('c1');
    });
  });

  describe('publish', () => {
    it('should call coursesService.publish', async () => {
      mockCoursesService.publish.mockResolvedValue({ id: 'c1', status: 'published' });

      const response = await controller.publish('c1');

      expect(response).toEqual({ id: 'c1', status: 'published' });
    });
  });

  describe('unpublish', () => {
    it('should call coursesService.unpublish', async () => {
      mockCoursesService.unpublish.mockResolvedValue({ id: 'c1', status: 'draft' });

      const response = await controller.unpublish('c1');

      expect(response).toEqual({ id: 'c1', status: 'draft' });
    });
  });
});
