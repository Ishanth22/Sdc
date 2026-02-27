import mongoose, { Document, Schema } from 'mongoose';

export interface IVitalityScore extends Document {
    startupId: mongoose.Types.ObjectId;
    period: string;
    score: number;
    components: {
        financial: number;
        operational: number;
        innovation: number;
        impact: number;
    };
    riskFlags: string[];
    createdAt: Date;
}

const VitalityScoreSchema = new Schema<IVitalityScore>({
    startupId: { type: Schema.Types.ObjectId, ref: 'StartupProfile', required: true },
    period: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    components: {
        financial: { type: Number, default: 0 },
        operational: { type: Number, default: 0 },
        innovation: { type: Number, default: 0 },
        impact: { type: Number, default: 0 }
    },
    riskFlags: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

VitalityScoreSchema.index({ startupId: 1, period: 1 }, { unique: true });

export default mongoose.model<IVitalityScore>('VitalityScore', VitalityScoreSchema);
