import { Router } from "express";
import { authenticateJWT } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile } from "../controllers/profileController.js";

const router = Router();

router.get("/", authenticateJWT, getProfile);
router.patch("/", authenticateJWT, updateProfile);

export default router;

