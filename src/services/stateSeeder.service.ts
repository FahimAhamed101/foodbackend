import { State } from '../models/state.model';
import statesData from '../data/usa-states.json';

class StateSeeder {
    async seedStates() {
        console.log('🌱 Starting state seeding process...');

        let inserted = 0;
        let skipped = 0;
        let errors = 0;

        try {
            for (const stateData of statesData) {
                try {
                    const result = await State.findOneAndUpdate(
                        {
                            code: stateData.code.toUpperCase(),
                            country: stateData.country.toUpperCase(),
                        },
                        {
                            name: stateData.name,
                            code: stateData.code.toUpperCase(),
                            country: stateData.country.toUpperCase(),
                            tax: Number((stateData as any).Tax || 0),
                            isActive: true,
                        },
                        {
                            upsert: true,
                            new: true,
                            runValidators: true,
                        }
                    );

                    if (result) {
                        // Check if this was a new insert or existing document
                        const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
                        if (isNew) {
                            inserted++;
                            console.log(`✅ Inserted: ${stateData.name} (${stateData.code})`);
                        } else {
                            skipped++; // Reusing skipped for updated in logs for now, or I could add a new counter
                            console.log(`🔄 Updated: ${stateData.name} (${stateData.code})`);
                        }
                    }
                } catch (error: any) {
                    errors++;
                    console.error(`❌ Error seeding ${stateData.name}:`, error.message);
                }
            }

            console.log('\n📊 Seeding Summary:');
            console.log(`   ✅ Inserted: ${inserted}`);
            console.log(`   ⏭️  Skipped: ${skipped}`);
            console.log(`   ❌ Errors: ${errors}`);
            console.log(`   📝 Total: ${statesData.length}`);

            return {
                success: true,
                inserted,
                skipped,
                errors,
                total: statesData.length,
            };
        } catch (error: any) {
            console.error('❌ Fatal error during seeding:', error);
            throw error;
        }
    }


    async getAllStates() {
        return await State.find({ isActive: true }).sort({ name: 1 }).lean();
    }


    async getStateByCode(code: string) {
        return await State.findOne({
            code: code.toUpperCase(),
            isActive: true,
        }).lean();
    }
}

export default new StateSeeder();
