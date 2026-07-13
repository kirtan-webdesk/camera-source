import type { Response, NextFunction } from 'express';
import { cameraService } from '../services/camera.service';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse';
import type { CreateCameraDto, UpdateCameraDto } from '../models/camera.model';
import type { AuthRequest } from '../middleware/authenticate';

export const cameraController = {
  async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(String(req.query['page'] ?? '1'), 10);
      const limit = parseInt(String(req.query['limit'] ?? '10'), 10);
      const all = await cameraService.findAll(req.user?.id);
      const paginated = all.slice((page - 1) * limit, page * limit);
      sendPaginated(res, paginated, all.length, page, limit);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const camera = await cameraService.findById(String(req.params['id'] ?? ''));
      sendSuccess(res, camera);
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreateCameraDto;
      if (!dto.name || !dto.brand || !dto.model) {
        sendError(res, 'name, brand and model are required', 400);
        return;
      }
      const camera = await cameraService.create({ ...dto, userId: req.user!.id });
      sendSuccess(res, camera, 'Camera created', 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const camera = await cameraService.update(
        String(req.params['id'] ?? ''),
        req.body as UpdateCameraDto,
      );
      sendSuccess(res, camera, 'Camera updated');
    } catch (err) {
      next(err);
    }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await cameraService.delete(String(req.params['id'] ?? ''));
      sendSuccess(res, null, 'Camera deleted');
    } catch (err) {
      next(err);
    }
  },
};
