import { State } from '../models/state.model';
import AppError from '../utils/AppError';

class AdminTaxService {
    /**
     * Get overall tax dashboard statistics
     */
    async getTaxDashboard() {
        const totalStates = await State.countDocuments();
        const activeStates = await State.countDocuments({ isActive: true, tax: { $gt: 0 } });
        const remainingStates = totalStates - activeStates;

        const stateRules = await State.find({})
            .sort({ name: 1 })
            .select('name tax isActive updatedAt')
            .lean();

        return {
            "Tax information": {
                "ToralStates": totalStates,
                "Active": activeStates,
                "RemainingStates": remainingStates
            },
            "StateTexRules": stateRules.map(s => ({
                id: s._id,
                state: s.name,
                TaxRules: `${s.tax}%`,
                Status: s.isActive ? 'Active' : 'Inactive',
                LastUpdated: s.updatedAt
            }))
        };
    }

    /**
     * Create or Update a tax rule for a state
     */
    async updateTaxRule(stateId: string, data: { tax?: number; isActive?: boolean }) {
        const state = await State.findByIdAndUpdate(
            stateId,
            {
                $set: {
                    ...(data.tax !== undefined && { tax: data.tax }),
                    ...(data.isActive !== undefined && { isActive: data.isActive })
                }
            },
            { new: true, runValidators: true }
        );

        if (!state) {
            throw new AppError('State tax rule not found', 404);
        }

        return state;
    }

    /**
     * Create a new state tax rule (if it doesn't exist)
     */
    async createTaxRule(data: { name: string; code: string; tax: number; isActive?: boolean }) {
        const existing = await State.findOne({ code: data.code.toUpperCase() });
        if (existing) {
            throw new AppError('Tax rule for this state already exists. Use update instead.', 400);
        }

        return await State.create({
            name: data.name,
            code: data.code.toUpperCase(),
            tax: data.tax,
            isActive: data.isActive ?? true,
            country: 'USA'
        });
    }

    /**
     * Delete a tax rule (Soft or Hard? User said CRUD, usually Admin can delete)
     */
    async deleteTaxRule(stateId: string) {
        const state = await State.findByIdAndDelete(stateId);
        if (!state) {
            throw new AppError('State tax rule not found', 404);
        }
        return { message: 'Tax rule deleted successfully' };
    }
}

export default new AdminTaxService();
