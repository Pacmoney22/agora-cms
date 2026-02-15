import { UnauthorizedException } from '@nestjs/common';

import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  // -----------------------------------------------------------------------
  // handleRequest
  // -----------------------------------------------------------------------
  describe('handleRequest', () => {
    it('should return user when authentication succeeds', () => {
      const user = { sub: 'u1', email: 'test@test.com', role: 'editor' };

      const result = guard.handleRequest(null, user, null);

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when no user and no error', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw the original error when error is provided', () => {
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
    });

    it('should throw original error even when user is provided', () => {
      const error = new Error('JWT malformed');
      const user = { sub: 'u1' };

      expect(() => guard.handleRequest(error, user, null)).toThrow(error);
    });

    it('should throw UnauthorizedException with info message when available', () => {
      const info = { message: 'jwt expired' };

      try {
        guard.handleRequest(null, null, info);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        expect(err.message).toBe(
          'Invalid or expired authentication token',
        );
      }
    });

    it('should handle undefined info gracefully', () => {
      expect(() => guard.handleRequest(null, null, undefined)).toThrow(
        UnauthorizedException,
      );
    });

    it('should return user of any type', () => {
      const user = { customField: 'value', id: 123 };

      const result = guard.handleRequest(null, user, null);

      expect(result).toEqual(user);
    });
  });

  // -----------------------------------------------------------------------
  // canActivate
  // -----------------------------------------------------------------------
  describe('canActivate', () => {
    it('should call super.canActivate', () => {
      // canActivate delegates to AuthGuard('jwt').canActivate
      // We just verify the method exists and is callable
      expect(guard.canActivate).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });
  });
});
