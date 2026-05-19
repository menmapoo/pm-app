import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getGantt } from '../controllers/gantt.controller';

const router = Router();

router.get('/', authenticate, getGantt);

export default router;
