import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    name: string;
    role: 'founder' | 'investor' | 'admin';
    organizationId?: mongoose.Types.ObjectId;
    orgRole?: 'owner' | 'finance_manager' | 'growth_manager' | 'viewer';
    failedLoginAttempts: number;
    lockedUntil?: Date;
    resetToken?: string;
    resetTokenExpiry?: Date;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: '' },
    role: { type: String, enum: ['founder', 'investor', 'admin'], default: 'founder' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    orgRole: { type: String, enum: ['owner', 'finance_manager', 'growth_manager', 'viewer'], default: 'owner' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
