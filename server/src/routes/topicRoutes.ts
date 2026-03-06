import { Router } from "express";
import { authenticateJWT } from "../middleware/authMiddleware.js";
import {
  getTopicContent,
  getTopicInterviewQuestions,
  getTopics,
  getTopicTest,
  postTopicResult,
} from "../controllers/topicController.js";

const router = Router();

router.get("/", getTopics);
router.get("/:topicId/content", getTopicContent);
router.get("/:topicId/test", getTopicTest);
router.post("/:topicId/result", authenticateJWT, postTopicResult);
router.get("/:topicId/interview-questions", getTopicInterviewQuestions);

export default router;

