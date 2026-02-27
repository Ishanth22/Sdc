import mongoose, { Document, Schema } from 'mongoose';

export interface IBenchmark extends Document {
    sector: string;
    stage: string;
    period: string;
    metrics: {
        avgRevenue: number;
        avgBurnRate: number;
        avgRunway: number;
        avgCac: number;
        avgLtv: number;
        avgActiveUsers: number;
        avgTeamSize: number;
        avgRndSpend: number;
    };
}

const BenchmarkSchema = new Schema<IBenchmark>({
    sector: { type: String, required: true },
    stage: { type: String, required: true },
    period: { type: String, required: true },
    metrics: {
        avgRevenue: { type: Number, default: 0 },
        avgBurnRate: { type: Number, default: 0 },
        avgRunway: { type: Number, default: 0 },
        avgCac: { type: Number, default: 0 },
        avgLtv: { type: Number, default: 0 },
        avgActiveUsers: { type: Number, default: 0 },
        avgTeamSize: { type: Number, default: 0 },
        avgRndSpend: { type: Number, default: 0 }
    }
});

BenchmarkSchema.index({ sector: 1, stage: 1, period: 1 }, { unique: true });

export default mongoose.model<IBenchmark>('Benchmark', BenchmarkSchema);
