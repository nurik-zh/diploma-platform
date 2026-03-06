import { Router } from "express";
import { authenticateJWT } from "../middleware/authMiddleware.js";
import {
  createCompanyVacancy,
  createCompanyVacancyTask,
  deleteCompanyVacancy,
  deleteCompanyVacancyTask,
  getCandidateWorkLeaderboard,
  getCompanyCandidates,
  getCompanyVacancies,
  getVacancies,
  getVacancyById,
  getVacancyTaskLeaderboard,
  getVacancyTasks,
  sendInterviewInvite,
  submitVacancyTask,
  updateCompanyVacancy,
  updateCompanyVacancyTask,
} from "../controllers/vacancyController.js";

const router = Router();

// Public vacancies
router.get("/vacancies", getVacancies);
router.get("/vacancies/:vacancyId", getVacancyById);
router.get("/vacancies/:vacancyId/tasks", getVacancyTasks);
router.get("/vacancies/tasks/leaderboard", getCandidateWorkLeaderboard);
router.get("/vacancies/:vacancyId/tasks/leaderboard", getVacancyTaskLeaderboard);
router.post("/vacancies/:vacancyId/tasks/:taskId/submission", authenticateJWT, submitVacancyTask);

// Company cabinet
router.get("/company/vacancies", getCompanyVacancies);
router.post("/company/vacancies", authenticateJWT, createCompanyVacancy);
router.put("/company/vacancies/:vacancyId", authenticateJWT, updateCompanyVacancy);
router.delete("/company/vacancies/:vacancyId", authenticateJWT, deleteCompanyVacancy);

router.post("/company/vacancies/:vacancyId/tasks", authenticateJWT, createCompanyVacancyTask);
router.put("/company/vacancies/:vacancyId/tasks/:taskId", authenticateJWT, updateCompanyVacancyTask);
router.delete("/company/vacancies/:vacancyId/tasks/:taskId", authenticateJWT, deleteCompanyVacancyTask);

router.get("/company/candidates", authenticateJWT, getCompanyCandidates);
router.post("/company/candidates/:candidateId/interview-invite", authenticateJWT, sendInterviewInvite);

export default router;

