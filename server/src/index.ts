import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';
import topicRoutes from './routes/topicRoutes.js';
import vacancyRoutes from './routes/vacancyRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import dailyTaskRoutes from './routes/dailyTaskRoutes.js'
import communityRoutes from './routes/communityRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import cron from 'node-cron';
import { fetchAndSaveHHVacancies } from './services/hhService.js';

dotenv.config();
const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Diploma Project API',
    version: '1.0.0',
    description: 'Technical Interview Preparation Platform API',
  },
  servers: [{ url: 'http://localhost:5000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } }
        },
        responses: { 201: { description: 'Created' } }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login user',
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } }
        },
        responses: { 200: { description: 'Success' } }
      }
    },
    '/api/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get user profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/api/roadmaps/tree': {
      get: {
        tags: ['Roadmaps'],
        summary: 'Get roadmap tree structures',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/api/topics/{topicId}/content': {
      get: {
        tags: ['Topics'],
        summary: 'Get topic theory content',
        parameters: [{ name: 'topicId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/api/topics/{topicId}/result': {
      post: {
        tags: ['Topics'],
        summary: 'Submit test result score',
        parameters: [{ name: 'topicId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { score: { type: 'number' } } } } }
        },
        responses: { 200: { description: 'Success' } }
      }
    },
    '/api/vacancies': {
      get: {
        tags: ['Vacancies'],
        summary: 'Get all vacancies',
        responses: { 200: { description: 'Success' } }
      }
    },
    '/api/vacancies/{id}': {
      get: {
        tags: ['Vacancies'],
        summary: 'Get vacancy details (Questions & Tests)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/api/vacancies/{id}/tasks': {
      get: {
        tags: ['Vacancies'],
        summary: 'Get tasks for a vacancy',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Success' } }
      }
    }
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/vacancies', vacancyRoutes);

app.use('/api/leaderboard', leaderboardRoutes);

app.use('/api/friends', friendRoutes);

app.use('/api/daily-tasks', dailyTaskRoutes)

app.use('/api/community', communityRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/company', companyRoutes);

// fetchAndSaveHHVacancies();
cron.schedule('0 2 */4 * *', async () => {
  console.log("Автоматты жаңарту уақыты келді...");
  await fetchAndSaveHHVacancies();
});

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
});