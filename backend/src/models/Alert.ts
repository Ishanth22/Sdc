import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
    startupId: mongoose.Types.ObjectId;
    type: 'runway' | 'burn_rate' | 'revenue_drop' | 'churn_spike' | 'risk_level' | 'funding';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    period: string;
    dismissed: boolean;
    createdAt: Date;
}

const AlertSchema = new Schema<IAlert>({
    startupId: { type: Schema.Types.ObjectId, ref: 'StartupProfile', required: true },
    type: {
        type: String,
        enum: ['runway', 'burn_rate', 'revenue_drop', 'churn_spike', 'risk_level', 'funding'],
        required: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'warning'
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    period: { type: String, required: true },
    dismissed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

AlertSchema.index({ startupId: 1, createdAt: -1 });

export default mongoose.model<IAlert>('Alert', AlertSchema);
