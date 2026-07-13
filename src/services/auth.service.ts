import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import type { RegisterDto, LoginDto, AuthTokens, UserPublic } from '../models/user.model';
import type { JwtPayload } from '../types';

const SALT_ROUNDS = 12;

const signToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn } as jwt.SignOptions);

const toPublic = (user: { id: string; name: string; email: string; role: string; createdAt: Date }): UserPublic => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

export const authService = {
  async register(dto: RegisterDto): Promise<{ user: UserPublic; tokens: AuthTokens }> {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new AppError('Email already in use', 409);

    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hashed },
    });

    const tokens: AuthTokens = {
      accessToken: signToken({ id: user.id, email: user.email, role: user.role }),
    };

    return { user: toPublic(user), tokens };
  },

  async login(dto: LoginDto): Promise<{ user: UserPublic; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const tokens: AuthTokens = {
      accessToken: signToken({ id: user.id, email: user.email, role: user.role }),
    };

    return { user: toPublic(user), tokens };
  },

  async me(id: string): Promise<UserPublic> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('User not found', 404);
    return toPublic(user);
  },
};
