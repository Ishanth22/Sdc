import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomKPI extends Document {
    startupId: mongoose.Types.ObjectId;
    name: string;
    formula: string; // e.g. "revenue / activeUsers"
    unit: string;    // e.g. "%", "₹", "x", "ratio"
    description?: string;
    values: { period: string; value: number }[];
    createdAt: Date;
}

const CustomKPISchema = new Schema<ICustomKPI>({
    startupId: { type: Schema.Types.ObjectId, ref: 'StartupProfile', required: true },
    name: { type: String, required: true },
    formula: { type: String, required: true },
    unit: { type: String, default: '' },
    description: { type: String },
    values: [{
        period: { type: String, required: true },
        value: { type: Number, required: true }
    }],
    createdAt: { type: Date, default: Date.now }
});

CustomKPISchema.index({ startupId: 1 });

export default mongoose.model<ICustomKPI>('CustomKPI', CustomKPISchema);
