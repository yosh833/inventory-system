import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service';
import { loginSchema, registerSchema, createUserSchema, updateUserSchema } from '../utils/validation';
import { authMiddleware, requireAdmin, requireAnyRole } from '../middleware/auth';
import { Role } from '../types';

const authService = new AuthService();

export async function authRoutes(app: FastifyInstance) {
  // Public login
  app.post('/login', async (request, reply) => {
    const data = loginSchema.parse(request.body);
    const result = await authService.login(data);
    return reply.send({ success: true, data: result });
  });

  // Public register (only if no users exist - first admin)
  app.post('/register', async (request, reply) => {
    const data = registerSchema.parse(request.body);
    const userCount = Array.from((await import('../memory')).db.users.values()).length;
    const role = userCount === 0 ? Role.ADMIN : Role.OPERATOR;
    const user = await authService.register(data, role);
    return reply.code(201).send({ success: true, data: user });
  });

  // Refresh token
  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) {
      return reply.code(400).send({ success: false, error: 'REFRESH_TOKEN_REQUIRED' });
    }
    const result = await authService.refreshAccessToken(refreshToken);
    return reply.send({ success: true, data: result });
  });

  // Protected routes
  app.get('/me', { preHandler: authMiddleware }, async (request, reply) => {
    const user = await authService.getProfile(request.user!.userId);
    return reply.send({ success: true, data: user });
  });

  app.put('/me', { preHandler: authMiddleware }, async (request, reply) => {
    const data = updateUserSchema.parse(request.body);
    const user = await authService.updateProfile(request.user!.userId, data);
    return reply.send({ success: true, data: user });
  });

  app.put('/me/password', { preHandler: authMiddleware }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return reply.code(400).send({ success: false, error: 'INVALID_PASSWORD', message: 'Contraseña nueva debe tener al menos 6 caracteres' });
    }
    await authService.changePassword(request.user!.userId, currentPassword, newPassword);
    return reply.send({ success: true, message: 'Contraseña actualizada' });
  });

  // Admin only - User management
  app.get('/users', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const { page = 1, pageSize = 20, search, role, isActive } = request.query as any;
    const { db } = await import('../memory');
    
    let users = Array.from(db.users.values());
    
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u => u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    if (role) users = users.filter(u => u.role === role);
    if (isActive !== undefined) users = users.filter(u => u.isActive === (isActive === 'true'));

    users.sort((a, b) => a.fullName.localeCompare(b.fullName));
    
    const total = users.length;
    const start = (page - 1) * pageSize;
    const data = users.slice(start, start + pageSize).map(u => {
      const { passwordHash, ...rest } = u;
      return rest;
    });

    return reply.send({
      success: true,
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  });

  app.post('/users', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const data = createUserSchema.parse(request.body);
    const user = await authService.createUser(data, request.user!.userId);
    return reply.code(201).send({ success: true, data: user });
  });

  app.put('/users/:id', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateUserSchema.parse(request.body);
    const user = await authService.updateProfile(id, data);
    return reply.send({ success: true, data: user });
  });

  app.delete('/users/:id', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (id === request.user!.userId) {
      return reply.code(400).send({ success: false, error: 'CANNOT_DELETE_SELF', message: 'No puedes eliminarte a ti mismo' });
    }
    const { db } = await import('../memory');
    const user = db.users.get(id);
    if (!user) return reply.code(404).send({ success: false, error: 'USER_NOT_FOUND' });
    
    user.isActive = false;
    db.users.set(id, user);
    return reply.send({ success: true, message: 'Usuario desactivado' });
  });
}