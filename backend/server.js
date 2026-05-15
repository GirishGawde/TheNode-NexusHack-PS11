import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import teamRoutes from './routes/teams.js';
import { expireDeadlinedPoolEntries } from './lib/aiMatch.js';
import eventRoutes from './routes/events.js';
import judgingRoutes from './routes/judging.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ 
  origin: process.env.FRONTEND_URL,
  credentials: true 
}));
app.use(express.json());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

app.use('/api/teams', teamRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/judging', judgingRoutes);
app.use('/api/ai', aiRoutes);

app.listen(process.env.PORT || 5000, () => {
  console.log(`NexusHack backend running on port ${process.env.PORT || 5000}`);

  // Cron: expire overdue matchmaking pool entries every 15 minutes (no AI calls)
  setInterval(() => {
    expireDeadlinedPoolEntries().catch(err => console.error('[Cron] Pool expiry error:', err));
  }, 15 * 60 * 1000);

  console.log('AI matchmaking cron started (15min interval).');
});

