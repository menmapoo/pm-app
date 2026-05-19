import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProjects, getProjectById, createProject, updateProject,
  deleteProject, addMember, removeMember, updateMemberRole,
} from '../controllers/project.controller';
import {
  previewImport, confirmImport, downloadTemplate, exportProjects,
} from '../controllers/projectImport.controller';
import { authenticate, requireManagerOrAdmin } from '../middleware/auth.middleware';
import { createFileUpload } from '../utils/upload';

const router = Router();
const upload = createFileUpload();

router.use(authenticate);

// Data transfer — must appear before /:id
router.get('/export', requireManagerOrAdmin, exportProjects);
router.get('/import/template', requireManagerOrAdmin, downloadTemplate);
router.post('/import/preview', requireManagerOrAdmin, upload.single('file'), previewImport);
router.post('/import/confirm', requireManagerOrAdmin, confirmImport);

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', requireManagerOrAdmin, [
  body('name').trim().notEmpty(),
  body('key').trim().notEmpty().isLength({ min: 2, max: 6 }),
], createProject);
router.put('/:id', requireManagerOrAdmin, updateProject);
router.delete('/:id', requireManagerOrAdmin, deleteProject);

router.post('/:id/members', requireManagerOrAdmin, addMember);
router.delete('/:id/members/:userId', requireManagerOrAdmin, removeMember);
router.patch('/:id/members/:userId', requireManagerOrAdmin, updateMemberRole);

export default router;
