import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

// CORS — allow local dev and Vercel production frontend
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL || '',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());


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


app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set!');
  process.exit(1);
}

mongoose.connect(MONGO_URI!)
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
