import mongoose, { Document, Schema } from 'mongoose';

export interface IKeyResult {
    title: string;
    target: number;
    current: number;
    unit: string;
}

export interface IMilestone extends Document {
    startupId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    category: 'product' | 'funding' | 'team' | 'market' | 'legal' | 'other';
    deadline: Date;
    completionPercent: number;
    completed: boolean;
    completedAt?: Date;
    // OKR Support
    isOKR: boolean;
    objectiveType?: 'quarterly' | 'annual' | 'custom';
    keyResults: IKeyResult[];
    createdAt: Date;
    updatedAt: Date;
}

const KeyResultSchema = new Schema<IKeyResult>({
    title: { type: String, required: true },
    target: { type: Number, required: true },
    current: { type: Number, default: 0 },
    unit: { type: String, default: '' }
}, { _id: true });

const MilestoneSchema = new Schema<IMilestone>({
    startupId: { type: Schema.Types.ObjectId, ref: 'StartupProfile', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
        type: String,
        enum: ['product', 'funding', 'team', 'market', 'legal', 'other'],
        default: 'other'
    },
    deadline: { type: Date, required: true },
    completionPercent: { type: Number, default: 0, min: 0, max: 100 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    isOKR: { type: Boolean, default: false },
    objectiveType: { type: String, enum: ['quarterly', 'annual', 'custom'] },
    keyResults: [KeyResultSchema]
}, { timestamps: true });

MilestoneSchema.index({ startupId: 1 });

export default mongoose.model<IMilestone>('Milestone', MilestoneSchema);
