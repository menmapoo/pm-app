import { Router } from 'express';
import { getActivity } from '../controllers/activity.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getActivity);

export default router;
