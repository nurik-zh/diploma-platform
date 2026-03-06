import { Router } from "express";
import { getRoadmapTree, getRoadmaps } from "../controllers/roadmapController.js";

const router = Router();

router.get("/", getRoadmaps);
router.get("/tree", getRoadmapTree);

export default router;

