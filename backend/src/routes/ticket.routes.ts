import { Router } from 'express';
import { body } from 'express-validator';
import {
  getTickets, getTicketById, createTicket, updateTicket,
  deleteTicket, updateTicketStatus, getKanbanTickets,
} from '../controllers/ticket.controller';
import {
  previewTicketImport, confirmTicketImport, downloadTicketTemplate, exportTickets,
} from '../controllers/ticketImport.controller';
import { authenticate, requireManagerOrAdmin } from '../middleware/auth.middleware';
import { createFileUpload } from '../utils/upload';

const router = Router();
const upload = createFileUpload();

router.use(authenticate);

// Data transfer — must appear before /:id
router.get('/export', requireManagerOrAdmin, exportTickets);
router.get('/import/template', requireManagerOrAdmin, downloadTicketTemplate);
router.post('/import/preview', requireManagerOrAdmin, upload.single('file'), previewTicketImport);
router.post('/import/confirm', requireManagerOrAdmin, confirmTicketImport);

router.get('/', getTickets);
router.get('/kanban', getKanbanTickets);
router.get('/:id', getTicketById);
router.post('/', [
  body('title').trim().notEmpty(),
  body('projectId').notEmpty(),
], createTicket);
router.put('/:id', updateTicket);
router.delete('/:id', deleteTicket);
router.patch('/:id/status', updateTicketStatus);

export default router;
