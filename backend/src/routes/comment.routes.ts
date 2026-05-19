import { Router } from 'express';
import { getComments, createComment, updateComment, deleteComment } from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/ticket/:ticketId', getComments);
router.post('/ticket/:ticketId', createComment);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;
