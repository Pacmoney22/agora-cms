import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { TemplatesController } from '../../src/modules/templates/templates.controller';
import { TemplatesService } from '../../src/modules/templates/templates.service';

describe('TemplatesController', () => {
  let controller: TemplatesController;

  const mockTemplatesService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    createFromPage: jest.fn(),
    instantiate: jest.fn(),
    delete: jest.fn(),
  };

  const mockReq = { user: { sub: 'user-1', role: 'admin' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        { provide: TemplatesService, useValue: mockTemplatesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TemplatesController>(TemplatesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── findAll ───────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call templatesService.findAll and return result', async () => {
      const expected = [{ id: 'tpl-1', name: 'Blog Post' }];
      mockTemplatesService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(mockTemplatesService.findAll).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  // ── findById ──────────────────────────────────────────────────

  describe('findById', () => {
    it('should call templatesService.findById with the id', async () => {
      const expected = { id: 'tpl-1', name: 'Blog Post', content: {} };
      mockTemplatesService.findById.mockResolvedValue(expected);

      const result = await controller.findById('tpl-1');

      expect(mockTemplatesService.findById).toHaveBeenCalledWith('tpl-1');
      expect(result).toEqual(expected);
    });

    it('should propagate not-found errors', async () => {
      mockTemplatesService.findById.mockRejectedValue(new Error('not found'));

      await expect(controller.findById('bad-id')).rejects.toThrow('not found');
    });
  });

  // ── createFromPage ────────────────────────────────────────────

  describe('createFromPage', () => {
    it('should call templatesService.createFromPage with correct args', async () => {
      const expected = { id: 'tpl-2', name: 'New Template' };
      mockTemplatesService.createFromPage.mockResolvedValue(expected);

      const result = await controller.createFromPage(
        'page-1',
        { templateName: 'New Template' },
        mockReq,
      );

      expect(mockTemplatesService.createFromPage).toHaveBeenCalledWith(
        'page-1',
        'New Template',
        'user-1',
      );
      expect(result).toEqual(expected);
    });

    it('should default to "system" when user is not present', async () => {
      mockTemplatesService.createFromPage.mockResolvedValue({});

      await controller.createFromPage('page-1', { templateName: 'T' }, { user: {} });

      expect(mockTemplatesService.createFromPage).toHaveBeenCalledWith(
        'page-1',
        'T',
        'system',
      );
    });
  });

  // ── instantiate ───────────────────────────────────────────────

  describe('instantiate', () => {
    it('should call templatesService.instantiate with correct args', async () => {
      const expected = { id: 'page-2', slug: 'new-page', title: 'New Page' };
      mockTemplatesService.instantiate.mockResolvedValue(expected);

      const result = await controller.instantiate(
        'tpl-1',
        { slug: 'new-page', title: 'New Page' },
        mockReq,
      );

      expect(mockTemplatesService.instantiate).toHaveBeenCalledWith(
        'tpl-1',
        'new-page',
        'New Page',
        'user-1',
      );
      expect(result).toEqual(expected);
    });

    it('should default to "system" when user is not present', async () => {
      mockTemplatesService.instantiate.mockResolvedValue({});

      await controller.instantiate(
        'tpl-1',
        { slug: 's', title: 't' },
        { user: {} },
      );

      expect(mockTemplatesService.instantiate).toHaveBeenCalledWith(
        'tpl-1',
        's',
        't',
        'system',
      );
    });
  });

  // ── delete ────────────────────────────────────────────────────

  describe('delete', () => {
    it('should call templatesService.delete with the id', async () => {
      mockTemplatesService.delete.mockResolvedValue(undefined);

      await controller.delete('tpl-1');

      expect(mockTemplatesService.delete).toHaveBeenCalledWith('tpl-1');
    });

    it('should propagate errors', async () => {
      mockTemplatesService.delete.mockRejectedValue(new Error('not found'));

      await expect(controller.delete('bad-id')).rejects.toThrow('not found');
    });
  });
});
