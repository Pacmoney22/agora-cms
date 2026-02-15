import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { TemplatesService } from '../../src/modules/templates/templates.service';

describe('TemplatesService', () => {
  let service: TemplatesService;

  const mockPrisma = {
    page: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------
  describe('findAll', () => {
    it('should return all templates ordered by templateName', async () => {
      const templates = [
        { id: 't1', isTemplate: true, templateName: 'Blog' },
        { id: 't2', isTemplate: true, templateName: 'Landing' },
      ];
      mockPrisma.page.findMany.mockResolvedValue(templates);

      const result = await service.findAll();

      expect(result).toEqual(templates);
      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: { isTemplate: true },
        orderBy: { templateName: 'asc' },
      });
    });

    it('should return empty array when no templates exist', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------
  describe('findById', () => {
    it('should return template when found', async () => {
      const template = { id: 't1', isTemplate: true, templateName: 'Blog' };
      mockPrisma.page.findFirst.mockResolvedValue(template);

      const result = await service.findById('t1');

      expect(result).toEqual(template);
      expect(mockPrisma.page.findFirst).toHaveBeenCalledWith({
        where: { id: 't1', isTemplate: true },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when page exists but is not a template', async () => {
      // findFirst with isTemplate: true will return null for non-templates
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(service.findById('regular-page-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // createFromPage
  // -----------------------------------------------------------------------
  describe('createFromPage', () => {
    it('should create a template from an existing page', async () => {
      const sourcePage = {
        id: 'p1',
        title: 'Source Page',
        componentTree: { root: { componentId: 'container' } },
      };
      const template = {
        id: 't1',
        isTemplate: true,
        templateName: 'Blog Template',
        slug: 'template-blog-template-12345',
        componentTree: sourcePage.componentTree,
      };

      mockPrisma.page.findUnique.mockResolvedValue(sourcePage);
      mockPrisma.page.create.mockResolvedValue(template);

      const result = await service.createFromPage(
        'p1',
        'Blog Template',
        'user-1',
      );

      expect(result).toEqual(template);
      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Blog Template',
          isTemplate: true,
          templateName: 'Blog Template',
          componentTree: sourcePage.componentTree,
          createdBy: 'user-1',
        }),
      });
    });

    it('should throw NotFoundException when source page not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(
        service.createFromPage('non-existent', 'Template', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate slug from template name', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        componentTree: {},
      });
      mockPrisma.page.create.mockResolvedValue({ id: 't1' });

      await service.createFromPage('p1', 'My Template Name', 'user-1');

      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: expect.stringContaining('template-my-template-name-'),
        }),
      });
    });

    it('should handle page with null componentTree', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        componentTree: null,
      });
      mockPrisma.page.create.mockResolvedValue({ id: 't1' });

      await service.createFromPage('p1', 'Template', 'user-1');

      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          componentTree: undefined,
        }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // instantiate
  // -----------------------------------------------------------------------
  describe('instantiate', () => {
    it('should create a new page from a template', async () => {
      const template = {
        id: 't1',
        isTemplate: true,
        componentTree: { root: { componentId: 'blog-layout' } },
      };
      const newPage = {
        id: 'p1',
        slug: '/new-page',
        title: 'New Blog Post',
        componentTree: template.componentTree,
      };

      mockPrisma.page.findFirst.mockResolvedValue(template);
      mockPrisma.page.create.mockResolvedValue(newPage);

      const result = await service.instantiate(
        't1',
        '/new-page',
        'New Blog Post',
        'user-1',
      );

      expect(result).toEqual(newPage);
      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: '/new-page',
          title: 'New Blog Post',
          componentTree: template.componentTree,
          createdBy: 'user-1',
        }),
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        service.instantiate('non-existent', '/slug', 'Title', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle template with null componentTree', async () => {
      mockPrisma.page.findFirst.mockResolvedValue({
        id: 't1',
        isTemplate: true,
        componentTree: null,
      });
      mockPrisma.page.create.mockResolvedValue({ id: 'p1' });

      await service.instantiate('t1', '/new', 'New Page', 'user-1');

      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          componentTree: undefined,
        }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------
  describe('delete', () => {
    it('should delete a template', async () => {
      mockPrisma.page.findFirst.mockResolvedValue({
        id: 't1',
        isTemplate: true,
      });
      mockPrisma.page.delete.mockResolvedValue({});

      await service.delete('t1');

      expect(mockPrisma.page.delete).toHaveBeenCalledWith({
        where: { id: 't1' },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
