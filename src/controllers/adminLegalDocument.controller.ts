import { Request, Response, NextFunction } from 'express';
import adminLegalDocumentService from '../services/adminLegalDocument.service';
import { AuthRequest } from '../middlewares/authenticate';

class AdminLegalDocumentController {
    /**
     * Get list of all legal documents
     */
    async getDocuments(req: Request, res: Response, next: NextFunction) {
        try {
            const docs = await adminLegalDocumentService.getAllDocuments(req.query);
            res.status(200).json({
                success: true,
                data: docs
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create a new legal document entry
     */
    async createDocument(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const adminId = req.user?.userId || 'system';
            const doc = await adminLegalDocumentService.createDocument(req.body, adminId);
            res.status(201).json({
                success: true,
                message: 'Legal document record created',
                data: doc
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update a legal document entry
     */
    async updateDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const doc = await adminLegalDocumentService.updateDocument(req.params.id as string, req.body);
            res.status(200).json({
                success: true,
                message: 'Document updated successfully',
                data: doc
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a legal document entry
     */
    async deleteDocument(req: Request, res: Response, next: NextFunction) {
        try {
            await adminLegalDocumentService.deleteDocument(req.params.id as string);
            res.status(200).json({
                success: true,
                message: 'Document deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new AdminLegalDocumentController();
