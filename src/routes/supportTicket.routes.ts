import express from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../models/user.model';
import supportTicketController from '../controllers/supportTicket.controller';

const router = express.Router();

// 🔓 Auth Required for all support actions
router.use(authenticate);

// 👤 User Routes (Customer/Provider)
router.post('/tickets', supportTicketController.createTicket);
router.get('/my-tickets', supportTicketController.getMyTickets);
router.get('/tickets/:id', supportTicketController.getTicket);

// 👑 Admin Routes
router.get(
    '/admin/tickets',
    requireRole([UserRole.ADMIN]),
    supportTicketController.getAdminTickets
);

router.patch(
    '/admin/tickets/:id',
    requireRole([UserRole.ADMIN]),
    supportTicketController.updateTicket
);

export default router;
