import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
    name: string;
    ownerId: mongoose.Types.ObjectId;
    members: {
        userId: mongoose.Types.ObjectId;
        role: 'owner' | 'finance_manager' | 'growth_manager' | 'viewer';
        joinedAt: Date;
    }[];
    invites: {
        email: string;
        role: 'finance_manager' | 'growth_manager' | 'viewer';
        token: string;
        expiresAt: Date;
    }[];
    createdAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>({
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'finance_manager', 'growth_manager', 'viewer'], default: 'viewer' },
        joinedAt: { type: Date, default: Date.now }
    }],
    invites: [{
        email: { type: String, required: true },
        role: { type: String, enum: ['finance_manager', 'growth_manager', 'viewer'], default: 'viewer' },
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true }
    }],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
