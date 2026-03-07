import { Schema, model, Document } from 'mongoose';

export enum UserRole {
    CUSTOMER = 'CUSTOMER',
    PROVIDER = 'PROVIDER',
    ADMIN = 'ADMIN',
}

export enum AuthProvider {
    EMAIL = 'email',
    GOOGLE = 'google',
    FACEBOOK = 'facebook',
}

export interface IUser extends Document {
    fullName: string;
    email: string;
    passwordHash?: string;
    role: UserRole;
    isEmailVerified: boolean;
    authProvider: AuthProvider;


    googleId?: string;
    googleEmail?: string;
    googlePicture?: string;


    roleAssignedAt: Date;
    roleAssignedBy?: string; // 'system' | 'admin' | userId
    isProviderApproved?: boolean;
    providerApprovedAt?: Date;
    providerApprovedBy?: string;


    isActive: boolean;
    isSuspended: boolean;
    suspendedReason?: string;
    suspendedAt?: Date;

    phone?: string;
    profilePic?: string;

    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        passwordHash: {
            type: String,
            select: false,
        },
        role: {
            type: String,
            enum: Object.values(UserRole),
            default: UserRole.CUSTOMER,
            index: true,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        authProvider: {
            type: String,
            enum: Object.values(AuthProvider),
            default: AuthProvider.EMAIL,
            required: true,
        },


        googleId: {
            type: String,
            sparse: true,
            unique: true,
            index: true,
        },
        googleEmail: {
            type: String,
            lowercase: true,
            trim: true,
        },
        googlePicture: {
            type: String,
        },


        roleAssignedAt: {
            type: Date,
            default: Date.now,
        },
        roleAssignedBy: {
            type: String,
            default: 'system',
        },
        isProviderApproved: {
            type: Boolean,
            default: false,
        },
        providerApprovedAt: {
            type: Date,
        },
        providerApprovedBy: {
            type: String,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
        isSuspended: {
            type: Boolean,
            default: false,
        },
        suspendedReason: {
            type: String,
        },
        suspendedAt: {
            type: Date,
        },

        phone: {
            type: String,
            trim: true,
        },
        profilePic: {
            type: String,
            default: '',
        },

        lastLoginAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.index({ googleId: 1, authProvider: 1 });

userSchema.index({ role: 1, isActive: 1 });

userSchema.pre('save', function () {
    // Allow email-only registration for provider onboarding (password set in Step 3)
    // Only require password if user is already email-verified (meaning they should have set it)
    if (this.authProvider === AuthProvider.EMAIL && !this.passwordHash && this.isNew && this.isEmailVerified) {
        throw new Error('Password is required for email authentication');
    }
});

userSchema.pre('save', function () {
    if (this.authProvider === AuthProvider.GOOGLE && !this.googleId && this.isNew) {
        throw new Error('Google ID is required for Google authentication');
    }
});

export const User = model<IUser>('User', userSchema);
