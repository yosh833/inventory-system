import bcrypt from 'bcryptjs';
import { db } from '../memory';
import { User, Role } from '../types';
import { AppError } from '../utils/errors';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { LoginInput, RegisterInput, CreateUserInput } from '../utils/validation';

export class AuthService {
  async login(input: LoginInput) {
    const user = db.findUserByEmail(input.email);
    
    if (!user || !user.isActive) {
      throw AppError.unauthorized('INVALID_CREDENTIALS', 'Credenciales inválidas');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw AppError.unauthorized('INVALID_CREDENTIALS', 'Credenciales inválidas');
    }

    user.lastLoginAt = new Date();
    db.users.set(user.id, user);

    const accessToken = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = await generateRefreshToken(user.id);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken
    };
  }

  async register(input: RegisterInput, currentUserRole: Role) {
    const role = currentUserRole === Role.ADMIN ? input.role : Role.OPERATOR;

    const existing = db.findUserByEmail(input.email);
    if (existing) {
      throw AppError.conflict('EMAIL_EXISTS', 'El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const now = new Date();
    const user: User = {
      id: db.generateId('usr_'),
      email: input.email.toLowerCase(),
      passwordHash,
      fullName: input.fullName,
      role,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    db.users.set(user.id, user);
    return this.sanitizeUser(user);
  }

  async createUser(input: CreateUserInput, currentUserId: string) {
    const existing = db.findUserByEmail(input.email);
    if (existing) {
      throw AppError.conflict('EMAIL_EXISTS', 'El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const now = new Date();
    const user: User = {
      id: db.generateId('usr_'),
      email: input.email.toLowerCase(),
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    db.users.set(user.id, user);
    return this.sanitizeUser(user);
  }

  async getProfile(userId: string) {
    const user = db.findById(db.users, userId);
    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'Usuario no encontrado');
    }
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, data: Partial<User>) {
    const user = db.findById(db.users, userId);
    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'Usuario no encontrado');
    }

    const updated = db.update(db.users, userId, data);
    return this.sanitizeUser(updated!);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = db.findById(db.users, userId);
    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'Usuario no encontrado');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw AppError.badRequest('INVALID_PASSWORD', 'Contraseña actual incorrecta');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.update(db.users, userId, { passwordHash });
    return { success: true };
  }

  async refreshAccessToken(refreshToken: string) {
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'inventory-secret-key-change-in-production');
    
    try {
      const { payload } = await jwtVerify(refreshToken, secret);
      if (payload.type !== 'refresh') throw new Error('Invalid token type');
      
      const user = db.findById(db.users, payload.userId as string);
      if (!user || !user.isActive) throw new Error('User not found');
      
      const accessToken = await generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      return { accessToken };
    } catch {
      throw AppError.unauthorized('INVALID_REFRESH_TOKEN', 'Token de renovación inválido');
    }
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}