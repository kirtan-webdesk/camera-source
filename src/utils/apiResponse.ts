import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): void => {
  const response: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: string[],
): void => {
  const response: ApiResponse = { success: false, message, errors };
  res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success',
): void => {
  const response: PaginatedResponse<T> = {
    success: true,
    message,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
  res.status(200).json(response);
};
