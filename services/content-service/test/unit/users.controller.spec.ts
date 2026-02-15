import { Test, TestingModule } from '@nestjs/testing';

import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    list: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    unlock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── list ──────────────────────────────────────────────────────

  describe('list', () => {
    it('should call usersService.list with parsed query parameters', async () => {
      const expected = { data: [], total: 0 };
      mockUsersService.list.mockResolvedValue(expected);

      const result = await controller.list('1', '20', 'john', 'admin', 'true');

      expect(mockUsersService.list).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'john',
        role: 'admin',
        isActive: 'true',
      });
      expect(result).toEqual(expected);
    });

    it('should handle undefined query params', async () => {
      mockUsersService.list.mockResolvedValue({ data: [], total: 0 });

      await controller.list();

      expect(mockUsersService.list).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        search: undefined,
        role: undefined,
        isActive: undefined,
      });
    });

    it('should parse page and limit strings to integers', async () => {
      mockUsersService.list.mockResolvedValue({ data: [], total: 0 });

      await controller.list('2', '50');

      expect(mockUsersService.list).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        search: undefined,
        role: undefined,
        isActive: undefined,
      });
    });

    it('should pass empty string search/role/isActive as undefined', async () => {
      mockUsersService.list.mockResolvedValue({ data: [], total: 0 });

      await controller.list(undefined, undefined, '', '', '');

      expect(mockUsersService.list).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        search: undefined,
        role: undefined,
        isActive: undefined,
      });
    });
  });

  // ── findOne ───────────────────────────────────────────────────

  describe('findOne', () => {
    it('should call usersService.findById with the id', async () => {
      const expected = { id: 'user-1', name: 'John', email: 'john@example.com' };
      mockUsersService.findById.mockResolvedValue(expected);

      const result = await controller.findOne('user-1');

      expect(mockUsersService.findById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });

    it('should propagate not-found errors', async () => {
      mockUsersService.findById.mockRejectedValue(new Error('not found'));

      await expect(controller.findOne('bad-id')).rejects.toThrow('not found');
    });
  });

  // ── update ────────────────────────────────────────────────────

  describe('update', () => {
    it('should call usersService.update with id and body', async () => {
      const body = { name: 'Jane', role: 'editor' as any, isActive: true };
      const expected = { id: 'user-1', ...body };
      mockUsersService.update.mockResolvedValue(expected);

      const result = await controller.update('user-1', body);

      expect(mockUsersService.update).toHaveBeenCalledWith('user-1', body);
      expect(result).toEqual(expected);
    });

    it('should handle partial updates', async () => {
      const body = { name: 'Updated Name' };
      mockUsersService.update.mockResolvedValue({ id: 'user-1', name: 'Updated Name' });

      const result = await controller.update('user-1', body);

      expect(mockUsersService.update).toHaveBeenCalledWith('user-1', body);
      expect(result.name).toBe('Updated Name');
    });

    it('should propagate errors', async () => {
      mockUsersService.update.mockRejectedValue(new Error('not found'));

      await expect(
        controller.update('bad-id', { name: 'X' }),
      ).rejects.toThrow('not found');
    });
  });

  // ── unlock ────────────────────────────────────────────────────

  describe('unlock', () => {
    it('should call usersService.unlock with the id', async () => {
      const expected = { id: 'user-1', lockedUntil: null };
      mockUsersService.unlock.mockResolvedValue(expected);

      const result = await controller.unlock('user-1');

      expect(mockUsersService.unlock).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });

    it('should propagate errors', async () => {
      mockUsersService.unlock.mockRejectedValue(new Error('not found'));

      await expect(controller.unlock('bad-id')).rejects.toThrow('not found');
    });
  });
});
