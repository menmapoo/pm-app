import { Router } from 'express';
import {
  getMyProfile,
  submitChangeRequest,
  changePassword,
  getAllRequests,
  approveRequest,
  rejectRequest,
  getPendingCount,
} from '../controllers/profile.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// User routes
router.get('/me', getMyProfile);
router.post('/request', submitChangeRequest);
router.post('/change-password', changePassword);

// Admin routes
router.get('/requests', requireAdmin, getAllRequests);
router.get('/requests/pending-count', requireAdmin, getPendingCount);
router.patch('/requests/:id/approve', requireAdmin, approveRequest);
router.patch('/requests/:id/reject', requireAdmin, rejectRequest);

export default router;
