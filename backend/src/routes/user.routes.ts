import { Router } from 'express';
import { body } from 'express-validator';
import { getUsers, getUserById, createUser, updateUser, toggleUserStatus } from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
], createUser);
router.put('/:id', requireAdmin, updateUser);
router.patch('/:id/toggle-status', requireAdmin, toggleUserStatus);

export default router;
