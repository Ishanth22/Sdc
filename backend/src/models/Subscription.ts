import mongoose, { Document, Schema } from 'mongoose';

export type PlanType = 'free' | 'pro' | 'enterprise';

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    plan: PlanType;
    activatedAt: Date;
    expiresAt: Date | null;
}

const SubscriptionSchema = new Schema<ISubscription>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    activatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }
});

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

// Feature access matrix
export const PLAN_FEATURES: Record<PlanType, string[]> = {
    free: [
        'dashboard_basic',
        'metrics_submit',
        'milestones',
        'alerts_basic',
    ],
    pro: [
        'dashboard_basic',
        'metrics_submit',
        'milestones',
        'alerts_basic',
        'health_score',
        'alerts_full',
        'forecasting',
        'ai_advisor',
        'score_history',
        'report_export',
    ],
    enterprise: [
        'dashboard_basic',
        'metrics_submit',
        'milestones',
        'alerts_basic',
        'health_score',
        'alerts_full',
        'forecasting',
        'ai_advisor',
        'score_history',
        'report_export',
        'investor_mode',
        'benchmarking',
        'scenario_simulation',
        'custom_kpi',
        'audit_logs',
        'team_management',
    ]
};
