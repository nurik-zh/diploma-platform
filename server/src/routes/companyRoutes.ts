import express from 'express';
import { 
  getCompanyVacancies, createCompanyVacancy, updateCompanyVacancy, deleteCompanyVacancy,
  createCompanyVacancyTask, updateCompanyVacancyTask, deleteCompanyVacancyTask,
  getCompanyCandidates, sendInterviewInvite
} from '../controllers/companyController.js';

const router = express.Router();

// Осы жерге authMiddleware (мен checkRole('company')) қосу керек
router.get('/vacancies', getCompanyVacancies);
router.post('/vacancies', createCompanyVacancy);
router.put('/vacancies/:id', updateCompanyVacancy);
router.delete('/vacancies/:id', deleteCompanyVacancy);

router.post('/vacancies/:id/tasks', createCompanyVacancyTask);
router.put('/vacancies/:id/tasks/:taskId', updateCompanyVacancyTask);
router.delete('/vacancies/:id/tasks/:taskId', deleteCompanyVacancyTask);

router.get('/candidates', getCompanyCandidates);
router.post('/candidates/:candidateId/invite', sendInterviewInvite);

export default router;