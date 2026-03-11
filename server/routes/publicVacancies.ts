import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/public/vacancies — only open vacancies
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, branch, work_type AS "workType",
        required_gender AS "requiredGender",
        required_age_min AS "requiredAgeMin",
        required_age_max AS "requiredAgeMax",
        required_qualification AS "requiredQualification",
        required_experience_years AS "requiredExperienceYears",
        required_skills AS "requiredSkills",
        responsibilities,
        driving_license_required AS "drivingLicenseRequired",
        vacancy_count AS "vacancyCount",
        start_date AS "startDate",
        end_date AS "endDate",
        status
      FROM job_vacancies
      WHERE status = 'Open'
      ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching public vacancies:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
