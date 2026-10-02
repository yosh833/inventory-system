export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;

    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(code: string, message: string) {
    return new AppError(code, message, 400);
  }

  static unauthorized(code: string, message: string) {
    return new AppError(code, message, 401);
  }

  static forbidden(code: string, message: string) {
    return new AppError(code, message, 403);
  }

  static notFound(code: string, message: string) {
    return new AppError(code, message, 404);
  }

  static conflict(code: string, message: string) {
    return new AppError(code, message, 409);
  }

  static internal(code: string, message: string) {
    return new AppError(code, message, 500);
  }
}

export function errorHandler(error: Error, request: any, reply: any) {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.code,
      message: error.message
    });
  }

  // Zod validation errors
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Datos de entrada inválidos',
      details: error.errors
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return reply.status(401).send({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Token inválido o expirado'
    });
  }

  return reply.status(500).send({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'Error interno del servidor'
  });
}