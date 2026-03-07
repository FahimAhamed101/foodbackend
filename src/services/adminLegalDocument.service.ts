import { LegalDocument, LegalDocumentStatus } from '../models/legalDocument.model';
import AppError from '../utils/AppError';

class AdminLegalDocumentService {
    /**
     * Get legal documents with search, pagination and filtering
     */
    async getAllDocuments(queryParams: any) {
        const { search, status, page = 1, limit = 10 } = queryParams;

        const query: any = {};

        // 1. Search Filter
        if (search) {
            query.documentName = { $regex: new RegExp(search, 'i') };
        }

        // 2. Status Filter
        if (status) {
            query.status = status;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [docs, total] = await Promise.all([
            LegalDocument.find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            LegalDocument.countDocuments(query)
        ]);

        return {
            documents: docs.map(doc => ({
                id: doc._id,
                DocumentName: doc.documentName,
                Type: doc.type,
                Size: doc.size,
                LastUpdated: doc.updatedAt,
                Status: doc.status,
                fileUrl: doc.fileUrl
            })),
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    }

    /**
     * Create a new legal document entry
     */
    async createDocument(data: any, adminId: string) {
        return await LegalDocument.create({
            documentName: data.DocumentName || data.documentName,
            type: data.Type || data.type,
            size: data.Size || data.size || data.Siye, // Support both
            fileUrl: data.fileUrl,
            status: data.Status || LegalDocumentStatus.DRAFT,
            uploadedBy: adminId
        });
    }

    /**
     * Update an existing legal document
     */
    async updateDocument(docId: string, data: any) {
        const updateObj: any = {};
        if (data.DocumentName) updateObj.documentName = data.DocumentName;
        if (data.Type) updateObj.type = data.Type;
        if (data.Size || data.Siye) updateObj.size = data.Size || data.Siye;
        if (data.Status) updateObj.status = data.Status;
        if (data.fileUrl) updateObj.fileUrl = data.fileUrl;

        const doc = await LegalDocument.findByIdAndUpdate(docId, { $set: updateObj }, { new: true });
        if (!doc) throw new AppError('Document not found', 404);
        return doc;
    }

    /**
     * Delete a legal document
     */
    async deleteDocument(docId: string) {
        const doc = await LegalDocument.findByIdAndDelete(docId);
        if (!doc) throw new AppError('Document not found', 404);
        return { message: 'Document deleted successfully' };
    }
}

export default new AdminLegalDocumentService();
