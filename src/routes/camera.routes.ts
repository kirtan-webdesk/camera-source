import { Router } from 'express';
import { cameraController } from '../controllers/camera.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', cameraController.getAll);
router.get('/:id', cameraController.getById);
router.post('/', cameraController.create);
router.put('/:id', cameraController.update);
router.delete('/:id', cameraController.remove);

export default router;
