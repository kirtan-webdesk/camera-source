import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import type { CreateCameraDto, UpdateCameraDto } from '../models/camera.model';

export const cameraService = {
  findAll(userId?: string) {
    return prisma.camera.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    const camera = await prisma.camera.findUnique({ where: { id } });
    if (!camera) throw new AppError(`Camera "${id}" not found`, 404);
    return camera;
  },

  create(dto: CreateCameraDto & { userId: string }) {
    return prisma.camera.create({ data: dto });
  },

  async update(id: string, dto: UpdateCameraDto) {
    await this.findById(id);
    return prisma.camera.update({ where: { id }, data: dto });
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.camera.delete({ where: { id } });
  },
};
