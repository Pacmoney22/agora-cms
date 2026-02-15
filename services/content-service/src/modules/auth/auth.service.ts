import { randomUUID } from 'node:crypto';

import type { UserRole, JwtPayload, AuthTokens } from '@agora-cms/shared';
import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, type UserRole as PrismaUserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 30;
const REFRESH_TOKEN_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly redis: Redis;

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });
  }

  async register(email: string, name: string, password: string, role: UserRole = 'customer') {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: { email, name, passwordHash, role: role as PrismaUserRole },
    });

    this.logger.log(`User registered: ${user.id} (${email})`);

    const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account locked. Try again in ${remainingMinutes} minute(s)`,
      );
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      await this.handleFailedLogin(user.id, user.failedLogins);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed login counter on success
    if (user.failedLogins > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);

    this.logger.log(`User logged in: ${user.id} (${email})`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const userId = await this.redis.get(`refresh:${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Delete the used refresh token (rotation)
    await this.redis.del(`refresh:${refreshToken}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);

    this.logger.log(`Token refreshed for user: ${user.id}`);

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.redis.del(`refresh:${refreshToken}`);
  }

  async validateJwtPayload(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomUUID();

    // Store refresh token in Redis with TTL
    const ttlSeconds = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
    await this.redis.set(`refresh:${refreshToken}`, userId, 'EX', ttlSeconds);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<number>('JWT_EXPIRATION_SECONDS', 900),
    };
  }

  private async handleFailedLogin(userId: string, currentFailedLogins: number) {
    const newCount = currentFailedLogins + 1;
    const data: Record<string, unknown> = { failedLogins: newCount };

    if (newCount >= MAX_FAILED_LOGINS) {
      data.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      this.logger.warn(`Account locked after ${MAX_FAILED_LOGINS} failed attempts: ${userId}`);
    }

    await this.prisma.user.update({ where: { id: userId }, data });
  }
}
