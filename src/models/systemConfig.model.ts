import { Schema, model, Document } from 'mongoose';

export interface ISystemConfig extends Document {
    key: string;
    value: any;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        value: {
            type: Schema.Types.Mixed,
            required: true,
        },
        description: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

export const SystemConfig = model<ISystemConfig>('SystemConfig', systemConfigSchema);
