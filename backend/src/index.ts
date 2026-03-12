import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import authRoutes from './routes/auth';
import startupRoutes from './routes/startup';
import metricsRoutes from './routes/metrics';
import scoreRoutes from './routes/score';
import benchmarkRoutes from './routes/benchmark';
import adminRoutes from './routes/admin';
import milestoneRoutes from './routes/milestones';
import alertRoutes from './routes/alerts';
import investorRoutes from './routes/investor';
import advisorRoutes from './routes/advisor';
import forecastRoutes from './routes/forecast';
import simulationRoutes from './routes/simulation';
import customKpiRoutes from './routes/customKpi';
import subscriptionRoutes from './routes/subscription';
import auditRoutes from './routes/audit';
import reportRoutes from './routes/reports';
import aiRiskRoutes from './routes/aiRisk';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/startup', startupRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/benchmark', benchmarkRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/investor', investorRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/custom-kpi', customKpiRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai-risk', aiRiskRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://lmelvindenish_db_user:melvindenish@cluster0.t5hb9cw.mongodb.net/nspms?appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀 VenturePulse Backend running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

export default app;
