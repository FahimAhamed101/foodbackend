import express from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import adminLegalDocumentController from '../controllers/adminLegalDocument.controller';
import { UserRole } from '../models/user.model';

const router = express.Router();

// All legal document administration routes require ADMIN role
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

/**
 * @route GET /api/v1/admin/legal/documents
 * @desc Get all legal documents
 */
router.get('/documents', adminLegalDocumentController.getDocuments);

/**
 * @route POST /api/v1/admin/legal/documents
 * @desc Add a new legal document record
 */
router.post('/documents', adminLegalDocumentController.createDocument);

/**
 * @route PATCH /api/v1/admin/legal/documents/:id
 * @desc Update a legal document record
 */
router.patch('/documents/:id', adminLegalDocumentController.updateDocument);

/**
 * @route DELETE /api/v1/admin/legal/documents/:id
 * @desc Remove a legal document record
 */
router.delete('/documents/:id', adminLegalDocumentController.deleteDocument);

export default router;
