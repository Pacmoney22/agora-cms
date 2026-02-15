import { UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../../src/modules/auth/auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prisma: any;
  let redis: any;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        JWT_EXPIRATION_SECONDS: 900,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'PRISMA',
          useValue: mockPrisma,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prisma = mockPrisma;

    // Mock Redis instance
    (service as any).redis = mockRedis;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should hash password and create user', async () => {
      const email = 'test@example.com';
      const name = 'Test User';
      const password = 'password123';

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email,
        name,
        passwordHash: 'hashed',
        role: 'viewer',
      });
      mockJwtService.sign.mockReturnValue('access-token');

      const hashSpy = jest.spyOn(bcrypt, 'hash');

      const result = await service.register(email, name, password);

      expect(hashSpy).toHaveBeenCalledWith(password, 12);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });

      await expect(
        service.register('existing@example.com', 'Test', 'password'),
      ).rejects.toThrow(ConflictException);
    });

    it('should set default role to viewer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hashed',
        role: 'viewer',
      });
      mockJwtService.sign.mockReturnValue('token');

      await service.register('test@example.com', 'Test', 'password');

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'viewer',
        }),
      });
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 12);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email,
        name: 'Test User',
        passwordHash,
        role: 'viewer',
        isActive: true,
        failedLogins: 0,
        lockedUntil: null,
      });
      mockJwtService.sign.mockReturnValue('access-token');

      const result = await service.login(email, password);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(email);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('nonexistent@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 12);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash,
        isActive: true,
        failedLogins: 0,
        lockedUntil: null,
      });

      await expect(service.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hash',
        isActive: false,
        failedLogins: 0,
      });

      await expect(service.login('test@example.com', 'password')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for locked account', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hash',
        isActive: true,
        failedLogins: 5,
        lockedUntil: futureDate,
      });

      await expect(service.login('test@example.com', 'password')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should increment failed login counter on wrong password', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 12);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash,
        isActive: true,
        failedLogins: 2,
        lockedUntil: null,
      });

      await expect(service.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { failedLogins: 3 },
      });
    });

    it('should lock account after max failed attempts', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 12);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash,
        isActive: true,
        failedLogins: 4, // One more will trigger lockout
        lockedUntil: null,
      });

      await expect(service.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          failedLogins: 5,
          lockedUntil: expect.any(Date),
        }),
      });
    });

    it('should reset failed login counter on successful login', async () => {
      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 12);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash,
        role: 'viewer',
        isActive: true,
        failedLogins: 3,
        lockedUntil: null,
      });
      mockJwtService.sign.mockReturnValue('token');

      await service.login('test@example.com', password);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { failedLogins: 0, lockedUntil: null },
      });
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const userId = 'user-123';

      mockRedis.get.mockResolvedValue(userId);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        role: 'viewer',
        isActive: true,
      });
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refresh(refreshToken);

      expect(mockRedis.get).toHaveBeenCalledWith(`refresh:${refreshToken}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is deactivated', async () => {
      const refreshToken = 'valid-refresh-token';
      const userId = 'user-123';

      mockRedis.get.mockResolvedValue(userId);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        isActive: false,
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete refresh token from Redis', async () => {
      const refreshToken = 'test-refresh-token';

      await service.logout(refreshToken);

      expect(mockRedis.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
    });
  });

  describe('validateJwtPayload', () => {
    it('should return user data for valid payload', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'viewer' as const,
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        isActive: true,
      });

      const result = await service.validateJwtPayload(payload);

      expect(result).toEqual({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const payload = {
        sub: 'non-existent',
        email: 'test@example.com',
        role: 'viewer' as const,
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'viewer' as const,
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: payload.sub,
        email: payload.email,
        isActive: false,
      });

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
