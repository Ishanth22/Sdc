import mongoose, { Document, Schema } from 'mongoose';

export interface IStartupProfile extends Document {
    userId: mongoose.Types.ObjectId;
    companyName: string;
    cin: string;
    sector: string;
    stage: string;
    foundedDate: Date;
    city: string;
    teamSize: number;
    website: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

const StartupProfileSchema = new Schema<IStartupProfile>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true },
    cin: { type: String, unique: true, sparse: true },
    sector: {
        type: String,
        enum: ['Fintech', 'Healthtech', 'Edtech', 'Ecommerce', 'DeepTech', 'Agritech', 'Logistics', 'CleanTech', 'SaaS', 'Other'],
        required: true
    },
    stage: {
        type: String,
        enum: ['Idea', 'Seed', 'Early', 'Growth'],
        required: true
    },
    foundedDate: { type: Date, required: true },
    city: { type: String, required: true },
    teamSize: { type: Number, default: 1 },
    website: { type: String, default: '' },
    description: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model<IStartupProfile>('StartupProfile', StartupProfileSchema);
