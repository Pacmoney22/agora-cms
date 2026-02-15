import { UnauthorizedException } from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should return user when user is valid and no error', () => {
      const user = { sub: 'user-1', email: 'test@test.com' };

      const result = guard.handleRequest(null, user, null);

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        'Invalid or expired authentication token',
      );
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw the original error when err is provided', () => {
      const err = new Error('Token expired');

      expect(() => guard.handleRequest(err, null, null)).toThrow('Token expired');
    });

    it('should throw the original error even when user exists', () => {
      const err = new Error('Custom error');
      const user = { sub: 'user-1' };

      expect(() => guard.handleRequest(err, user, null)).toThrow('Custom error');
    });

    it('should handle info message in log output', () => {
      const info = { message: 'jwt expired' };

      expect(() => guard.handleRequest(null, null, info)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
