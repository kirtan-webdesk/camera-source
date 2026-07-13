import { Router } from 'express';
import authRoutes from './auth.routes';
import cameraRoutes from './camera.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/cameras', cameraRoutes);

export default router;
