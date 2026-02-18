import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { PassesController } from '../../src/modules/passes/passes.controller';
import { PassesService } from '../../src/modules/passes/passes.service';

describe('PassesController', () => {
  let controller: PassesController;

  const mockPassesService = {
    generateTicketPass: jest.fn(),
    registerDevice: jest.fn(),
    unregisterDevice: jest.fn(),
    getSerialNumbers: jest.fn(),
    getLatestPass: jest.fn(),
  };

  const mockReq = { user: { sub: 'user-1', role: 'admin' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PassesController],
      providers: [
        { provide: PassesService, useValue: mockPassesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PassesController>(PassesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── generateTicketPass ────────────────────────────────────────

  describe('generateTicketPass', () => {
    it('should call passesService.generateTicketPass and return formatted result', async () => {
      mockPassesService.generateTicketPass.mockResolvedValue({
        passUrl: 'https://example.com/pass.pkpass',
        passSerial: 'serial-123',
      });

      const result = await controller.generateTicketPass('ticket-1', mockReq);

      expect(mockPassesService.generateTicketPass).toHaveBeenCalledWith('ticket-1');
      expect(result).toEqual({
        passUrl: 'https://example.com/pass.pkpass',
        serialNumber: 'serial-123',
      });
    });

    it('should propagate errors from passesService', async () => {
      mockPassesService.generateTicketPass.mockRejectedValue(new Error('not found'));

      await expect(
        controller.generateTicketPass('bad-ticket', mockReq),
      ).rejects.toThrow('not found');
    });
  });

  // ── registerDevice ────────────────────────────────────────────

  describe('registerDevice', () => {
    it('should call passesService.registerDevice with correct args', async () => {
      mockPassesService.registerDevice.mockResolvedValue(undefined);

      const result = await controller.registerDevice(
        'device-lib-1',
        'pass.com.example',
        'serial-123',
        'push-token-abc',
        'ApplePass auth-token',
      );

      expect(mockPassesService.registerDevice).toHaveBeenCalledWith(
        'device-lib-1',
        'pass.com.example',
        'serial-123',
        'push-token-abc',
      );
      expect(result).toEqual({ success: true });
    });
  });

  // ── unregisterDevice ──────────────────────────────────────────

  describe('unregisterDevice', () => {
    it('should call passesService.unregisterDevice with correct args', async () => {
      mockPassesService.unregisterDevice.mockResolvedValue(undefined);

      const result = await controller.unregisterDevice(
        'device-lib-1',
        'pass.com.example',
        'serial-123',
        'ApplePass auth-token',
      );

      expect(mockPassesService.unregisterDevice).toHaveBeenCalledWith(
        'device-lib-1',
        'serial-123',
      );
      expect(result).toEqual({ success: true });
    });
  });

  // ── getSerialNumbers ──────────────────────────────────────────

  describe('getSerialNumbers', () => {
    it('should return serial numbers and lastModified when passes exist', async () => {
      mockPassesService.getSerialNumbers.mockResolvedValue({
        serialNumbers: ['serial-1', 'serial-2'],
        lastModified: '2024-01-01T00:00:00Z',
      });

      const result = await controller.getSerialNumbers(
        'device-lib-1',
        'pass.com.example',
        'ApplePass token',
        undefined,
      );

      expect(mockPassesService.getSerialNumbers).toHaveBeenCalledWith(
        'device-lib-1',
        'pass.com.example',
        undefined,
      );
      expect(result).toEqual({
        serialNumbers: ['serial-1', 'serial-2'],
        lastModified: '2024-01-01T00:00:00Z',
      });
    });

    it('should return null when no serial numbers exist (204 No Content)', async () => {
      mockPassesService.getSerialNumbers.mockResolvedValue({
        serialNumbers: [],
        lastModified: null,
      });

      const result = await controller.getSerialNumbers(
        'device-lib-1',
        'pass.com.example',
        'ApplePass token',
        '2024-01-01T00:00:00Z',
      );

      expect(result).toBeNull();
    });

    it('should pass ifModifiedSince header to service', async () => {
      mockPassesService.getSerialNumbers.mockResolvedValue({
        serialNumbers: ['serial-1'],
        lastModified: '2024-06-01T00:00:00Z',
      });

      await controller.getSerialNumbers(
        'device-lib-1',
        'pass.com.example',
        'ApplePass token',
        '2024-01-01T00:00:00Z',
      );

      expect(mockPassesService.getSerialNumbers).toHaveBeenCalledWith(
        'device-lib-1',
        'pass.com.example',
        '2024-01-01T00:00:00Z',
      );
    });
  });

  // ── getLatestPass ─────────────────────────────────────────────

  describe('getLatestPass', () => {
    it('should return pass buffer and content type', async () => {
      const passBuffer = Buffer.from('fake-pkpass');
      mockPassesService.getLatestPass.mockResolvedValue(passBuffer);

      const result = await controller.getLatestPass(
        'pass.com.example',
        'serial-123',
        'ApplePass token',
        undefined,
      );

      expect(mockPassesService.getLatestPass).toHaveBeenCalledWith('serial-123');
      expect(result).toEqual({
        buffer: passBuffer,
        contentType: 'application/vnd.apple.pkpass',
      });
    });

    it('should throw NotFoundException when pass is not found', async () => {
      mockPassesService.getLatestPass.mockRejectedValue(new Error('not found'));

      await expect(
        controller.getLatestPass(
          'pass.com.example',
          'bad-serial',
          'ApplePass token',
          undefined,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── logError ──────────────────────────────────────────────────

  describe('logError', () => {
    it('should log errors and return success', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const logs = ['Error 1', 'Error 2'];

      const result = await controller.logError(logs);

      expect(consoleSpy).toHaveBeenCalledWith('Apple Wallet device errors:', logs);
      expect(result).toEqual({ success: true });

      consoleSpy.mockRestore();
    });

    it('should handle empty logs array', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await controller.logError([]);

      expect(consoleSpy).toHaveBeenCalledWith('Apple Wallet device errors:', []);
      expect(result).toEqual({ success: true });

      consoleSpy.mockRestore();
    });
  });
});
