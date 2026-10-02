import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { JWTPayload, Role } from '../types';
import { AppError } from '../utils/errors';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = extractTokenFromHeader(request.headers.authorization);
  
  if (!token) {
    throw AppError.unauthorized('TOKEN_MISSING', 'Token de autenticación requerido');
  }

  const payload = await verifyToken(token);
  
  if (!payload) {
    throw AppError.unauthorized('TOKEN_INVALID', 'Token inválido o expirado');
  }

  request.user = payload;
}

export function requireRoles(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw AppError.unauthorized('NOT_AUTHENTICATED', 'Usuario no autenticado');
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw AppError.forbidden('INSUFFICIENT_PERMISSIONS', 'Permisos insuficientes para esta acción');
    }
  };
}

export const requireAdmin = requireRoles(Role.ADMIN);
export const requireOperatorOrAdmin = requireRoles(Role.OPERATOR, Role.ADMIN);
export const requireAnyRole = requireRoles(Role.ADMIN, Role.OPERATOR, Role.CLIENT);