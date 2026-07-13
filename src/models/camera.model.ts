export interface Camera {
  id: string;
  name: string;
  brand: string;
  model: string;
  resolution: string;
  frameRate: number;
  isActive: boolean;
  streamUrl?: string | null;
  location?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCameraDto = Omit<Camera, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateCameraDto = Partial<CreateCameraDto>;
