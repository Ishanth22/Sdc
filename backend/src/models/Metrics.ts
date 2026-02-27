import mongoose, { Document, Schema } from 'mongoose';

export interface IMetrics extends Document {
    startupId: mongoose.Types.ObjectId;
    period: string; // YYYY-MM
    financial: {
        revenue: number;
        burnRate: number;
        runwayMonths: number;
        fundingAmount: number;
        fundingType: string;
        investorName: string;
    };
    operational: {
        activeUsers: number;
        newUsers: number;
        cac: number;
        ltv: number;
        gmv: number;
        citiesServed: number;
    };
    innovation: {
        patentsFiled: number;
        patentsGranted: number;
        trademarksFiled: number;
        rndSpend: number;
    };
    impact: {
        directJobs: number;
        womenEmployees: number;
        ruralEmployees: number;
        exportsInr: number;
    };
    createdAt: Date;
}

const MetricsSchema = new Schema<IMetrics>({
    startupId: { type: Schema.Types.ObjectId, ref: 'StartupProfile', required: true },
    period: { type: String, required: true },
    financial: {
        revenue: { type: Number, default: 0 },
        burnRate: { type: Number, default: 0 },
        runwayMonths: { type: Number, default: 0 },
        fundingAmount: { type: Number, default: 0 },
        fundingType: { type: String, enum: ['Equity', 'Debt', 'Grant', 'None'], default: 'None' },
        investorName: { type: String, default: '' }
    },
    operational: {
        activeUsers: { type: Number, default: 0 },
        newUsers: { type: Number, default: 0 },
        cac: { type: Number, default: 0 },
        ltv: { type: Number, default: 0 },
        gmv: { type: Number, default: 0 },
        citiesServed: { type: Number, default: 0 }
    },
    innovation: {
        patentsFiled: { type: Number, default: 0 },
        patentsGranted: { type: Number, default: 0 },
        trademarksFiled: { type: Number, default: 0 },
        rndSpend: { type: Number, default: 0 }
    },
    impact: {
        directJobs: { type: Number, default: 0 },
        womenEmployees: { type: Number, default: 0 },
        ruralEmployees: { type: Number, default: 0 },
        exportsInr: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
});

MetricsSchema.index({ startupId: 1, period: 1 }, { unique: true });

export default mongoose.model<IMetrics>('Metrics', MetricsSchema);
