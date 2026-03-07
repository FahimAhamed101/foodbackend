import { Schema, model, Document, Types } from 'mongoose';

export interface IProviderProfile extends Document {
    providerId: Types.ObjectId;
    profile: string; // URL for profile image
    restaurantName: string;
    contactEmail: string;
    phoneNumber: string;
    restaurantAddress: string;
    city: string;
    state: string;
    zipCode?: string;
    verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    verificationDocuments: string[];
    isVerify: boolean;
    isActive: boolean;
    status: 'ACTIVE' | 'BLOCKED';
    blockReason?: string;
    cuisine: string[];
    pickupWindows: { days: string[]; startTime: string; endTime: string }[];
    compliance: { alcoholNotice: { enabled: boolean; message?: string }; tax: { region?: string; rate?: number } };
    location: { lat?: number; lng?: number };
    createdAt: Date;
    updatedAt: Date;
}

const providerProfileSchema = new Schema<IProviderProfile>(
    {
        providerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Provider ID is required'],
            unique: true,
        },
        profile: {
            type: String,
            default: '',
        },
        restaurantName: {
            type: String,
            required: [true, 'Restaurant name is required'],
            trim: true,
            minlength: [2, 'Restaurant name must be at least 2 characters'],
            maxlength: [100, 'Restaurant name cannot exceed 100 characters'],
        },
        contactEmail: {
            type: String,
            required: [true, 'Contact email is required'],
            lowercase: true,
            trim: true,
            validate: {
                validator: (email: string) => /^\S+@\S+\.\S+$/.test(email),
                message: 'Invalid email format',
            },
        },
        phoneNumber: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
        },
        restaurantAddress: {
            type: String,
            required: [true, 'Restaurant address is required'],
            trim: true,
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true,
        },
        state: {
            type: String,
            required: [true, 'State is required'],
            trim: true,
        },
        zipCode: {
            type: String,
            trim: true,
        },
        verificationStatus: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING',
        },
        verificationDocuments: {
            type: [String],
            default: [],
        },
        isVerify: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // Enhanced fields for Admin Dashboard
        status: {
            type: String,
            enum: ['ACTIVE', 'BLOCKED'],
            default: 'ACTIVE'
        },
        blockReason: {
            type: String
        },
        cuisine: {
            type: [String],
            default: []
        },
        pickupWindows: [{
            days: [String],
            startTime: String,
            endTime: String
        }],
        compliance: {
            alcoholNotice: {
                enabled: { type: Boolean, default: false },
                message: String
            },
            tax: {
                region: String,
                rate: Number
            }
        },
        location: {
            lat: Number,
            lng: Number
        }
    },
    {
        timestamps: true,
    }
);

// Compound and Other Indexes
// providerId is already indexed due to unique: true above. 
// Add any compound indexes here if needed in future.

export const ProviderProfile = model<IProviderProfile>('ProviderProfile', providerProfileSchema);
