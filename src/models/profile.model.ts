import { Schema, model, Document, Types } from 'mongoose';

export interface IProfile extends Document {
    userId: Types.ObjectId;
    name: string;
    phone: string;
    dateOfBirth: Date;
    address: string;
    city: string;
    state: string;
    profilePic: string;
    avatar: string;
    description: string;
    bio: string;
    isVerify: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        name: {
            type: String,
            trim: true,
            default: '',
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        dateOfBirth: {
            type: Date,
        },
        address: {
            type: String,
            trim: true,
            default: '',
        },
        city: {
            type: String,
            trim: true,
            default: '',
            index: true,
        },
        state: {
            type: String,
            trim: true,
            default: '',
            index: true,
        },
        profilePic: {
            type: String,
            default: '',
        },
        avatar: {
            type: String,
            default: '',
        },
        bio: {
            type: String,
            trim: true,
            default: '',
        },
        isVerify: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Profile = model<IProfile>('Profile', profileSchema);
