import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── register ──────────────────────────────────────────────────

  describe('register', () => {
    it('should call authService.register with correct arguments', async () => {
      const dto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
        role: 'editor' as const,
      };
      const expected = { accessToken: 'at', refreshToken: 'rt' };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto as any);

      expect(mockAuthService.register).toHaveBeenCalledWith(
        dto.email,
        dto.name,
        dto.password,
        dto.role,
      );
      expect(result).toEqual(expected);
    });

    it('should propagate errors from authService.register', async () => {
      mockAuthService.register.mockRejectedValue(new Error('conflict'));

      await expect(
        controller.register({
          email: 'a@b.com',
          name: 'A',
          password: 'x',
          role: 'editor',
        } as any),
      ).rejects.toThrow('conflict');
    });
  });

  // ── login ─────────────────────────────────────────────────────

  describe('login', () => {
    it('should call authService.login with correct arguments', async () => {
      const dto = { email: 'test@example.com', password: 'pass' };
      const expected = { accessToken: 'at', refreshToken: 'rt' };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto as any);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto.email, dto.password);
      expect(result).toEqual(expected);
    });

    it('should propagate errors from authService.login', async () => {
      mockAuthService.login.mockRejectedValue(new Error('bad credentials'));

      await expect(
        controller.login({ email: 'a@b.com', password: 'wrong' } as any),
      ).rejects.toThrow('bad credentials');
    });
  });

  // ── refresh ───────────────────────────────────────────────────

  describe('refresh', () => {
    it('should call authService.refresh with the refresh token', async () => {
      const dto = { refreshToken: 'rt-123' };
      const expected = { accessToken: 'new-at', refreshToken: 'new-rt' };
      mockAuthService.refresh.mockResolvedValue(expected);

      const result = await controller.refresh(dto as any);

      expect(mockAuthService.refresh).toHaveBeenCalledWith('rt-123');
      expect(result).toEqual(expected);
    });

    it('should propagate errors from authService.refresh', async () => {
      mockAuthService.refresh.mockRejectedValue(new Error('expired'));

      await expect(
        controller.refresh({ refreshToken: 'bad' } as any),
      ).rejects.toThrow('expired');
    });
  });

  // ── logout ────────────────────────────────────────────────────

  describe('logout', () => {
    it('should call authService.logout with the refresh token', async () => {
      const dto = { refreshToken: 'rt-123' };
      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(dto as any);

      expect(mockAuthService.logout).toHaveBeenCalledWith('rt-123');
    });

    it('should propagate errors from authService.logout', async () => {
      mockAuthService.logout.mockRejectedValue(new Error('fail'));

      await expect(
        controller.logout({ refreshToken: 'bad' } as any),
      ).rejects.toThrow('fail');
    });
  });

  // ── getProfile ────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should call authService.getProfile with user sub', async () => {
      const req = { user: { sub: 'user-1', role: 'admin', email: 'a@b.com' } };
      const profile = { id: 'user-1', email: 'a@b.com', name: 'Admin', role: 'admin' };
      mockAuthService.getProfile.mockResolvedValue(profile);

      const result = await controller.getProfile(req);

      expect(mockAuthService.getProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(profile);
    });
  });
});
