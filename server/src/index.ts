import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';
import topicRoutes from './routes/topicRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes); // /profile
app.use('/api/roadmaps', roadmapRoutes); // /roadmaps
app.use('/api/topics', topicRoutes);     // /topics

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});