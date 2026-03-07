import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import topicRoutes from "./routes/topicRoutes.js";
import roadmapRoutes from "./routes/roadmapRoutes.js";
import vacancyRoutes from "./routes/vacancyRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

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


  }
};

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes (both /api/... and plain /... for frontend)
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/profile", profileRoutes);
app.use("/profile", profileRoutes);

app.use("/api/users", userRoutes);
app.use("/users", userRoutes);

app.use("/api/topics", topicRoutes);
app.use("/topics", topicRoutes);

app.use("/api/roadmaps", roadmapRoutes);
app.use("/roadmaps", roadmapRoutes);

app.use("/api/leaderboard", leaderboardRoutes);
app.use("/leaderboard", leaderboardRoutes);

// Vacancies + company cabinet are mounted at root and /api
app.use("/api", vacancyRoutes);
app.use("/", vacancyRoutes);


app.use("/api/social", socialRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
});