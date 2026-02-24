import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';
import topicRoutes from './routes/topicRoutes.js';
import vacancyRoutes from './routes/vacancyRoutes.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Swagger Configuration (Таза JSON, YAML қатесі мүлдем болмайды)
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

// Swagger UI қосу
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/vacancies', vacancyRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
});