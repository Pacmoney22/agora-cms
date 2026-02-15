import { Test, TestingModule } from '@nestjs/testing';

import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

describe('EnrollmentsController', () => {
  let controller: EnrollmentsController;

  const mockEnrollmentsService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    cancel: jest.fn(),
    complete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentsController],
      providers: [
        { provide: EnrollmentsService, useValue: mockEnrollmentsService },
      ],
    }).compile();

    controller = module.get<EnrollmentsController>(EnrollmentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call enrollmentsService.findAll with query params', async () => {
      mockEnrollmentsService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll('u1', 'c1', 'active', 1, 20);

      expect(mockEnrollmentsService.findAll).toHaveBeenCalledWith({
        userId: 'u1', courseId: 'c1', status: 'active', page: 1, limit: 20,
      });
    });
  });

  describe('create', () => {
    it('should call enrollmentsService.create', async () => {
      const dto = { userId: 'u1', courseId: 'c1' } as any;
      mockEnrollmentsService.create.mockResolvedValue({ id: 'e1' });

      const response = await controller.create(dto);

      expect(response).toEqual({ id: 'e1' });
    });
  });

  describe('findById', () => {
    it('should call enrollmentsService.findById', async () => {
      mockEnrollmentsService.findById.mockResolvedValue({ id: 'e1' });

      const response = await controller.findById('e1');

      expect(response).toEqual({ id: 'e1' });
    });
  });

  describe('cancel', () => {
    it('should call enrollmentsService.cancel', async () => {
      mockEnrollmentsService.cancel.mockResolvedValue({ id: 'e1', status: 'suspended' });

      const response = await controller.cancel('e1');

      expect(response).toEqual({ id: 'e1', status: 'suspended' });
    });
  });

  describe('complete', () => {
    it('should call enrollmentsService.complete', async () => {
      mockEnrollmentsService.complete.mockResolvedValue({ id: 'e1', status: 'completed' });

      const response = await controller.complete('e1');

      expect(response).toEqual({ id: 'e1', status: 'completed' });
    });
  });
});
