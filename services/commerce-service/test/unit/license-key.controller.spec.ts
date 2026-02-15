import { Test, TestingModule } from '@nestjs/testing';

import { LicenseKeyController } from '../../src/modules/license-keys/license-key.controller';
import { LicenseKeyService } from '../../src/modules/license-keys/license-key.service';

describe('LicenseKeyController', () => {
  let controller: LicenseKeyController;
  const mockService = {
    listPools: jest.fn(),
    createPool: jest.fn(),
    addKeysToPool: jest.fn(),
    claimKey: jest.fn(),
    findKeyById: jest.fn(),
    revokeKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LicenseKeyController],
      providers: [{ provide: LicenseKeyService, useValue: mockService }],
    }).compile();

    controller = module.get<LicenseKeyController>(LicenseKeyController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listPools', () => {
    it('should call licenseKeyService.listPools with productId', async () => {
      const expected = [{ id: 'pool-1', productId: 'p1' }];
      mockService.listPools.mockResolvedValue(expected);

      const result = await controller.listPools('p1');

      expect(mockService.listPools).toHaveBeenCalledWith('p1');
      expect(result).toEqual(expected);
    });

    it('should call with undefined when no productId', async () => {
      mockService.listPools.mockResolvedValue([]);

      await controller.listPools(undefined);

      expect(mockService.listPools).toHaveBeenCalledWith(undefined);
    });
  });

  describe('createPool', () => {
    it('should call licenseKeyService.createPool with dto', async () => {
      const dto = { productId: 'p1', name: 'Standard License' };
      const expected = { id: 'pool-1', ...dto };
      mockService.createPool.mockResolvedValue(expected);

      const result = await controller.createPool(dto as any);

      expect(mockService.createPool).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('addKeys', () => {
    it('should call licenseKeyService.addKeysToPool with poolId and keys', async () => {
      const keys = ['KEY-1', 'KEY-2', 'KEY-3'];
      const expected = { added: 3 };
      mockService.addKeysToPool.mockResolvedValue(expected);

      const result = await controller.addKeys('pool-1', { keys });

      expect(mockService.addKeysToPool).toHaveBeenCalledWith('pool-1', keys);
      expect(result).toEqual(expected);
    });
  });

  describe('claim', () => {
    it('should call licenseKeyService.claimKey with poolId, orderId, and lineItemId', async () => {
      const dto = { orderId: 'ord-1', lineItemId: 'li-1' };
      const expected = { id: 'key-1', key: 'ABCD-1234', status: 'claimed' };
      mockService.claimKey.mockResolvedValue(expected);

      const result = await controller.claim('pool-1', dto);

      expect(mockService.claimKey).toHaveBeenCalledWith('pool-1', 'ord-1', 'li-1');
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call licenseKeyService.findKeyById with the id', async () => {
      const expected = { id: 'key-1', key: 'ABCD-1234', status: 'active' };
      mockService.findKeyById.mockResolvedValue(expected);

      const result = await controller.findOne('key-1');

      expect(mockService.findKeyById).toHaveBeenCalledWith('key-1');
      expect(result).toEqual(expected);
    });
  });

  describe('revoke', () => {
    it('should call licenseKeyService.revokeKey with id and reason', async () => {
      const dto = { reason: 'Violation of terms' };
      const expected = { id: 'key-1', status: 'revoked' };
      mockService.revokeKey.mockResolvedValue(expected);

      const result = await controller.revoke('key-1', dto);

      expect(mockService.revokeKey).toHaveBeenCalledWith('key-1', 'Violation of terms');
      expect(result).toEqual(expected);
    });

    it('should pass undefined reason when not provided', async () => {
      mockService.revokeKey.mockResolvedValue({});

      await controller.revoke('key-1', {});

      expect(mockService.revokeKey).toHaveBeenCalledWith('key-1', undefined);
    });
  });
});
