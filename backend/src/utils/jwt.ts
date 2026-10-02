import { JWTPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'inventory-secret-key-change-in-production';
const JWT_EXPIRES_IN = '8h';
const REFRESH_EXPIRES_IN = '7d';

export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  return await new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRES_IN)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}