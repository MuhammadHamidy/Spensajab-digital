import { AppError } from './AppError';

// Map internal errors into consistent API responses
export function mapError(error: unknown) {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }
  return {
    message: 'Internal Server Error',
    statusCode: 500,
  };
}
