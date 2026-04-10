import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalysisCache extends Document {
    startupId: mongoose.Types.ObjectId;
    cacheType: 'forecast' | 'risk-prediction' | 'benchmark';
    dataHash: string;           
    result: any;                
    isAIPowered: boolean;       
    generatedAt: Date;
    expiresAt: Date;            
}

const AnalysisCacheSchema = new Schema<IAnalysisCache>({
    startupId: { type: Schema.Types.ObjectId, ref: 'StartupProfile', required: true },
    cacheType: { type: String, enum: ['forecast', 'risk-prediction', 'benchmark'], required: true },
    dataHash: { type: String, required: true },
    result: { type: Schema.Types.Mixed, required: true },
    isAIPowered: { type: Boolean, default: false },
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
});


AnalysisCacheSchema.index({ startupId: 1, cacheType: 1 }, { unique: true });

AnalysisCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAnalysisCache>('AnalysisCache', AnalysisCacheSchema);
