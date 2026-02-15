import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PassesService } from '../../src/modules/passes/passes.service';

describe('PassesService', () => {
  let service: PassesService;

  const mockPrisma = {
    ticket: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        // No APPLE_PASS_TYPE_ID or APPLE_TEAM_ID -> stub mode
        APPLE_PASS_TYPE_ID: undefined,
        APPLE_TEAM_ID: undefined,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassesService,
        { provide: 'PRISMA', useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PassesService>(PassesService);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------
  describe('constructor', () => {
    it('should initialize in stub mode when credentials not configured', () => {
      expect((service as any).isStubMode).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // generateTicketPass (stub mode)
  // -----------------------------------------------------------------------
  describe('generateTicketPass', () => {
    it('should generate stub pass for a valid ticket', async () => {
      const ticket = {
        id: 'ticket-1',
        ticketNumber: 'TK-001',
        passSerial: null,
        event: {
          id: 'event-1',
          title: 'Tech Conference',
          startDate: new Date(),
          venue: { name: 'Convention Center' },
        },
        ticketType: { name: 'VIP' },
        attendee: { firstName: 'John', lastName: 'Doe' },
        qrCode: 'QR123',
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(ticket);
      mockPrisma.ticket.update.mockResolvedValue({
        ...ticket,
        passUrl: 'https://stub.example.com/passes/TICKET-uuid.pkpass',
        passSerial: 'TICKET-uuid',
      });

      const result = await service.generateTicketPass('ticket-1');

      expect(result).toHaveProperty('passUrl');
      expect(result).toHaveProperty('passSerial');
      expect(result.passUrl).toContain('stub.example.com');
      expect(result.passSerial).toContain('TICKET-');
    });

    it('should use existing passSerial if present on ticket', async () => {
      const ticket = {
        id: 'ticket-2',
        ticketNumber: 'TK-002',
        passSerial: 'EXISTING-SERIAL-123',
        event: {
          id: 'event-1',
          title: 'Concert',
          startDate: new Date(),
          venue: null,
        },
        ticketType: { name: 'General' },
        attendee: { firstName: 'Jane', lastName: 'Smith' },
        qrCode: 'QR456',
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(ticket);
      mockPrisma.ticket.update.mockResolvedValue({
        ...ticket,
        passUrl: 'https://stub.example.com/passes/EXISTING-SERIAL-123.pkpass',
      });

      const result = await service.generateTicketPass('ticket-2');

      expect(result.passSerial).toBe('EXISTING-SERIAL-123');
    });

    it('should throw NotFoundException when ticket not found', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.generateTicketPass('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update ticket with pass URL and serial', async () => {
      const ticket = {
        id: 'ticket-3',
        ticketNumber: 'TK-003',
        passSerial: null,
        event: {
          id: 'event-1',
          title: 'Event',
          startDate: new Date(),
          venue: { name: 'Venue' },
        },
        ticketType: { name: 'Standard' },
        attendee: { firstName: 'Bob', lastName: 'Brown' },
        qrCode: 'QR789',
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(ticket);
      mockPrisma.ticket.update.mockResolvedValue({});

      await service.generateTicketPass('ticket-3');

      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-3' },
        data: {
          passUrl: expect.stringContaining('stub.example.com'),
          passSerial: expect.stringContaining('TICKET-'),
        },
      });
    });
  });

  // -----------------------------------------------------------------------
  // registerDevice
  // -----------------------------------------------------------------------
  describe('registerDevice', () => {
    it('should log device registration (stub)', async () => {
      // This is a stub, so it should complete without error
      await expect(
        service.registerDevice('device-1', 'pass.com.test', 'serial-1', 'push-token-1'),
      ).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // unregisterDevice
  // -----------------------------------------------------------------------
  describe('unregisterDevice', () => {
    it('should log device unregistration (stub)', async () => {
      await expect(
        service.unregisterDevice('device-1', 'serial-1'),
      ).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // getSerialNumbers
  // -----------------------------------------------------------------------
  describe('getSerialNumbers', () => {
    it('should return empty serial numbers (stub)', async () => {
      const result = await service.getSerialNumbers(
        'device-1',
        'pass.com.test',
      );

      expect(result.serialNumbers).toEqual([]);
      expect(result.lastModified).toBeDefined();
      expect(new Date(result.lastModified).getTime()).not.toBeNaN();
    });

    it('should accept passesUpdatedSince parameter', async () => {
      const result = await service.getSerialNumbers(
        'device-1',
        'pass.com.test',
        '2024-01-01T00:00:00Z',
      );

      expect(result.serialNumbers).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getLatestPass
  // -----------------------------------------------------------------------
  describe('getLatestPass', () => {
    it('should throw NotFoundException in stub mode', async () => {
      await expect(
        service.getLatestPass('serial-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
