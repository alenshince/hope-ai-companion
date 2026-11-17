import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import notesRoutes from './routes/notes.js';
import remindersRoutes from './routes/reminders.js';
import settingsRoutes from './routes/settings.js';
import profileRoutes from './routes/profile.js';
import wellnessRoutes from './routes/wellness.js';
import voiceRoutes from './routes/voice.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(requireAuth);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/voice', voiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    name: 'Hope AI Companion Backend',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// Serve static client build if present
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Hope AI Companion API Server is running. Launch the Vite client for the UI.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🌿 Hope AI Companion server is running at http://localhost:${PORT}`);
});

