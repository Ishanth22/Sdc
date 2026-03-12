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
        revenueGrowth: number;
        userGrowth: number;
        burnEfficiency: number;
        churnStability: number;
        runwayStability: number;
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
        impact: { type: Number, default: 0 },
        revenueGrowth: { type: Number, default: 0 },
        userGrowth: { type: Number, default: 0 },
        burnEfficiency: { type: Number, default: 0 },
        churnStability: { type: Number, default: 0 },
        runwayStability: { type: Number, default: 0 }
    },
    riskFlags: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

VitalityScoreSchema.index({ startupId: 1, period: 1 }, { unique: true });

export default mongoose.model<IVitalityScore>('VitalityScore', VitalityScoreSchema);
