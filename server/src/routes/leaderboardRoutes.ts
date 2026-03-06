import { Router } from "express";
import { getCandidateWorkLeaderboard, getLeaderboard } from "../controllers/leaderboardController.js";

const router = Router();

router.get("/", getLeaderboard);
router.get("/candidate-work", getCandidateWorkLeaderboard);

export default router;

