import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import supportTicketService from '../services/supportTicket.service';
import { catchAsync } from '../utils/catchAsync';

class SupportTicketController {
    /**
     * Create Ticket (Customer/Provider)
     * POST /api/v1/support/tickets
     */
    createTicket = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const ticket = await supportTicketService.createTicket(userId, req.body);

        res.status(201).json({
            success: true,
            message: 'Support ticket created successfully',
            data: ticket
        });
    });

    /**
     * Get All Tickets (Admin)
     * GET /api/v1/admin/support/tickets
     */
    getAdminTickets = catchAsync(async (req: AuthRequest, res: Response) => {
        const data = await supportTicketService.getAdminTickets(req.query);

        res.status(200).json({
            success: true,
            data: data
        });
    });

    /**
     * Get My Tickets (User)
     * GET /api/v1/support/my-tickets
     */
    getMyTickets = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const tickets = await supportTicketService.getUserTickets(userId);

        res.status(200).json({
            success: true,
            data: tickets
        });
    });

    /**
     * Update Ticket (Admin)
     * PATCH /api/v1/admin/support/tickets/:id
     */
    updateTicket = catchAsync(async (req: AuthRequest, res: Response) => {
        const ticket = await supportTicketService.updateTicket(req.params.id as string, req.body);

        res.status(200).json({
            success: true,
            message: 'Ticket updated successfully',
            data: ticket
        });
    });

    /**
     * Get Ticket Details
     * GET /api/v1/support/tickets/:id
     */
    getTicket = catchAsync(async (req: AuthRequest, res: Response) => {
        const ticket = await supportTicketService.getTicket(req.params.id as string);

        res.status(200).json({
            success: true,
            data: ticket
        });
    });
}

export default new SupportTicketController();
